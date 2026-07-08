"""Financial red-flag detection. Pure functions over filed annual data.

Each check either runs with real data or is reported as unavailable —
"couldn't check" is never silently folded into "no problem".
"""

from __future__ import annotations

DEBT_RATIO_LIMIT_PCT = 200.0
INTEREST_COVERAGE_FLOOR = 1.0
CFO_NI_DIVERGENCE_FLOOR = 0.5
STREAK_YEARS = 2


def _flag(code: str, description: str, triggered: bool, evidence: dict | None = None) -> dict:
    return {"code": code, "description": description, "triggered": triggered, "evidence": evidence}


ALL_CHECKS = (
    "high_debt_ratio", "low_interest_coverage", "negative_cfo_streak",
    "revenue_decline_streak", "capital_impairment", "earnings_cash_divergence",
)


def evaluate_financial_flags(years: list[dict]) -> dict:
    """years: filed annual financials, oldest first (dart_client shape)."""
    if not years:
        return {"flags": [], "unavailable_checks": list(ALL_CHECKS), "checked_count": 0}

    flags: list[dict] = []
    unavailable: list[str] = []
    latest = years[-1]

    # 1. debt ratio > 200%
    if latest["liabilities"] is not None and latest["equity"] is not None and latest["equity"] > 0:
        ratio = latest["liabilities"] / latest["equity"] * 100
        flags.append(
            _flag(
                "high_debt_ratio",
                f"부채비율 {DEBT_RATIO_LIMIT_PCT:.0f}% 초과",
                ratio > DEBT_RATIO_LIMIT_PCT,
                {"year": latest["year"], "debt_ratio_pct": round(ratio, 1)},
            )
        )
    else:
        unavailable.append("high_debt_ratio")

    # 2. interest coverage < 1
    if latest["operating_income"] is not None and latest.get("interest_expense"):
        coverage = latest["operating_income"] / latest["interest_expense"]
        flags.append(
            _flag(
                "low_interest_coverage",
                "이자보상배율 1 미만 (영업이익으로 이자 못 갚음)",
                coverage < INTEREST_COVERAGE_FLOOR,
                {"year": latest["year"], "interest_coverage": round(coverage, 2)},
            )
        )
    else:
        unavailable.append("low_interest_coverage")

    # 3. negative CFO streak
    cfo_series = [(y["year"], y["cfo"]) for y in years if y["cfo"] is not None]
    if len(cfo_series) >= STREAK_YEARS:
        recent = cfo_series[-STREAK_YEARS:]
        flags.append(
            _flag(
                "negative_cfo_streak",
                f"영업활동현금흐름 {STREAK_YEARS}년 연속 음수",
                all(v < 0 for _, v in recent),
                {"years": [y for y, _ in recent], "cfo": [v for _, v in recent]},
            )
        )
    else:
        unavailable.append("negative_cfo_streak")

    # 4. revenue decline streak
    rev_series = [(y["year"], y["revenue"]) for y in years if y["revenue"] is not None]
    if len(rev_series) >= STREAK_YEARS + 1:
        declines = [
            rev_series[i][1] < rev_series[i - 1][1]
            for i in range(len(rev_series) - STREAK_YEARS, len(rev_series))
        ]
        flags.append(
            _flag(
                "revenue_decline_streak",
                f"매출 {STREAK_YEARS}년 연속 감소",
                all(declines),
                {"years": [y for y, _ in rev_series[-(STREAK_YEARS + 1):]],
                 "revenue": [v for _, v in rev_series[-(STREAK_YEARS + 1):]]},
            )
        )
    else:
        unavailable.append("revenue_decline_streak")

    # 5. capital impairment (full or partial)
    if latest["equity"] is not None:
        impaired = latest["equity"] <= 0 or (
            latest["issued_capital"] is not None and latest["equity"] < latest["issued_capital"]
        )
        flags.append(
            _flag(
                "capital_impairment",
                "자본잠식 (자본총계 ≤ 0 또는 자본금 미달)",
                impaired,
                {"year": latest["year"], "equity": latest["equity"],
                 "issued_capital": latest["issued_capital"]},
            )
        )
    else:
        unavailable.append("capital_impairment")

    # 6. earnings-cash divergence: profitable on paper, cash-poor
    pairs = [
        (y["year"], y["cfo"] / y["net_income"])
        for y in years
        if y["cfo"] is not None and y["net_income"] is not None and y["net_income"] > 0
    ]
    if len(pairs) >= STREAK_YEARS:
        recent = pairs[-STREAK_YEARS:]
        flags.append(
            _flag(
                "earnings_cash_divergence",
                f"순이익 대비 영업현금흐름 {CFO_NI_DIVERGENCE_FLOOR}배 미만 {STREAK_YEARS}년 연속 (이익의 질 의심)",
                all(r < CFO_NI_DIVERGENCE_FLOOR for _, r in recent),
                {"years": [y for y, _ in recent], "cfo_to_net_income": [round(r, 2) for _, r in recent]},
            )
        )
    else:
        unavailable.append("earnings_cash_divergence")

    return {
        "flags": flags,
        "unavailable_checks": unavailable,
        "checked_count": len(flags),
    }
