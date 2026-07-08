import pytest

from app import deps


class FakePriceClient:
    """In-memory stand-in for PriceClient. Data shapes mirror the real client."""

    def __init__(self):
        self.listing = [
            {"ticker": "005930", "name": "삼성전자", "market": "KOSPI", "sector": "전기전자"},
            {"ticker": "247540", "name": "에코프로비엠", "market": "KOSDAQ", "sector": "화학"},
        ]
        self.quotes = {
            "005930": {
                "ticker": "005930",
                "name": "삼성전자",
                "market": "KOSPI",
                "price": 80000,
                "as_of": "2026-07-07",
                "market_cap": 477_000_000_000_000,
                "shares_outstanding": 5_969_782_550,
                "high_52w": 92000,
                "low_52w": 55000,
                "volume": 12_345_678,
                "data_source": "KRX via FinanceDataReader",
            }
        }

    async def search(self, query: str) -> list[dict]:
        return [
            row for row in self.listing
            if query in row["name"] or query == row["ticker"]
        ]

    async def quote(self, ticker: str) -> dict | None:
        return self.quotes.get(ticker)


@pytest.fixture
def fake_price_client():
    client = FakePriceClient()
    deps.set_price_client(client)
    yield client
    deps.set_price_client(None)
