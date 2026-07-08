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
    # Unexpected exceptions become a generic error; ToolError/DartError
    # messages still pass through.
    mask_error_details=True,
)
mcp.add_middleware(build_rate_limiter())


@mcp.tool(
    description="Health check for Korea Stock MCP(한국주식 분석 서버). Returns 'pong'.",
    annotations={
        "title": "Ping",
        "readOnlyHint": True,
        "destructiveHint": False,
        "openWorldHint": False,
        "idempotentHint": True,
    },
)
def ping() -> str:
    return "pong"


@mcp.custom_route("/health", methods=["GET"])
async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "healthy"})


# Tool modules register themselves against `mcp` on import.
from app.tools import discovery, financials, risk, valuation  # noqa: E402,F401
