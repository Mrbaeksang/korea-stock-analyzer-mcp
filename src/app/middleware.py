"""Cross-cutting MCP middleware.

Global (not per-client) rate limit: the scarce resources are the shared
upstream quotas — DART's 20k/day key and KRX's IP-block policy — so one
bucket protects them regardless of how many clients connect.
"""

import os

from fastmcp.server.middleware.rate_limiting import RateLimitingMiddleware


def build_rate_limiter() -> RateLimitingMiddleware:
    return RateLimitingMiddleware(
        max_requests_per_second=float(os.environ.get("RATE_LIMIT_RPS", "5")),
        burst_capacity=int(os.environ.get("RATE_LIMIT_BURST", "15")),
        global_limit=True,
    )
