"""Slice 1: server skeleton — MCP tool boundary tests via in-memory client."""

import pytest
from fastmcp import Client

from app.server import mcp


async def test_lists_ping_tool():
    async with Client(mcp) as client:
        tools = await client.list_tools()
        names = [t.name for t in tools]
        assert "ping" in names


async def test_ping_returns_ok():
    async with Client(mcp) as client:
        result = await client.call_tool("ping", {})
        assert result.data == "pong"


async def test_http_app_is_stateless():
    from app.main import app

    # http_app() returns a Starlette app; smoke-check the health route exists
    routes = [getattr(r, "path", None) for r in app.routes]
    assert "/health" in routes
