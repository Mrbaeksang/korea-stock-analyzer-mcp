"""Valuation tool: get_valuation — range, not a price target."""

from fastmcp.exceptions import ToolError

from app import deps
from app.analysis.ratios import cagr
from app.analysis.valuation import compute_multiples, three_scenario_valuation
from app.server import mcp
from app.tools.discovery import validate_ticker

DISCLAIMER = (
    "본 결과는 공시 데이터 기반 참고 정보이며 투자 자문이 아니다. "
    "시나리오 값은 명시된 가정의 산술 결과일 뿐 목표 주가가 아니다."
)


@mcp.tool(
    description=(
        "Computes a conservative valuation for a Korean stock — PER/PBR multiples "
        "from filed EPS/BPS and a three-scenario (pessimistic/neutral/optimistic) "
        "value range with all assumptions disclosed — via Korea Stock MCP(한국주식 분석). "
        "Provides a range, not a price target; no buy/sell recommendations."
    ),
    annotations={
        "title": "Get Valuation",
        "readOnlyHint": True,
        "destructiveHint": False,
        "openWorldHint": True,
        "idempotentHint": True,
    },
)
async def get_valuation(ticker: str) -> dict:
    ticker = validate_ticker(ticker)

    quote = await deps.price_client().quote(ticker)
    if quote is None:
        raise ToolError(f"티커 {ticker}에 해당하는 상장 종목을 찾을 수 없습니다.")

    dart = deps.dart_client()
    corp_code = await dart.corp_code_for(ticker)
    if corp_code is None:
        raise ToolError(f"티커 {ticker}는 DART 공시 대상 기업 목록에 없습니다.")
    filings = await dart.annual_financials(corp_code, 5)
    if not filings:
        raise ToolError(f"티커 {ticker}의 DART 재무제표가 없어 밸류에이션 불가.")

    latest = filings[-1]
    shares = quote.get("shares_outstanding")
    eps = (
        latest["net_income"] / shares
        if latest["net_income"] is not None and shares
        else None
    )
    bps = latest["equity"] / shares if latest["equity"] is not None and shares else None

    first = filings[0]
    span = latest["year"] - first["year"]
    ni_cagr = cagr(first["net_income"], latest["net_income"], span)

    return {
        "ticker": ticker,
        "price": quote.get("price"),
        "as_of": quote.get("as_of"),
        "basis": {
            "eps": round(eps) if eps is not None else None,
            "bps": round(bps) if bps is not None else None,
            "eps_source": f"DART {latest['year']}년 순이익 ÷ 상장주식수 (직접 계산)",
            "statement_basis": latest["fs_div"],
        },
        "multiples": compute_multiples(quote.get("price"), eps, bps),
        "scenario_valuation": three_scenario_valuation(eps, ni_cagr, span),
        "disclaimer": DISCLAIMER,
    }
