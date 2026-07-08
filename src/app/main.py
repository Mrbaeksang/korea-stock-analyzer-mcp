"""ASGI entrypoint: uvicorn app.main:app --app-dir src"""

import asyncio
import contextlib

from app.server import mcp

# Stateless: every request may land on any worker/replica; also matches the
# session-less direction of the MCP 2026-07 spec RC.
app = mcp.http_app(stateless_http=True)

_fastmcp_lifespan = app.router.lifespan_context


async def _warm_caches() -> None:
    """Pre-load the KRX listing and DART corp map so first real tool calls
    hit warm caches (PlayMCP latency budget: p99 3s). Failures are ignored —
    caches fill lazily on first use instead."""
    from app import deps

    with contextlib.suppress(Exception):
        await deps.price_client().search("삼성전자")
    with contextlib.suppress(Exception):
        await deps.dart_client().corp_code_for("005930")


@contextlib.asynccontextmanager
async def _lifespan(application):
    async with _fastmcp_lifespan(application):
        warmup = asyncio.create_task(_warm_caches())
        try:
            yield
        finally:
            warmup.cancel()


app.router.lifespan_context = _lifespan
