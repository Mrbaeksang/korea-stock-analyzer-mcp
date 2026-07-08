"""Lazy singletons for external-data clients. Tests swap them via set_*()."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.dart_client import DartClient
    from app.services.price_client import PriceClient

_price_client: "PriceClient | None" = None
_dart_client: "DartClient | None" = None


def price_client() -> "PriceClient":
    global _price_client
    if _price_client is None:
        from app.services.price_client import PriceClient

        _price_client = PriceClient()
    return _price_client


def set_price_client(client) -> None:
    global _price_client
    _price_client = client


def dart_client() -> "DartClient":
    global _dart_client
    if _dart_client is None:
        from app.services.dart_client import DartClient

        _dart_client = DartClient()
    return _dart_client


def set_dart_client(client) -> None:
    global _dart_client
    _dart_client = client
