"""Live DART tests. Require DART_API_KEY. Run: pytest -m live"""

import os

import pytest
from fastmcp import Client

from app.server import mcp

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(not os.environ.get("DART_API_KEY"), reason="DART_API_KEY not set"),
]


async def test_samsung_financials_live():
    async with Client(mcp) as client:
        result = await client.call_tool("get_financials", {"ticker": "005930", "years": 3})
        data = result.data
        assert data["statement_basis"] == "CFS"
        assert len(data["years"]) >= 2
        latest = data["years"][-1]
        # Samsung revenue is in the hundreds of trillions KRW — unit sanity
        assert latest["revenue"] > 1e14
        assert latest["ratios"]["debt_ratio_pct"] is not None


async def test_kosdaq_financials_live():
    async with Client(mcp) as client:
        result = await client.call_tool("get_financials", {"ticker": "247540", "years": 3})
        assert len(result.data["years"]) >= 1
