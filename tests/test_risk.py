"""Slice 5: analysis/risk pure functions — boundary values per flag."""

from app.analysis.risk import evaluate_financial_flags


def year(y, **overrides):
    base = {
        "year": y, "revenue": 100, "operating_income": 10, "net_income": 8,
        "liabilities": 100, "equity": 100, "issued_capital": 50,
        "cfo": 12, "capex": 5, "interest_expense": 2,
    }
    return {**base, **overrides}


def flag_by_code(result, code):
    return next(f for f in result["flags"] if f["code"] == code)


class TestDebtRatio:
    def test_triggers_above_200(self):
        result = evaluate_financial_flags([year(2024, liabilities=201, equity=100)])
        flag = flag_by_code(result, "high_debt_ratio")
        assert flag["triggered"] is True
        assert flag["evidence"]["year"] == 2024

    def test_not_triggered_at_exactly_200(self):
        result = evaluate_financial_flags([year(2024, liabilities=200, equity=100)])
        assert flag_by_code(result, "high_debt_ratio")["triggered"] is False


class TestInterestCoverage:
    def test_triggers_below_1(self):
        result = evaluate_financial_flags([year(2024, operating_income=1, interest_expense=2)])
        assert flag_by_code(result, "low_interest_coverage")["triggered"] is True

    def test_unavailable_without_interest_expense(self):
        result = evaluate_financial_flags([year(2024, interest_expense=None)])
        assert "low_interest_coverage" in result["unavailable_checks"]


class TestNegativeCfoStreak:
    def test_two_consecutive_years_trigger(self):
        result = evaluate_financial_flags([year(2023, cfo=-5), year(2024, cfo=-3)])
        assert flag_by_code(result, "negative_cfo_streak")["triggered"] is True

    def test_single_year_does_not_trigger(self):
        result = evaluate_financial_flags([year(2023, cfo=5), year(2024, cfo=-3)])
        assert flag_by_code(result, "negative_cfo_streak")["triggered"] is False


class TestRevenueDecline:
    def test_two_consecutive_declines_trigger(self):
        result = evaluate_financial_flags(
            [year(2022, revenue=100), year(2023, revenue=90), year(2024, revenue=80)]
        )
        assert flag_by_code(result, "revenue_decline_streak")["triggered"] is True


class TestCapitalImpairment:
    def test_partial_impairment_triggers(self):
        result = evaluate_financial_flags([year(2024, equity=40, issued_capital=50)])
        assert flag_by_code(result, "capital_impairment")["triggered"] is True


class TestAccrualQuality:
    def test_cfo_far_below_net_income_triggers(self):
        # profits on paper, no cash: cfo/ni < 0.5 for 2 consecutive years
        result = evaluate_financial_flags(
            [year(2023, net_income=10, cfo=3), year(2024, net_income=10, cfo=4)]
        )
        assert flag_by_code(result, "earnings_cash_divergence")["triggered"] is True


class TestEmptyInput:
    def test_empty_years_returns_all_unavailable(self):
        result = evaluate_financial_flags([])
        assert result["flags"] == []
        assert result["checked_count"] == 0
        assert len(result["unavailable_checks"]) == 6


class TestCleanCompany:
    def test_no_flags_reports_checked_count(self):
        result = evaluate_financial_flags([year(2022), year(2023), year(2024)])
        assert not any(f["triggered"] for f in result["flags"])
        assert result["checked_count"] >= 6
