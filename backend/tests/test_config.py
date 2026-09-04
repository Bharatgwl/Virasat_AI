from app.core.config import Settings


def test_frontend_origins_are_trimmed_and_empty_values_removed() -> None:
    settings = Settings(
        _env_file=None,
        frontend_origins="http://localhost:3000, https://viraasat.example.com, ",
    )

    assert settings.allowed_origins == [
        "http://localhost:3000",
        "https://viraasat.example.com",
    ]


def test_default_ai_request_limit_fits_vercel_function_payload_limit() -> None:
    settings = Settings(_env_file=None)

    assert settings.ai_max_request_bytes <= 4_450_000
    assert settings.ai_max_image_bytes + settings.ai_max_audio_bytes < settings.ai_max_request_bytes
