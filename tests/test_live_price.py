"""Live tests against real KRX data via FinanceDataReader. Run: pytest -m live"""

import pytest
from fastmcp import Client

from app.server import mcp

pytestmark = pytest.mark.live


async def test_search_samsung_live():
    async with Client(mcp) as client:
        result = await client.call_tool("search_company", {"query": "삼성"})
        assert any(m["ticker"] == "005930" for m in result.data["matches"])


async def test_quote_kospi_and_kosdaq_live():
    async with Client(mcp) as client:
        for ticker in ("005930", "247540"):  # 삼성전자(KOSPI), 에코프로비엠(KOSDAQ)
            result = await client.call_tool("get_quote", {"ticker": ticker})
            data = result.data
            assert data["price"] and data["price"] > 0
            assert data["as_of"]
            assert data["market_cap_check"]["status"] in ("consistent", "deviation")
