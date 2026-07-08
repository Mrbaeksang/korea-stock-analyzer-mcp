"""ASGI entrypoint: uvicorn app.main:app --app-dir src"""

from app.server import mcp

# Stateless: every request may land on any worker/replica; also matches the
# session-less direction of the MCP 2026-07 spec RC.
app = mcp.http_app(stateless_http=True)
