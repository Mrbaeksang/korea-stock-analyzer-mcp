"""Slice 3: DART fnlttSinglAcntAll response parsing against recorded fixture."""

import json
from pathlib import Path

from app.services.dart_client import extract_year_financials

FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "dart_fnltt_cfs_sample.json").read_text()
)


def test_extracts_key_accounts():
    fin = extract_year_financials(FIXTURE["list"])
    assert fin["revenue"] == 300_870_903_000_000
    assert fin["operating_income"] == 32_725_961_000_000
    assert fin["net_income"] == 34_451_351_000_000
    assert fin["assets"] == 455_905_980_000_000
    assert fin["liabilities"] == 112_339_878_000_000
    assert fin["equity"] == 343_566_102_000_000
    assert fin["issued_capital"] == 897_514_000_000
    assert fin["cfo"] == 62_171_613_000_000
    assert fin["cfi"] == -46_791_999_000_000


def test_capex_extracted_from_named_account():
    fin = extract_year_financials(FIXTURE["list"])
    assert fin["capex"] == 52_496_377_000_000  # 유형자산의 취득, sign normalized


def test_missing_accounts_stay_none():
    fin = extract_year_financials(
        [{"sj_div": "BS", "account_id": "ifrs-full_Assets", "account_nm": "자산총계", "thstrm_amount": "100"}]
    )
    assert fin["assets"] == 100
    assert fin["revenue"] is None
    assert fin["cfo"] is None


def test_malformed_amounts_stay_none():
    fin = extract_year_financials(
        [{"sj_div": "CIS", "account_id": "ifrs-full_Revenue", "account_nm": "수익(매출액)", "thstrm_amount": "-"}]
    )
    assert fin["revenue"] is None
