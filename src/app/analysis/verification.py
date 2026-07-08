"""Data-consistency checks.

Ported pattern from ai-berkshire tools/financial_rigor.py (MIT License,
Copyright (c) 2026 xbtlin): computed vs reported cross-checks with explicit
tolerance, instead of trusting a single source.
"""

from __future__ import annotations

MARKET_CAP_TOLERANCE_PCT = 2.0


def verify_market_cap(
    price: float | None,
    shares: float | None,
    reported_cap: float | None,
) -> dict:
    """Compare price*shares against the reported market cap.

    Catches unit errors (원 vs 억원) and stale share counts — the two failure
    modes that silently corrupted the legacy implementation.
    """
    if not price or not shares or not reported_cap or price <= 0 or shares <= 0 or reported_cap <= 0:
        return {"status": "unavailable", "reason": "가격·주식수·보고 시가총액 중 결측값 존재"}

    computed = price * shares
    deviation_pct = abs(computed - reported_cap) / reported_cap * 100

    if deviation_pct <= MARKET_CAP_TOLERANCE_PCT:
        status = "consistent"
    else:
        status = "deviation"
    return {
        "status": status,
        "computed_cap": computed,
        "reported_cap": reported_cap,
        "deviation_pct": round(deviation_pct, 2),
        "tolerance_pct": MARKET_CAP_TOLERANCE_PCT,
    }
