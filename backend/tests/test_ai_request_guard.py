import asyncio

import pytest

from app.core.config import Settings
from app.core.errors import AppError
from app.services.ai_request_guard import AiRequestGuard


def settings_with(**changes: object) -> Settings:
    return Settings(_env_file=None).model_copy(update=changes)


def test_exact_duplicate_uses_short_lived_cache() -> None:
    guard = AiRequestGuard(settings_with(ai_cache_ttl_seconds=60))
    calls = 0

    async def scenario() -> tuple[str, str]:
        nonlocal calls

        async def operation() -> str:
            nonlocal calls
            calls += 1
            return "listing"

        first = await guard.execute(account_id="seller-1", provider="ollama", fingerprint="same", operation=operation)
        second = await guard.execute(account_id="seller-1", provider="ollama", fingerprint="same", operation=operation)
        return first, second

    assert asyncio.run(scenario()) == ("listing", "listing")
    assert calls == 1


def test_per_account_rate_limit_rejects_spam() -> None:
    guard = AiRequestGuard(settings_with(ai_requests_per_minute=1, ai_requests_per_hour=10))

    async def scenario() -> None:
        async def operation() -> str:
            return "ok"

        await guard.execute(account_id="seller-1", provider="ollama", fingerprint="one", operation=operation)
        with pytest.raises(AppError) as error:
            await guard.execute(account_id="seller-1", provider="ollama", fingerprint="two", operation=operation)
        assert error.value.code == "AI_RATE_LIMITED"
        assert error.value.status_code == 429
        assert error.value.retry_after_seconds is not None

    asyncio.run(scenario())


def test_stalled_request_is_cancelled_at_deadline() -> None:
    guard = AiRequestGuard(settings_with(ai_request_deadline_seconds=0.01))

    async def scenario() -> None:
        async def operation() -> str:
            await asyncio.sleep(1)
            return "late"

        with pytest.raises(AppError) as error:
            await guard.execute(account_id="seller-1", provider="ollama", fingerprint="slow", operation=operation)
        assert error.value.code == "AI_REQUEST_TIMEOUT"
        assert error.value.status_code == 504

    asyncio.run(scenario())


def test_circuit_breaker_stops_repeated_provider_failures() -> None:
    guard = AiRequestGuard(
        settings_with(
            ai_circuit_failure_threshold=1,
            ai_circuit_cooldown_seconds=60,
            ai_requests_per_minute=10,
        )
    )

    async def scenario() -> None:
        async def failing_operation() -> str:
            raise AppError("AI_PROVIDER_FAILED", "Provider failed.", 502, True)

        with pytest.raises(AppError):
            await guard.execute(account_id="seller-1", provider="ollama", fingerprint="failure", operation=failing_operation)
        with pytest.raises(AppError) as error:
            await guard.execute(account_id="seller-1", provider="ollama", fingerprint="next", operation=failing_operation)
        assert error.value.code == "AI_PROVIDER_TEMPORARILY_DISABLED"
        assert error.value.status_code == 503

    asyncio.run(scenario())
