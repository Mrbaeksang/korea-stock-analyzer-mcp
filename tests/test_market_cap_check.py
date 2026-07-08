"""Slice 2: market-cap consistency verification (ai-berkshire financial_rigor pattern)."""

from app.analysis.verification import verify_market_cap


def test_consistent_when_within_tolerance():
    result = verify_market_cap(price=80000, shares=5_969_782_550, reported_cap=477_582_604_000_000)
    assert result["status"] == "consistent"


def test_deviation_flagged_beyond_tolerance():
    # reported cap 10x off (unit error pattern: 억원 vs 원)
    result = verify_market_cap(price=80000, shares=5_969_782_550, reported_cap=4_775_826_040_000_000)
    assert result["status"] == "deviation"
    assert result["deviation_pct"] > 2.0


def test_unavailable_when_inputs_missing():
    assert verify_market_cap(price=80000, shares=None, reported_cap=1)["status"] == "unavailable"
    assert verify_market_cap(price=0, shares=100, reported_cap=1)["status"] == "unavailable"
