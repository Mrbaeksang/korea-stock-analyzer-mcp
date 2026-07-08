"""Slice 4: get_valuation — MCP boundary tests."""

import pytest
from fastmcp import Client

from app.server import mcp

FORBIDDEN_PHRASES = ("매수", "매도", "비중", "적극", "강력")


@pytest.fixture
def fake_clients(fake_price_client, fake_dart_client):
    return fake_price_client, fake_dart_client


async def test_valuation_carries_assumptions_and_range(fake_clients):
    async with Client(mcp) as client:
        result = await client.call_tool("get_valuation", {"ticker": "005930"})
        data = result.data
        assert data["multiples"]["per"] is not None
        scenarios = data["scenario_valuation"]["scenarios"]
        assert len(scenarios) == 3
        values = [s["value_per_share"] for s in scenarios]
        assert values[0] <= values[1] <= values[2]
        assert data["disclaimer"]


async def test_valuation_never_recommends_position(fake_clients):
    import json

    async with Client(mcp) as client:
        result = await client.call_tool("get_valuation", {"ticker": "005930"})
        body = json.dumps(result.data, ensure_ascii=False)
        for phrase in FORBIDDEN_PHRASES:
            assert phrase not in body, f"금지 문구 발견: {phrase}"
