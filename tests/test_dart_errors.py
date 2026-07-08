"""Baseline hardening: DART status codes map to actionable Korean messages."""

import pytest

from app.services.dart_client import DartError, raise_for_dart_status


def test_quota_exceeded_message():
    with pytest.raises(DartError, match="한도"):
        raise_for_dart_status({"status": "020", "message": "요청 제한을 초과하였습니다"})


def test_invalid_key_message():
    with pytest.raises(DartError, match="인증키"):
        raise_for_dart_status({"status": "011", "message": ""})


def test_maintenance_message():
    with pytest.raises(DartError, match="점검"):
        raise_for_dart_status({"status": "800", "message": ""})


def test_no_data_is_not_an_error():
    raise_for_dart_status({"status": "013", "message": "조회된 데이타가 없습니다"})
    raise_for_dart_status({"status": "000", "message": "정상"})


def test_dart_error_is_tool_error():
    """DartError must surface its message to MCP clients (ToolError passthrough)."""
    from fastmcp.exceptions import ToolError

    assert issubclass(DartError, ToolError)
