from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from app.core.config import Settings
from app.core.errors import AppError


T = TypeVar("T")


@dataclass
class _CacheEntry(Generic[T]):
    expires_at: float
    value: T


class AiRequestGuard:
    """In-process protection for expensive, authenticated AI requests.

    The guard deliberately rejects excess work instead of queueing an unbounded
    number of image/audio payloads in memory. A shared gateway/Redis limiter is
    still recommended when the API is deployed with multiple processes.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = asyncio.Lock()
        self._minute_attempts: dict[str, deque[float]] = defaultdict(deque)
        self._hour_attempts: dict[str, deque[float]] = defaultdict(deque)
        self._account_active: dict[str, int] = defaultdict(int)
        self._global_active = 0
        self._active_fingerprints: set[str] = set()
        self._cache: dict[str, _CacheEntry[object]] = {}
        self._provider_failures: dict[str, int] = defaultdict(int)
        self._circuit_open_until: dict[str, float] = defaultdict(float)

    @staticmethod
    def _prune(events: deque[float], threshold: float) -> None:
        while events and events[0] <= threshold:
            events.popleft()

    def _prune_cache(self, now: float) -> None:
        expired = [key for key, entry in self._cache.items() if entry.expires_at <= now]
        for key in expired:
            self._cache.pop(key, None)
        while len(self._cache) > self.settings.ai_cache_max_entries:
            self._cache.pop(next(iter(self._cache)))

    async def execute(
        self,
        *,
        account_id: str,
        provider: str,
        fingerprint: str,
        operation: Callable[[], Awaitable[T]],
    ) -> T:
        now = time.monotonic()
        async with self._lock:
            self._prune_cache(now)
            minute_events = self._minute_attempts[account_id]
            hour_events = self._hour_attempts[account_id]
            self._prune(minute_events, now - 60)
            self._prune(hour_events, now - 3600)

            if len(minute_events) >= self.settings.ai_requests_per_minute:
                retry_after = max(1, int(60 - (now - minute_events[0])))
                raise AppError("AI_RATE_LIMITED", "Too many AI requests. Please wait before trying again.", 429, True, retry_after)
            if len(hour_events) >= self.settings.ai_requests_per_hour:
                retry_after = max(1, int(3600 - (now - hour_events[0])))
                raise AppError("AI_HOURLY_LIMIT_REACHED", "The hourly AI request limit has been reached.", 429, True, retry_after)

            minute_events.append(now)
            hour_events.append(now)

            cached = self._cache.get(fingerprint)
            if cached and cached.expires_at > now:
                return cached.value  # type: ignore[return-value]
            if fingerprint in self._active_fingerprints:
                raise AppError("DUPLICATE_AI_REQUEST", "This same listing is already being generated.", 409, True, 3)
            if self._account_active[account_id] >= self.settings.ai_max_account_concurrency:
                raise AppError("AI_REQUEST_IN_PROGRESS", "Finish the current AI request before starting another.", 429, True, 5)
            if self._global_active >= self.settings.ai_max_global_concurrency:
                raise AppError("AI_SERVICE_BUSY", "AI generation is busy. Please try again shortly.", 503, True, 5)
            if self._circuit_open_until[provider] > now:
                retry_after = max(1, int(self._circuit_open_until[provider] - now))
                raise AppError("AI_PROVIDER_TEMPORARILY_DISABLED", "The selected AI provider is recovering. Try again shortly.", 503, True, retry_after)

            self._account_active[account_id] += 1
            self._global_active += 1
            self._active_fingerprints.add(fingerprint)

        try:
            result = await asyncio.wait_for(operation(), timeout=self.settings.ai_request_deadline_seconds)
        except TimeoutError as exc:
            await self._record_failure(provider)
            raise AppError("AI_REQUEST_TIMEOUT", "AI generation took too long and was stopped safely.", 504, True, 10) from exc
        except AppError as exc:
            if exc.retryable and exc.status_code >= 500:
                await self._record_failure(provider)
            raise
        except Exception as exc:
            await self._record_failure(provider)
            raise AppError("AI_REQUEST_FAILED", "AI generation failed safely. Please try again.", 502, True, 10) from exc
        else:
            async with self._lock:
                self._provider_failures[provider] = 0
                self._circuit_open_until[provider] = 0
                self._cache[fingerprint] = _CacheEntry(
                    expires_at=time.monotonic() + self.settings.ai_cache_ttl_seconds,
                    value=result,
                )
            return result
        finally:
            async with self._lock:
                self._account_active[account_id] = max(0, self._account_active[account_id] - 1)
                self._global_active = max(0, self._global_active - 1)
                self._active_fingerprints.discard(fingerprint)

    async def _record_failure(self, provider: str) -> None:
        async with self._lock:
            failures = self._provider_failures[provider] + 1
            self._provider_failures[provider] = failures
            if failures >= self.settings.ai_circuit_failure_threshold:
                self._circuit_open_until[provider] = time.monotonic() + self.settings.ai_circuit_cooldown_seconds
