"""Slice 3: analysis/ratios pure functions — the layer where the legacy code lied."""

from app.analysis.ratios import cagr, compute_ratios


class TestCagr:
    def test_uses_actual_year_span(self):
        # 100 → 121 over exactly 2 years = 10%/yr. Legacy bug: divided a 2-year
        # span by 3 and understated growth.
        assert abs(cagr(first=100, last=121, span_years=2) - 10.0) < 0.01

    def test_none_when_first_is_zero_or_negative(self):
        assert cagr(first=0, last=100, span_years=3) is None
        assert cagr(first=-50, last=100, span_years=3) is None

    def test_none_when_last_is_negative(self):
        assert cagr(first=100, last=-10, span_years=3) is None

    def test_none_on_missing_inputs(self):
        assert cagr(first=None, last=100, span_years=3) is None
        assert cagr(first=100, last=None, span_years=3) is None
        assert cagr(first=100, last=120, span_years=0) is None


class TestComputeRatios:
    def test_normal_company(self):
        r = compute_ratios(
            revenue=1000, operating_income=100, net_income=80,
            liabilities=500, equity=1000, issued_capital=100, cfo=90,
        )
        assert abs(r["operating_margin_pct"] - 10.0) < 0.01
        assert abs(r["net_margin_pct"] - 8.0) < 0.01
        assert abs(r["debt_ratio_pct"] - 50.0) < 0.01
        assert abs(r["roe_pct"] - 8.0) < 0.01
        assert r["capital_impairment"] is False

    def test_capital_impairment_no_fabricated_ratio(self):
        r = compute_ratios(
            revenue=1000, operating_income=-200, net_income=-300,
            liabilities=1500, equity=-100, issued_capital=100, cfo=-50,
        )
        assert r["debt_ratio_pct"] is None
        assert r["roe_pct"] is None
        assert r["capital_impairment"] is True

    def test_missing_data_stays_none(self):
        r = compute_ratios(
            revenue=None, operating_income=None, net_income=80,
            liabilities=500, equity=1000, issued_capital=None, cfo=None,
        )
        assert r["operating_margin_pct"] is None
        assert r["net_margin_pct"] is None
        assert r["capital_impairment"] is False

    def test_zero_revenue_no_division(self):
        r = compute_ratios(
            revenue=0, operating_income=10, net_income=10,
            liabilities=0, equity=100, issued_capital=50, cfo=10,
        )
        assert r["operating_margin_pct"] is None
