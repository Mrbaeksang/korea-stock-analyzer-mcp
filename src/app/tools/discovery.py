"""Company discovery tools: search_company, get_quote."""

import re

from fastmcp.exceptions import ToolError

from app import deps
from app.analysis.verification import verify_market_cap
from app.server import mcp

TICKER_PATTERN = re.compile(r"^\d{6}$")


def validate_ticker(ticker: str) -> str:
    ticker = ticker.strip()
    if not TICKER_PATTERN.fullmatch(ticker):
        raise ToolError("티커는 6자리 숫자여야 합니다 (예: 005930). 종목명은 search_company로 검색하세요.")
    return ticker


@mcp.tool
async def search_company(query: str) -> dict:
    """종목명 또는 6자리 코드로 한국 상장사를 검색한다. 최대 20건 반환."""
    query = query.strip()
    if not query:
        raise ToolError("검색어가 비어 있습니다.")
    matches = await deps.price_client().search(query)
    return {"query": query, "count": len(matches), "matches": matches}


@mcp.tool
async def get_quote(ticker: str) -> dict:
    """종목의 시세 스냅샷: 가격, 시가총액, 52주 고저, 거래량. 모든 값에 기준일 명시."""
    ticker = validate_ticker(ticker)
    quote = await deps.price_client().quote(ticker)
    if quote is None:
        raise ToolError(f"티커 {ticker}에 해당하는 상장 종목을 찾을 수 없습니다.")

    return {
        **quote,
        "market_cap_check": verify_market_cap(
            price=quote.get("price"),
            shares=quote.get("shares_outstanding"),
            reported_cap=quote.get("market_cap"),
        ),
    }
