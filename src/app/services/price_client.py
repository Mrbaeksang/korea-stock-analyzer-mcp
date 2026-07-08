"""Price and listing data via FinanceDataReader (KRX daily snapshot).

FinanceDataReader is synchronous pandas code — every call is pushed onto a
worker thread so the ASGI event loop never blocks.
"""

from __future__ import annotations

from datetime import date, timedelta

import anyio
from cachetools import TTLCache

LISTING_TTL_SECONDS = 60 * 60 * 24
QUOTE_TTL_SECONDS = 60 * 10

DATA_SOURCE = "KRX via FinanceDataReader"


class PriceClient:
    def __init__(self) -> None:
        self._listing_cache: TTLCache = TTLCache(maxsize=1, ttl=LISTING_TTL_SECONDS)
        self._quote_cache: TTLCache = TTLCache(maxsize=512, ttl=QUOTE_TTL_SECONDS)

    # -- listing ---------------------------------------------------------

    def _load_listing(self) -> list[dict]:
        import FinanceDataReader as fdr

        if "krx" in self._listing_cache:
            return self._listing_cache["krx"]

        df = fdr.StockListing("KRX")
        rows = []
        for record in df.to_dict("records"):
            code = str(record.get("Code", "")).zfill(6)
            if not code.isdigit():
                continue
            rows.append(
                {
                    "ticker": code,
                    "name": record.get("Name"),
                    "market": record.get("Market"),
                    "sector": record.get("Dept") or None,
                    "close": _num(record.get("Close")),
                    "market_cap": _num(record.get("Marcap")),
                    "shares_outstanding": _num(record.get("Stocks")),
                }
            )
        self._listing_cache["krx"] = rows
        return rows

    async def search(self, query: str) -> list[dict]:
        def _search() -> list[dict]:
            q = query.strip()
            out = []
            for row in self._load_listing():
                if q in (row["name"] or "") or q == row["ticker"]:
                    out.append(
                        {
                            "ticker": row["ticker"],
                            "name": row["name"],
                            "market": row["market"],
                            "sector": row["sector"],
                        }
                    )
            return out[:20]

        return await anyio.to_thread.run_sync(_search)

    # -- quote -----------------------------------------------------------

    async def quote(self, ticker: str) -> dict | None:
        if ticker in self._quote_cache:
            return self._quote_cache[ticker]

        result = await anyio.to_thread.run_sync(self._load_quote, ticker)
        if result is not None:
            self._quote_cache[ticker] = result
        return result

    def _load_quote(self, ticker: str) -> dict | None:
        import FinanceDataReader as fdr

        row = next((r for r in self._load_listing() if r["ticker"] == ticker), None)
        if row is None:
            return None

        start = (date.today() - timedelta(days=365)).isoformat()
        ohlcv = fdr.DataReader(ticker, start)

        if ohlcv.empty:
            high_52w = low_52w = volume = None
            price = row["close"]
            as_of = None
        else:
            high_52w = _num(ohlcv["High"].max())
            low_52w = _num(ohlcv["Low"].min())
            last = ohlcv.iloc[-1]
            price = _num(last["Close"])
            volume = _num(last["Volume"])
            as_of = ohlcv.index[-1].date().isoformat()

        return {
            "ticker": ticker,
            "name": row["name"],
            "market": row["market"],
            "price": price,
            "as_of": as_of,
            "market_cap": row["market_cap"],
            "shares_outstanding": row["shares_outstanding"],
            "high_52w": high_52w,
            "low_52w": low_52w,
            "volume": volume,
            "data_source": DATA_SOURCE,
        }


def _num(value) -> float | None:
    """NaN/None-safe numeric coercion — missing stays None, never a default."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if f != f:  # NaN
        return None
    return f
