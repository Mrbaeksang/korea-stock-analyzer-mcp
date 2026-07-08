"""Slice 2: search_company / get_quote — MCP tool boundary tests with fake client."""

import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError

from app.server import mcp


async def test_search_company_by_name(fake_price_client):
    async with Client(mcp) as client:
        result = await client.call_tool("search_company", {"query": "삼성"})
        matches = result.data["matches"]
        assert any(m["ticker"] == "005930" for m in matches)
        assert all({"ticker", "name", "market"} <= m.keys() for m in matches)


async def test_search_company_no_match_is_explicit(fake_price_client):
    async with Client(mcp) as client:
        result = await client.call_tool("search_company", {"query": "존재하지않는회사명"})
        assert result.data["matches"] == []
        assert result.data["count"] == 0


async def test_get_quote_returns_sourced_data(fake_price_client):
    async with Client(mcp) as client:
        result = await client.call_tool("get_quote", {"ticker": "005930"})
        data = result.data
        assert data["price"] == 80000
        assert data["as_of"] == "2026-07-07"
        assert data["data_source"]
        # market-cap consistency check must be present and consistent
        assert data["market_cap_check"]["status"] in ("consistent", "deviation", "unavailable")


async def test_get_quote_rejects_malformed_ticker(fake_price_client):
    async with Client(mcp) as client:
        with pytest.raises(ToolError, match="6자리"):
            await client.call_tool("get_quote", {"ticker": "SAMSUNG; import os"})


async def test_get_quote_unknown_ticker_is_structured_error(fake_price_client):
    async with Client(mcp) as client:
        with pytest.raises(ToolError, match="찾을 수 없"):
            await client.call_tool("get_quote", {"ticker": "999999"})
