"""Test-only environment defaults loaded before application modules."""

import os


# CI correctly does not contain backend/.env. Session-token tests still need a
# signing key, so provide a deterministic value only inside the test process.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault(
    "APP_SESSION_SECRET",
    "test-only-session-signing-secret-never-use-in-production",
)
