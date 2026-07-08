"""Read-only filesystem and malformed-response resilience for DartClient."""

import io
import zipfile

import pytest

from app.services.dart_client import DartError, _unzip_corpcode, _write_cache


def test_write_cache_failure_is_non_fatal(tmp_path, monkeypatch):
    # read-only mount: mkdir/write raise OSError — must not propagate
    target = tmp_path / "ro" / "CORPCODE.xml"

    def deny(*args, **kwargs):
        raise OSError(30, "Read-only file system")

    monkeypatch.setattr("pathlib.Path.mkdir", deny)
    _write_cache(target, b"data")  # must not raise


def test_unzip_valid_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("CORPCODE.xml", "<xml/>")
    assert _unzip_corpcode(buf.getvalue()) == b"<xml/>"


def test_unzip_dart_error_body_surfaces_message():
    # DART returns a JSON/XML error body instead of a zip when the key is bad
    body = b'{"status":"011","message":"\xec\x9d\xb8\xec\xa6\x9d\xed\x82\xa4"}'
    with pytest.raises(DartError, match="011"):
        _unzip_corpcode(body)


def test_unzip_garbage_raises_dart_error_not_badzipfile():
    with pytest.raises(DartError):
        _unzip_corpcode(b"<html>gateway error</html>")
