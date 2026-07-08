"""Financial statement tool: get_financials (DART filed data only)."""

from fastmcp.exceptions import ToolError

from app import deps
from app.analysis.ratios import cagr, compute_ratios
from app.server import mcp
from app.tools.discovery import validate_ticker

FCF_NOTE = "FCF = 영업활동현금흐름 − 유형자산 취득(근사치). 무형자산·리스 투자 미포함."
DATA_SOURCE = "DART 전자공시 사업보고서 (fnlttSinglAcntAll)"


@mcp.tool
async def get_financials(ticker: str, years: int = 5) -> dict:
    """DART 공시 기반 실측 연간 재무제표(최대 10개년)와 4축 재무비율.

    데이터가 없는 연도/항목은 null로 표시된다. 추정치는 없다.
    """
    ticker = validate_ticker(ticker)
    years = max(2, min(years, 10))

    dart = deps.dart_client()
    corp_code = await dart.corp_code_for(ticker)
    if corp_code is None:
        raise ToolError(f"티커 {ticker}는 DART 공시 대상 기업 목록에 없습니다.")

    filings = await dart.annual_financials(corp_code, years)
    if not filings:
        raise ToolError(
            f"티커 {ticker}의 DART 연간 재무제표를 찾을 수 없습니다 (신규상장/비공시 기업 가능성)."
        )

    enriched = []
    for filing in filings:
        fcf = (
            filing["cfo"] - filing["capex"]
            if filing["cfo"] is not None and filing["capex"] is not None
            else None
        )
        enriched.append(
            {
                **filing,
                "fcf": fcf,
                "ratios": compute_ratios(
                    revenue=filing["revenue"],
                    operating_income=filing["operating_income"],
                    net_income=filing["net_income"],
                    liabilities=filing["liabilities"],
                    equity=filing["equity"],
                    issued_capital=filing["issued_capital"],
                    cfo=filing["cfo"],
                ),
            }
        )

    first, last = filings[0], filings[-1]
    span = last["year"] - first["year"]
    growth = {
        "span_years": span,
        "revenue_cagr_pct": cagr(first["revenue"], last["revenue"], span),
        "net_income_cagr_pct": cagr(first["net_income"], last["net_income"], span),
        "note": "CAGR은 실제 연도 간격 기준. 계산 불가(적자 전환 등)는 null.",
    }

    return {
        "ticker": ticker,
        "statement_basis": last["fs_div"],
        "statement_basis_note": "CFS=연결재무제표, OFS=별도재무제표",
        "unit": "KRW",
        "years": enriched,
        "growth": growth,
        "fcf_note": FCF_NOTE,
        "data_source": DATA_SOURCE,
    }
