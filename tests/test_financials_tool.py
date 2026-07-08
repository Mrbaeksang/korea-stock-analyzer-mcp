"""Slice 3: get_financials — MCP boundary tests with fake DART client."""

import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError

from app.server import mcp


async def test_financials_include_source_and_ratios(fake_dart_client, fake_price_client):
    async with Client(mcp) as client:
        result = await client.call_tool("get_financials", {"ticker": "005930"})
        data = result.data
        assert data["statement_basis"] == "CFS"
        years = data["years"]
        assert [y["year"] for y in years] == [2022, 2023, 2024]
        assert years[-1]["ratios"]["operating_margin_pct"] is not None
        # growth uses actual 2-year span: 100→121 = 10%/yr
        assert abs(data["growth"]["revenue_cagr_pct"] - 10.0) < 0.01
        assert data["growth"]["span_years"] == 2
        assert data["data_source"].startswith("DART")


async def test_financials_fcf_labeled_as_approximation(fake_dart_client, fake_price_client):
    async with Client(mcp) as client:
        result = await client.call_tool("get_financials", {"ticker": "005930"})
        last = result.data["years"][-1]
        assert last["fcf"] == 10  # cfo 15 - capex 5
        assert "근사" in result.data["fcf_note"] or "approx" in result.data["fcf_note"].lower()


async def test_financials_unknown_ticker(fake_dart_client, fake_price_client):
    async with Client(mcp) as client:
        with pytest.raises(ToolError, match="DART"):
            await client.call_tool("get_financials", {"ticker": "123456"})
