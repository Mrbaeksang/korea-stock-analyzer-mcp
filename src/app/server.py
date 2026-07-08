"""FastMCP server instance and cross-cutting routes."""

from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.middleware import build_rate_limiter

mcp = FastMCP(
    name="korea-stock-mcp",
    instructions=(
        "보수적 한국 주식 분석 서버. 모든 수치는 실측 출처(DART 공시, KRX 시세)에서만 "
        "제공하며, 데이터가 없으면 없다고 답한다. 매수/매도/비중 권고는 하지 않는다."
    ),
)
mcp.add_middleware(build_rate_limiter())


@mcp.tool
def ping() -> str:
    """서버 연결 확인용. 'pong'을 반환한다."""
    return "pong"


@mcp.custom_route("/health", methods=["GET"])
async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "healthy"})


# Tool modules register themselves against `mcp` on import.
from app.tools import discovery, financials, risk, valuation  # noqa: E402,F401
