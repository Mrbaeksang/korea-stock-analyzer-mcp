"""Conservative valuation: multiples + three-scenario range.

Every number carries its assumption source; there is no single
"fair price" — only a range.
"""

from __future__ import annotations

HORIZON_YEARS = 3
GROWTH_CAP_PCT = 20.0
# Conservative fixed multiple band. A deliberate, disclosed assumption —
# not derived from data, and labeled as such in every response.
TARGET_MULTIPLES = {"pessimistic": 8.0, "neutral": 10.0, "optimistic": 12.0}
GROWTH_HAIRCUTS = {"pessimistic": 0.0, "neutral": 0.5, "optimistic": 1.0}


def compute_multiples(
    price: float | None, eps: float | None, bps: float | None
) -> dict:
    result: dict = {"per": None, "per_note": None, "pbr": None, "pbr_note": None}

    if price is None or price <= 0:
        result["per_note"] = result["pbr_note"] = "현재가 없음"
        return result

    if eps is None:
        result["per_note"] = "EPS 데이터 없음"
    elif eps <= 0:
        result["per_note"] = "적자 기업 — PER 정의 불가"
    else:
        result["per"] = round(price / eps, 2)

    if bps is None:
        result["pbr_note"] = "BPS 데이터 없음"
    elif bps <= 0:
        result["pbr_note"] = "자본잠식 — PBR 정의 불가"
    else:
        result["pbr"] = round(price / bps, 2)

    return result


def three_scenario_valuation(
    eps: float | None,
    historical_cagr_pct: float | None,
    cagr_span_years: int | None,
) -> dict:
    """3-scenario per-share value range: EPS × (1+g)^3 × target multiple.

    Growth anchors on HISTORICAL earnings CAGR with haircuts (0x/0.5x/1x),
    capped at +20%/yr. No history → 0% growth base (never fabricated upward).
    """
    if eps is None:
        return {"scenarios": None, "reason": "EPS 데이터 없음 — 이익 기반 밸류에이션 불가"}
    if eps <= 0:
        return {
            "scenarios": None,
            "reason": "적자 기업 — 이익 기반 밸류에이션 불가. PBR·청산가치 등 자산 기반 지표만 참고 가능.",
        }

    if historical_cagr_pct is None:
        base_growth = 0.0
        growth_source = "이익 성장 이력 없음 — 성장률 0% 보수 가정"
    else:
        base_growth = min(historical_cagr_pct, GROWTH_CAP_PCT)
        capped = " (연 20% 상한 적용)" if historical_cagr_pct > GROWTH_CAP_PCT else ""
        growth_source = f"과거 {cagr_span_years}년 순이익 CAGR {historical_cagr_pct}%{capped}"

    scenarios = []
    for name in ("pessimistic", "neutral", "optimistic"):
        haircut = GROWTH_HAIRCUTS[name]
        if base_growth < 0:
            # Declining earnings: pessimistic must carry the FULL decline and
            # optimistic the mildest — the haircut ladder inverts.
            haircut = GROWTH_HAIRCUTS["optimistic"] - haircut
        growth_pct = round(min(base_growth * haircut, GROWTH_CAP_PCT), 2)
        multiple = TARGET_MULTIPLES[name]
        projected_eps = eps * (1 + growth_pct / 100) ** HORIZON_YEARS
        scenarios.append(
            {
                "name": name,
                "growth_pct": growth_pct,
                "target_multiple": multiple,
                "value_per_share": round(projected_eps * multiple),
                "assumption_source": (
                    f"성장률: {growth_source} × 헤어컷 {GROWTH_HAIRCUTS[name]}배. "
                    f"목표 멀티플 {multiple}배는 보수적 고정 밴드(데이터 아닌 가정)."
                ),
            }
        )

    return {
        "scenarios": scenarios,
        "horizon_years": HORIZON_YEARS,
        "method": f"{HORIZON_YEARS}년 후 예상 EPS × 목표 멀티플",
    }
