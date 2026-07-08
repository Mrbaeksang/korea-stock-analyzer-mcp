"""Slice 4: analysis/valuation pure functions."""

from app.analysis.valuation import compute_multiples, three_scenario_valuation


class TestMultiples:
    def test_per_pbr_from_real_inputs(self):
        m = compute_multiples(price=80000, eps=5000, bps=50000)
        assert abs(m["per"] - 16.0) < 0.01
        assert abs(m["pbr"] - 1.6) < 0.01

    def test_negative_eps_per_is_null_with_reason(self):
        m = compute_multiples(price=80000, eps=-1200, bps=50000)
        assert m["per"] is None
        assert "적자" in m["per_note"]
        assert m["pbr"] is not None  # PBR still meaningful

    def test_missing_inputs_stay_null(self):
        m = compute_multiples(price=80000, eps=None, bps=None)
        assert m["per"] is None
        assert m["pbr"] is None


class TestThreeScenario:
    def test_scenarios_ordered_and_assumptions_explicit(self):
        result = three_scenario_valuation(eps=5000, historical_cagr_pct=12.0, cagr_span_years=4)
        scenarios = result["scenarios"]
        assert [s["name"] for s in scenarios] == ["pessimistic", "neutral", "optimistic"]
        values = [s["value_per_share"] for s in scenarios]
        assert values[0] <= values[1] <= values[2]
        for s in scenarios:
            assert s["growth_pct"] is not None
            assert s["target_multiple"] is not None
            assert s["assumption_source"]  # every number carries its assumption

    def test_negative_eps_returns_honest_refusal(self):
        result = three_scenario_valuation(eps=-500, historical_cagr_pct=10.0, cagr_span_years=4)
        assert result["scenarios"] is None
        assert "적자" in result["reason"]

    def test_no_growth_history_uses_zero_growth_conservatively(self):
        result = three_scenario_valuation(eps=5000, historical_cagr_pct=None, cagr_span_years=None)
        scenarios = result["scenarios"]
        assert scenarios is not None
        # without history, growth must NOT be fabricated upward
        assert all(s["growth_pct"] <= 0.0 for s in scenarios[:2])
        assert "이력 없음" in scenarios[0]["assumption_source"] or "없" in scenarios[0]["assumption_source"]

    def test_negative_cagr_keeps_scenarios_ordered(self):
        # regression: with negative growth, haircuts inverted the labels —
        # "pessimistic" got the mildest decline and "optimistic" the worst.
        result = three_scenario_valuation(eps=1000, historical_cagr_pct=-10.0, cagr_span_years=3)
        scenarios = result["scenarios"]
        growths = [s["growth_pct"] for s in scenarios]
        values = [s["value_per_share"] for s in scenarios]
        assert growths[0] <= growths[1] <= growths[2]
        assert values[0] <= values[1] <= values[2]
        assert growths[0] == -10.0  # pessimistic carries the full decline

    def test_extreme_cagr_is_capped(self):
        result = three_scenario_valuation(eps=1000, historical_cagr_pct=80.0, cagr_span_years=2)
        for s in result["scenarios"]:
            assert s["growth_pct"] <= 20.0  # conservative cap, disclosed in assumptions
