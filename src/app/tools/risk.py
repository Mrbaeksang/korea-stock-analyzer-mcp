"""Risk tool: get_risk_flags — financial red flags + disclosure signals."""

from fastmcp.exceptions import ToolError

from app import deps
from app.analysis.risk import evaluate_financial_flags
from app.server import mcp
from app.tools.discovery import validate_ticker

RISK_KEYWORDS = (
    "유상증자", "전환사채", "신주인수권", "감사의견", "의견거절", "감사보고서",
    "최대주주변경", "최대주주 변경", "소송", "횡령", "배임", "관리종목",
    "불성실공시", "회생절차", "파산", "거래정지",
)

DISCLOSURE_URL = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"


def _keyword_of(report_nm: str | None) -> str | None:
    if not report_nm:
        return None
    return next((kw for kw in RISK_KEYWORDS if kw in report_nm), None)


@mcp.tool(
    description=(
        "Detects financial red flags for a Korean listed company — high debt ratio, "
        "low interest coverage, negative operating cash flow streaks, revenue decline, "
        "capital impairment, earnings-cash divergence — plus recent DART(전자공시) "
        "disclosures highlighted by risk keywords, via 한국주식 분석 (Korea Stock MCP). "
        "Checks that could not run are listed separately, never silently passed."
    ),
    annotations={
        "title": "Get Risk Flags",
        "readOnlyHint": True,
        "destructiveHint": False,
        "openWorldHint": True,
        "idempotentHint": True,
    },
)
async def get_risk_flags(ticker: str, disclosure_days: int = 90) -> dict:
    ticker = validate_ticker(ticker)
    disclosure_days = max(7, min(disclosure_days, 365))

    dart = deps.dart_client()
    corp_code = await dart.corp_code_for(ticker)
    if corp_code is None:
        raise ToolError(f"티커 {ticker}는 DART 공시 대상 기업 목록에 없습니다.")

    filings = await dart.annual_financials(corp_code, 5)
    if not filings:
        raise ToolError(f"티커 {ticker}의 DART 재무제표가 없어 재무 적신호 검사 불가.")

    result = evaluate_financial_flags(filings)

    raw_disclosures = await dart.recent_disclosures(corp_code, days=disclosure_days)
    disclosures = [
        {
            **d,
            "url": DISCLOSURE_URL.format(rcept_no=d.get("rcept_no", "")),
            "risk_keyword": _keyword_of(d.get("report_nm")),
        }
        for d in raw_disclosures
    ]
    keyword_hits = [d for d in disclosures if d["risk_keyword"]]

    triggered = [f for f in result["flags"] if f["triggered"]]
    if triggered or keyword_hits:
        summary = (
            f"경고 {len(triggered)}건 + 주의 공시 {len(keyword_hits)}건 탐지 "
            f"(재무 검사 {result['checked_count']}개 항목 수행)"
        )
    else:
        summary = f"탐지된 적신호 없음 (재무 검사 {result['checked_count']}개 항목 수행)"

    return {
        "ticker": ticker,
        "summary": summary,
        "flags": result["flags"],
        "unavailable_checks": result["unavailable_checks"],
        "checked_count": result["checked_count"],
        "disclosures": disclosures,
        "disclosure_window_days": disclosure_days,
        "data_source": "DART 전자공시 (재무제표·공시목록)",
    }
