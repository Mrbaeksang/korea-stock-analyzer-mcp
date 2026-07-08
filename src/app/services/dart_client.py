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
from fastmcp.exceptions import ToolError

DART_BASE = "https://opendart.fss.or.kr/api"


class DartError(ToolError):
    """DART API failure with a user-actionable message.

    Subclasses ToolError so the message passes through FastMCP's error
    masking to the client instead of a generic internal error.
    """


# DART status → user-facing message. 000/013 are not errors.
DART_STATUS_MESSAGES = {
    "010": "DART 인증키가 등록되지 않았습니다 (서버 설정 오류).",
    "011": "DART 인증키를 사용할 수 없습니다 (서버 설정 오류 — 인증키 확인 필요).",
    "012": "DART가 이 서버 IP의 접근을 거부했습니다.",
    "014": "DART 원본 파일이 존재하지 않습니다.",
    "020": "DART 일일 호출 한도(20,000건)를 초과했습니다. 내일 다시 시도하세요.",
    "021": "DART 조회 가능 회사 수를 초과했습니다.",
    "100": "DART 요청 필드가 부적절합니다 (서버 버그 가능성).",
    "800": "DART 시스템 점검 중입니다. 잠시 후 다시 시도하세요.",
    "900": "DART에서 정의되지 않은 오류가 발생했습니다.",
    "901": "DART 인증키 사용 기한이 만료되었습니다 (서버 설정 오류).",
}


def raise_for_dart_status(body: dict) -> None:
    status = body.get("status")
    if status in ("000", "013"):  # 정상 / 데이터 없음
        return
    message = DART_STATUS_MESSAGES.get(
        status, f"DART 오류 (status={status}): {body.get('message', '')}"
    )
    raise DartError(message)
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
    "이자비용": "interest_expense",
    "금융비용": "interest_expense",
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
        # Shared connection pool; retries cover transient connect failures only.
        self._http = httpx.AsyncClient(
            timeout=30, transport=httpx.AsyncHTTPTransport(retries=2)
        )

    async def _get(self, path: str, **params) -> httpx.Response:
        try:
            response = await self._http.get(f"{DART_BASE}/{path}", params=params)
            response.raise_for_status()
            return response
        except httpx.HTTPError as exc:
            raise DartError(f"DART 서버 연결 실패 ({type(exc).__name__}). 잠시 후 재시도하세요.") from exc

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

        response = await self._get("corpCode.xml", crtfc_key=self._require_key())
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
        for year in range(latest_filed_year - years + 1, latest_filed_year + 1):
            year_data = await self._fetch_year(corp_code, year)
            if year_data is not None:
                results.append(year_data)

        self._financials_cache[cache_key] = results
        return results

    async def _fetch_year(self, corp_code: str, year: int) -> dict | None:
        for fs_div in ("CFS", "OFS"):
            payload = await self._call_fnltt(corp_code, year, fs_div)
            if payload is None:
                continue
            financials = extract_year_financials(payload)
            if all(v is None for v in financials.values()):
                continue
            return {"year": year, "fs_div": fs_div, "report": "사업보고서", **financials}
        return None

    # -- disclosures ---------------------------------------------------------

    async def recent_disclosures(self, corp_code: str, days: int = 90) -> list[dict]:
        from datetime import timedelta

        end = date.today()
        begin = end - timedelta(days=days)
        response = await self._get(
            "list.json",
            crtfc_key=self._require_key(),
            corp_code=corp_code,
            bgn_de=begin.strftime("%Y%m%d"),
            end_de=end.strftime("%Y%m%d"),
            page_count="100",
        )
        body = response.json()
        raise_for_dart_status(body)
        if body.get("status") != "000":
            return []
        return [
            {
                "report_nm": item.get("report_nm"),
                "rcept_dt": item.get("rcept_dt"),
                "flr_nm": item.get("flr_nm"),
                "rcept_no": item.get("rcept_no"),
            }
            for item in body.get("list", [])
        ]

    async def _call_fnltt(self, corp_code: str, year: int, fs_div: str) -> list[dict] | None:
        response = await self._get(
            "fnlttSinglAcntAll.json",
            crtfc_key=self._require_key(),
            corp_code=corp_code,
            bsns_year=str(year),
            reprt_code=ANNUAL_REPORT_CODE,
            fs_div=fs_div,
        )
        body = response.json()
        raise_for_dart_status(body)
        if body.get("status") != "000":
            return None  # 013 = no data for this year/basis
        return body.get("list") or None
