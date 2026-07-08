"""DART OpenAPI client: corp-code mapping and annual financial statements.

Only real, filed data leaves this module. A year that DART has no filing for
is simply absent from the result — never synthesized.
"""

from __future__ import annotations

import io
import os
import time
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from pathlib import Path

import httpx
from cachetools import TTLCache

DART_BASE = "https://opendart.fss.or.kr/api"
ANNUAL_REPORT_CODE = "11011"
CORPCODE_CACHE_TTL_SECONDS = 60 * 60 * 24
FINANCIALS_CACHE_TTL_SECONDS = 60 * 60 * 24
CACHE_DIR = Path(os.environ.get("APP_CACHE_DIR", ".cache"))

# account_id suffix → our field name. DART mixes ifrs-full_/ifrs_ prefixes
# across filings, so match on the tail.
ACCOUNT_ID_MAP = {
    "_Revenue": "revenue",
    "_OperatingIncomeLoss": "operating_income",
    "_ProfitLoss": "net_income",
    "_Assets": "assets",
    "_Liabilities": "liabilities",
    "_Equity": "equity",
    "_IssuedCapital": "issued_capital",
    "_CashFlowsFromUsedInOperatingActivities": "cfo",
    "_CashFlowsFromUsedInInvestingActivities": "cfi",
}

# account_nm fallback for filings without standard account_ids.
ACCOUNT_NM_MAP = {
    "수익(매출액)": "revenue",
    "매출액": "revenue",
    "영업이익": "operating_income",
    "영업이익(손실)": "operating_income",
    "당기순이익": "net_income",
    "당기순이익(손실)": "net_income",
    "자산총계": "assets",
    "부채총계": "liabilities",
    "자본총계": "equity",
    "자본금": "issued_capital",
    "영업활동현금흐름": "cfo",
    "영업활동으로인한현금흐름": "cfo",
    "투자활동현금흐름": "cfi",
    "투자활동으로인한현금흐름": "cfi",
}

CAPEX_ACCOUNT_NAMES = ("유형자산의 취득", "유형자산의취득")

FIELDS = [*dict.fromkeys(ACCOUNT_ID_MAP.values()), "capex"]


def _parse_amount(raw: str | None) -> int | None:
    if raw is None:
        return None
    cleaned = str(raw).replace(",", "").strip()
    if not cleaned or cleaned == "-":
        return None
    try:
        return int(cleaned)
    except ValueError:
        return None


def extract_year_financials(rows: list[dict]) -> dict:
    """Reduce a fnlttSinglAcntAll row list to our key accounts (thstrm only).

    First match wins per field — DART lists the primary statement's account
    before footnote-level variants.
    """
    result: dict = {field: None for field in FIELDS}

    for row in rows:
        amount = _parse_amount(row.get("thstrm_amount"))
        if amount is None:
            continue

        field = None
        account_id = row.get("account_id") or ""
        for suffix, name in ACCOUNT_ID_MAP.items():
            if account_id.endswith(suffix):
                field = name
                break
        if field is None:
            field = ACCOUNT_NM_MAP.get((row.get("account_nm") or "").strip())

        if field is None:
            account_nm = (row.get("account_nm") or "").strip()
            if account_nm in CAPEX_ACCOUNT_NAMES and result["capex"] is None:
                result["capex"] = abs(amount)
            continue

        # Income-statement fields must come from IS/CIS, not equity-change rows
        if field in ("revenue", "operating_income", "net_income") and row.get("sj_div") not in ("IS", "CIS", None):
            continue

        if result[field] is None:
            result[field] = amount

    return result


class DartClient:
    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.environ.get("DART_API_KEY")
        self._corp_map: dict[str, str] | None = None
        self._corp_map_loaded_at: float = 0.0
        self._financials_cache: TTLCache = TTLCache(maxsize=256, ttl=FINANCIALS_CACHE_TTL_SECONDS)

    def _require_key(self) -> str:
        if not self._api_key:
            raise RuntimeError(
                "DART_API_KEY 환경변수가 설정되지 않았습니다. https://opendart.fss.or.kr 에서 무료 발급."
            )
        return self._api_key

    # -- corp code mapping -------------------------------------------------

    async def _load_corp_map(self) -> dict[str, str]:
        now = time.monotonic()
        if self._corp_map is not None and now - self._corp_map_loaded_at < CORPCODE_CACHE_TTL_SECONDS:
            return self._corp_map

        raw = await self._corpcode_xml()
        mapping: dict[str, str] = {}
        root = ET.fromstring(raw)
        for corp in root.iter("list"):
            stock_code = (corp.findtext("stock_code") or "").strip()
            corp_code = (corp.findtext("corp_code") or "").strip()
            if stock_code and corp_code:
                mapping[stock_code] = corp_code
        self._corp_map = mapping
        self._corp_map_loaded_at = now
        return mapping

    async def _corpcode_xml(self) -> bytes:
        cache_file = CACHE_DIR / "CORPCODE.xml"
        if cache_file.exists() and time.time() - cache_file.stat().st_mtime < CORPCODE_CACHE_TTL_SECONDS:
            return cache_file.read_bytes()

        async with httpx.AsyncClient(timeout=60) as http:
            response = await http.get(
                f"{DART_BASE}/corpCode.xml", params={"crtfc_key": self._require_key()}
            )
        response.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            raw = zf.read("CORPCODE.xml")
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file.write_bytes(raw)
        return raw

    async def corp_code_for(self, ticker: str) -> str | None:
        return (await self._load_corp_map()).get(ticker)

    # -- financial statements ----------------------------------------------

    async def annual_financials(self, corp_code: str, years: int) -> list[dict]:
        """Latest `years` annual filings, newest last. Consolidated (CFS)
        preferred, separate (OFS) fallback, basis recorded per year."""
        cache_key = (corp_code, years)
        if cache_key in self._financials_cache:
            return self._financials_cache[cache_key]

        latest_filed_year = date.today().year - 1
        results: list[dict] = []
        async with httpx.AsyncClient(timeout=30) as http:
            for year in range(latest_filed_year - years + 1, latest_filed_year + 1):
                year_data = await self._fetch_year(http, corp_code, year)
                if year_data is not None:
                    results.append(year_data)

        self._financials_cache[cache_key] = results
        return results

    async def _fetch_year(self, http: httpx.AsyncClient, corp_code: str, year: int) -> dict | None:
        for fs_div in ("CFS", "OFS"):
            payload = await self._call_fnltt(http, corp_code, year, fs_div)
            if payload is None:
                continue
            financials = extract_year_financials(payload)
            if all(v is None for v in financials.values()):
                continue
            return {"year": year, "fs_div": fs_div, "report": "사업보고서", **financials}
        return None

    async def _call_fnltt(
        self, http: httpx.AsyncClient, corp_code: str, year: int, fs_div: str
    ) -> list[dict] | None:
        response = await http.get(
            f"{DART_BASE}/fnlttSinglAcntAll.json",
            params={
                "crtfc_key": self._require_key(),
                "corp_code": corp_code,
                "bsns_year": str(year),
                "reprt_code": ANNUAL_REPORT_CODE,
                "fs_div": fs_div,
            },
        )
        response.raise_for_status()
        body = response.json()
        if body.get("status") != "000":
            return None  # 013 = no data for this year/basis
        return body.get("list") or None
