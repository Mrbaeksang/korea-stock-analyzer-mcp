"""Slice 5: get_risk_flags — MCP boundary tests."""

from fastmcp import Client

from app.server import mcp


async def test_risk_flags_structure(fake_price_client, fake_dart_client):
    async with Client(mcp) as client:
        result = await client.call_tool("get_risk_flags", {"ticker": "005930"})
        data = result.data
        assert "flags" in data and "disclosures" in data
        for flag in data["flags"]:
            assert {"code", "triggered", "description"} <= flag.keys()
        assert data["summary"]  # clean company must say so explicitly


async def test_clean_company_summary_is_explicit(fake_price_client, fake_dart_client):
    async with Client(mcp) as client:
        result = await client.call_tool("get_risk_flags", {"ticker": "005930"})
        data = result.data
        assert "적신호 없음" in data["summary"]
        assert str(data["checked_count"]) in data["summary"]


async def test_disclosure_keywords_highlighted(fake_price_client, fake_dart_client):
    fake_dart_client.disclosures.append(
        {"report_nm": "주요사항보고서(유상증자결정)", "rcept_dt": "20260601",
         "flr_nm": "삼성전자", "rcept_no": "20260601000001"}
    )
    async with Client(mcp) as client:
        result = await client.call_tool("get_risk_flags", {"ticker": "005930"})
        disclosures = result.data["disclosures"]
        flagged = [d for d in disclosures if d.get("risk_keyword")]
        assert any(d["risk_keyword"] == "유상증자" for d in flagged)
        assert all("dart.fss.or.kr" in d["url"] for d in disclosures)
