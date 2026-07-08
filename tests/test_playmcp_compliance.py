"""PlayMCP submission requirements (2026-06-12 guide).

- every tool: annotations with title/readOnlyHint/destructiveHint/
  openWorldHint/idempotentHint all set
- description: English, includes service name, <=1024 chars
- no "kakao" anywhere in server/tool names (case-insensitive)
"""

import re

from fastmcp import Client

from app.server import mcp

REQUIRED_ANNOTATIONS = (
    "title", "readOnlyHint", "destructiveHint", "openWorldHint", "idempotentHint"
)
SERVICE_NAME = "Korea Stock MCP"


async def test_all_tools_have_complete_annotations():
    async with Client(mcp) as client:
        tools = await client.list_tools()
        assert tools, "no tools registered"
        for tool in tools:
            annotations = tool.annotations
            assert annotations is not None, f"{tool.name}: annotations missing"
            for field in REQUIRED_ANNOTATIONS:
                assert getattr(annotations, field) is not None, (
                    f"{tool.name}: annotation '{field}' not set"
                )


async def test_descriptions_follow_playmcp_rules():
    async with Client(mcp) as client:
        for tool in await client.list_tools():
            desc = tool.description or ""
            assert desc, f"{tool.name}: description missing"
            assert len(desc) <= 1024, f"{tool.name}: description too long"
            assert SERVICE_NAME in desc, f"{tool.name}: service name missing in description"


async def test_no_kakao_in_names():
    async with Client(mcp) as client:
        assert "kakao" not in mcp.name.lower()
        for tool in await client.list_tools():
            assert "kakao" not in tool.name.lower()
            assert re.fullmatch(r"[A-Za-z0-9_-]{1,128}", tool.name), (
                f"{tool.name}: invalid tool name charset"
            )
