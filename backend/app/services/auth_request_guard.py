import time
from collections import defaultdict, deque
from threading import Lock

from app.core.config import get_settings
from app.core.errors import AppError


class AuthRequestGuard:
    """Small in-process guard; use Vercel Firewall for distributed enforcement."""

    def __init__(self) -> None:
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, client_key: str) -> None:
        now = time.monotonic()
        limit = get_settings().auth_requests_per_minute
        with self._lock:
            attempts = self._attempts[client_key]
            while attempts and attempts[0] <= now - 60:
                attempts.popleft()
            if len(attempts) >= limit:
                retry_after = max(1, int(60 - (now - attempts[0])))
                raise AppError(
                    "AUTH_RATE_LIMITED",
                    "Too many authentication attempts. Please wait and try again.",
                    429,
                    True,
                    retry_after,
                )
            attempts.append(now)


auth_request_guard = AuthRequestGuard()
