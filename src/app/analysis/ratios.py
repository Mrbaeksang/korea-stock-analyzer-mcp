"""Financial ratio computations. Pure functions, null-safe.

Policy: a missing input yields None, never a default. The legacy server
fabricated values (ROE=10, debt ratio from PBR) — that class of bug is
what these functions and their tests exist to prevent.
"""

from __future__ import annotations


def _pct(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or not denominator:
        return None
    return round(numerator / denominator * 100, 2)


def cagr(first: float | None, last: float | None, span_years: int | None) -> float | None:
    """Compound annual growth rate over an ACTUAL year span, in percent.

    None when undefined: missing inputs, non-positive base, negative or zero
    endpoint (sign change makes the root meaningless), or zero span.
    """
    if first is None or last is None or not span_years or span_years <= 0:
        return None
    if first <= 0 or last <= 0:
        return None
    return round(((last / first) ** (1 / span_years) - 1) * 100, 2)


def compute_ratios(
    *,
    revenue: float | None,
    operating_income: float | None,
    net_income: float | None,
    liabilities: float | None,
    equity: float | None,
    issued_capital: float | None,
    cfo: float | None,
) -> dict:
    if equity is None:
        capital_impairment = None
    else:
        capital_impairment = equity <= 0 or (
            issued_capital is not None and equity < issued_capital
        )

    solvency_denominator = equity if equity is not None and equity > 0 else None

    return {
        "operating_margin_pct": _pct(operating_income, revenue),
        "net_margin_pct": _pct(net_income, revenue),
        "roe_pct": _pct(net_income, solvency_denominator),
        "debt_ratio_pct": _pct(liabilities, solvency_denominator),
        "cfo_to_net_income": (
            round(cfo / net_income, 2)
            if cfo is not None and net_income is not None and net_income > 0
            else None
        ),
        "capital_impairment": capital_impairment,
    }
