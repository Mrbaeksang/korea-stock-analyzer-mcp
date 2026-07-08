"""Slice 3: get_financials — MCP boundary tests with fake DART client."""

import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError

from app import deps
from app.server import mcp


class FakeDartClient:
    def __init__(self):
        self.years = {
            2022: {"revenue": 100, "operating_income": 10, "net_income": 8, "assets": 500,
                   "liabilities": 200, "equity": 300, "issued_capital": 50,
                   "cfo": 12, "cfi": -5, "capex": 4},
            2023: {"revenue": 110, "operating_income": 12, "net_income": 9, "assets": 520,
                   "liabilities": 210, "equity": 310, "issued_capital": 50,
                   "cfo": 13, "cfi": -6, "capex": 5},
            2024: {"revenue": 121, "operating_income": 14, "net_income": 11, "assets": 540,
                   "liabilities": 215, "equity": 325, "issued_capital": 50,
                   "cfo": 15, "cfi": -7, "capex": 5},
        }

    async def corp_code_for(self, ticker: str) -> str | None:
        return "00126380" if ticker == "005930" else None

    async def annual_financials(self, corp_code: str, years: int) -> list[dict]:
        out = []
        for year in sorted(self.years)[-years:]:
            out.append({
                "year": year,
                "fs_div": "CFS",
                "report": "사업보고서",
                **self.years[year],
            })
        return out


@pytest.fixture
def fake_dart_client():
    client = FakeDartClient()
    deps.set_dart_client(client)
    yield client
    deps.set_dart_client(None)


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
