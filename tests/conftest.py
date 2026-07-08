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


class FakeDartClient:
    def __init__(self):
        self.years = {
            2022: {"revenue": 100, "operating_income": 10, "net_income": 8, "assets": 500,
                   "liabilities": 200, "equity": 300, "issued_capital": 50,
                   "cfo": 12, "cfi": -5, "capex": 4, "interest_expense": 2},
            2023: {"revenue": 110, "operating_income": 12, "net_income": 9, "assets": 520,
                   "liabilities": 210, "equity": 310, "issued_capital": 50,
                   "cfo": 13, "cfi": -6, "capex": 5, "interest_expense": 2},
            2024: {"revenue": 121, "operating_income": 14, "net_income": 11, "assets": 540,
                   "liabilities": 215, "equity": 325, "issued_capital": 50,
                   "cfo": 15, "cfi": -7, "capex": 5, "interest_expense": 2},
        }
        self.disclosures = [
            {"report_nm": "사업보고서 (2024.12)", "rcept_dt": "20250311", "flr_nm": "삼성전자",
             "rcept_no": "20250311000123"},
        ]

    async def corp_code_for(self, ticker: str) -> str | None:
        return "00126380" if ticker == "005930" else None

    async def annual_financials(self, corp_code: str, years: int) -> list[dict]:
        out = []
        for year in sorted(self.years)[-years:]:
            out.append({
                "year": year,
                "fs_div": "CFS",
                "report": "사업보고서",
                **self.years[year],
            })
        return out

    async def recent_disclosures(self, corp_code: str, days: int = 90) -> list[dict]:
        return self.disclosures


@pytest.fixture
def fake_price_client():
    client = FakePriceClient()
    deps.set_price_client(client)
    yield client
    deps.set_price_client(None)


@pytest.fixture
def fake_dart_client():
    client = FakeDartClient()
    deps.set_dart_client(client)
    yield client
    deps.set_dart_client(None)
