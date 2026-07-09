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


READ_ONLY_TOOL = {
    "readOnlyHint": True,
    "destructiveHint": False,
    "openWorldHint": True,
    "idempotentHint": True,
}


@mcp.tool(
    description=(
        "Searches Korean listed companies (KOSPI/KOSDAQ) by company name or "
        "6-digit ticker code via 한국주식 분석 (Korea Stock MCP). Returns up to 20 matches "
        "with ticker, name, market and sector."
    ),
    annotations={"title": "Search Company", **READ_ONLY_TOOL},
)
async def search_company(query: str) -> dict:
    query = query.strip()
    if not query:
        raise ToolError("검색어가 비어 있습니다.")
    matches = await deps.price_client().search(query)
    return {"query": query, "count": len(matches), "matches": matches}


@mcp.tool(
    description=(
        "Retrieves the latest quote snapshot for a Korean stock — price, market cap, "
        "52-week high/low, volume — with a market-cap consistency check, via "
        "한국주식 분석 (Korea Stock MCP). Every value carries its as-of date; missing data "
        "is returned as null, never fabricated."
    ),
    annotations={"title": "Get Quote", **READ_ONLY_TOOL},
)
async def get_quote(ticker: str) -> dict:
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
