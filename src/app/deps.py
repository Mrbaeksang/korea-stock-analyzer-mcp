"""Lazy singletons for external-data clients. Tests swap them via set_*()."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.price_client import PriceClient

_price_client: "PriceClient | None" = None


def price_client() -> "PriceClient":
    global _price_client
    if _price_client is None:
        from app.services.price_client import PriceClient

        _price_client = PriceClient()
    return _price_client


def set_price_client(client) -> None:
    global _price_client
    _price_client = client
