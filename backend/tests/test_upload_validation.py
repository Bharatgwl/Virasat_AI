from app.api.uploads import _has_valid_signature


def test_image_signatures_are_verified() -> None:
    assert _has_valid_signature(b"\xff\xd8\xffimage", "image/jpeg")
    assert _has_valid_signature(b"\x89PNG\r\n\x1a\nimage", "image/png")
    assert _has_valid_signature(b"RIFF\x00\x00\x00\x00WEBPimage", "image/webp")
    assert not _has_valid_signature(b"<script>alert(1)</script>", "image/jpeg")


def test_audio_signatures_are_verified() -> None:
    assert _has_valid_signature(b"OggSaudio", "audio/ogg")
    assert _has_valid_signature(b"RIFF\x00\x00\x00\x00WAVEaudio", "audio/wav")
    assert _has_valid_signature(b"ID3audio", "audio/mpeg")
    assert _has_valid_signature(b"\x00\x00\x00\x18ftypM4A audio", "audio/mp4")
    assert _has_valid_signature(b"\xff\xf1audio", "audio/aac")
    assert not _has_valid_signature(b"not audio", "audio/webm")
