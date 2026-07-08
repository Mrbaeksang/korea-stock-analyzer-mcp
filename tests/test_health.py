"""Slice 1: /health endpoint behavior over the ASGI app."""

import httpx

from app.main import app


async def test_health_returns_200():
    transport = httpx.ASGITransport(app=app)
    # Lifespan is required for FastMCP session manager in stateless HTTP mode,
    # but /health must answer even without MCP session setup.
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
