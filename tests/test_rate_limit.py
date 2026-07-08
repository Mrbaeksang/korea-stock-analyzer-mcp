"""Baseline hardening: global rate limiting on the MCP layer."""

import pytest
from fastmcp import Client, FastMCP

from app.middleware import build_rate_limiter
from app.server import mcp


async def test_server_has_rate_limiter_registered():
    assert any(type(m).__name__ == "RateLimitingMiddleware" for m in mcp.middleware)


async def test_burst_beyond_capacity_is_rejected(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_RPS", "1")
    monkeypatch.setenv("RATE_LIMIT_BURST", "3")

    toy = FastMCP("toy")
    toy.add_middleware(build_rate_limiter())

    @toy.tool
    def noop() -> str:
        return "ok"

    async with Client(toy) as client:
        with pytest.raises(Exception, match="[Rr]ate limit"):
            for _ in range(10):
                await client.call_tool("noop", {})
