# -*- coding: utf-8 -*-
"""Vercel Python worker providing market data helpers for the MCP HTTP bridge."""

from __future__ import annotations

import json
import math
import os
import pathlib
import traceback
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from pykrx import stock

MAX_LOOKBACK_DAYS = 30
RECENT_HISTORY_DAYS = 30
RECENT_DAILY_POINTS = 5
MILLION = 1_000_000
HUNDRED_MILLION = 100_000_000

COL_OPEN = "시가"
COL_HIGH = "고가"
COL_LOW = "저가"
COL_CLOSE = "종가"
COL_VOLUME = "거래량"
COL_CHANGE_RATE = "등락률"
COL_MARKET_CAP = "시가총액"
COL_SHARE_COUNT = "상장주식수"
COL_NET_VOLUME = "순매수거래량"
COL_NET_AMOUNT = "순매수거래대금"

INVESTOR_MAP = {
    "외국인": "foreign",
    "기관합계": "institution",
    "개인": "individual",
}

_MARKET_CACHE: Dict[str, str] = {}

MPLCONFIGDIR = os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
pathlib.Path(MPLCONFIGDIR).mkdir(parents=True, exist_ok=True)


class StockAnalyzerError(Exception):
    """Raised when a user-facing error should be returned to the client."""

    def __init__(self, message: str, status: int = 400, detail: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message)
        self.status = status
        self.detail = detail or {}


def _success_response(data: Dict[str, Any], status: int = 200) -> Dict[str, Any]:
    return {
        "success": True,
        "status": status,
        "data": data,
    }


def _error_response(status: int, message: str, detail: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "success": False,
        "status": status,
        "error": {
            "message": message,
        },
    }
    if detail:
        payload["error"]["detail"] = detail
    return payload


def _to_int(value: Any) -> Optional[int]:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, (int,)):
        return int(value)
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def _to_float(value: Any, digits: int = 2) -> Optional[float]:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def _safe_div(numerator: Any, denominator: Any, digits: int = 2) -> Optional[float]:
    num = _to_float(numerator, digits + 2)
    den = _to_float(denominator, digits + 2)
    if num is None or den is None or den == 0:
        return None
    return round(num / den, digits)


def _require_ticker(params: Dict[str, Any]) -> str:
    ticker = params.get("ticker") if isinstance(params, dict) else None
    if not ticker or not isinstance(ticker, str):
        raise StockAnalyzerError("ticker 파라미터는 필수입니다.", status=400)
    return ticker.strip()


def _require_company_name(params: Dict[str, Any]) -> str:
    name = params.get("company_name") if isinstance(params, dict) else None
    if not name or not isinstance(name, str):
        raise StockAnalyzerError("company_name 파라미터는 필수입니다.", status=400)
    return name.strip()


def _find_market_date_for_ticker(
    ticker: str,
    reference_date: Optional[datetime] = None,
    lookback: int = MAX_LOOKBACK_DAYS,
) -> Tuple[datetime, str, pd.DataFrame]:
    """Return (datetime, date_str, ohlcv dataframe for that single day)."""

    cursor = reference_date or datetime.now()
    for _ in range(lookback):
        date_str = cursor.strftime("%Y%m%d")
        frame = stock.get_market_ohlcv_by_date(date_str, date_str, ticker)
        if not frame.empty:
            return cursor, date_str, frame
        cursor -= timedelta(days=1)
    raise StockAnalyzerError("해당 종목의 최근 거래일을 찾을 수 없습니다.", status=404)


def _find_fundamental_row(
    ticker: str,
    reference_date: Optional[datetime] = None,
    lookback: int = MAX_LOOKBACK_DAYS,
) -> Tuple[datetime, str, pd.Series]:
    cursor = reference_date or datetime.now()
    for _ in range(lookback):
        date_str = cursor.strftime("%Y%m%d")
        frame = stock.get_market_fundamental_by_ticker(date_str, market="ALL")
        if not frame.empty and ticker in frame.index:
            row = frame.loc[ticker]
            if all(
                (pd.isna(row.get(field)) or float(row.get(field) or 0) == 0.0)
                for field in ("PER", "PBR", "EPS", "BPS")
            ):
                cursor -= timedelta(days=1)
                continue
            return cursor, date_str, row
        cursor -= timedelta(days=1)
    raise StockAnalyzerError("재무 데이터를 찾을 수 없습니다.", status=404)


def _find_market_cap_row(
    ticker: str,
    reference_date: datetime,
    lookback: int = MAX_LOOKBACK_DAYS,
) -> Tuple[Optional[str], Optional[pd.Series]]:
    cursor = reference_date
    for _ in range(lookback):
        date_str = cursor.strftime("%Y%m%d")
        frame = stock.get_market_cap_by_ticker(date_str)
        if not frame.empty and ticker in frame.index:
            return date_str, frame.loc[ticker]
        cursor -= timedelta(days=1)
    return None, None


def _detect_market(ticker: str, reference_date: str) -> str:
    if ticker in _MARKET_CACHE:
        return _MARKET_CACHE[ticker]
    for market in ("KOSPI", "KOSDAQ", "KONEX"):
        try:
            tickers = stock.get_market_ticker_list(reference_date, market=market)
        except Exception:
            tickers = []
        if ticker in tickers:
            _MARKET_CACHE[ticker] = market
            return market
    _MARKET_CACHE[ticker] = "UNKNOWN"
    return "UNKNOWN"


def _collect_recent_trading_days(ticker: str, end_date: datetime, count: int) -> List[Tuple[datetime, str]]:
    days: List[Tuple[datetime, str]] = []
    cursor = end_date
    seen: set[str] = set()

    while len(days) < count:
        day, date_str, _frame = _find_market_date_for_ticker(ticker, cursor)
        if date_str not in seen:
            days.append((day, date_str))
            seen.add(date_str)
        cursor = day - timedelta(days=1)
    days.reverse()
    return days


class StockAnalyzer:
    """Implements each backend method consumed by the Vercel MCP bridge."""

    def dispatch(self, method: str, params: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        params = params or {}
        handlers = {
            "getMarketData": self.get_market_data,
            "getFinancialData": self.get_financial_data,
            "getTechnicalIndicators": self.get_technical_indicators,
            "getSupplyDemand": self.get_supply_demand,
            "searchTicker": self.search_ticker,
            "searchPeers": self.search_peers,
            "calculateDCF": self.calculate_dcf,
        }

        handler = handlers.get(method)
        if handler is None:
            return _error_response(404, f"Unknown method: {method}")

        try:
            data = handler(params)
            return _success_response(data)
        except StockAnalyzerError as exc:
            return _error_response(exc.status, str(exc), exc.detail if exc.detail else None)
        except Exception as exc:  # pragma: no cover - defensive catch
            return _error_response(
                500,
                "서버 내부 오류가 발생했습니다.",
                {
                    "exception": exc.__class__.__name__,
                    "traceback": traceback.format_exc(),
                },
            )

    # ------------------------------------------------------------------
    # Individual handlers

    def get_market_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        ticker = _require_ticker(params)
        end_dt, end_str, ohlcv_frame = _find_market_date_for_ticker(ticker)
        start_str = (end_dt - timedelta(days=RECENT_HISTORY_DAYS)).strftime("%Y%m%d")
        history = stock.get_market_ohlcv_by_date(start_str, end_str, ticker)
        if history.empty:
            raise StockAnalyzerError("시장 데이터를 찾지 못했습니다.", status=404)

        latest = history.iloc[-1]
        previous = history.iloc[-2] if len(history) > 1 else latest

        trading_value = _to_int(latest[COL_CLOSE] * latest[COL_VOLUME])
        market_cap_date, market_cap_row = _find_market_cap_row(ticker, end_dt)
        market_cap = _to_int(market_cap_row[COL_MARKET_CAP]) if market_cap_row is not None else None
        share_count = _to_int(market_cap_row[COL_SHARE_COUNT]) if market_cap_row is not None else None

        fifty_two_weeks = stock.get_market_ohlcv_by_date(
            (end_dt - timedelta(days=365)).strftime("%Y%m%d"),
            end_str,
            ticker,
        )
        high_52 = _to_int(fifty_two_weeks[COL_HIGH].max()) if not fifty_two_weeks.empty else _to_int(latest[COL_HIGH])
        low_52 = _to_int(fifty_two_weeks[COL_LOW].min()) if not fifty_two_weeks.empty else _to_int(latest[COL_LOW])

        change = _to_int(latest[COL_CLOSE] - previous[COL_CLOSE])
        change_pct = _safe_div(change, previous[COL_CLOSE], digits=2) if previous[COL_CLOSE] else None
        turnover = _safe_div(latest[COL_VOLUME], share_count, digits=2) if share_count else None

        market = _detect_market(ticker, end_str)

        return {
            "ticker": ticker,
            "market": market,
            "asOf": end_str,
            "close": _to_int(latest[COL_CLOSE]),
            "previousClose": _to_int(previous[COL_CLOSE]),
            "open": _to_int(latest[COL_OPEN]),
            "high": _to_int(latest[COL_HIGH]),
            "low": _to_int(latest[COL_LOW]),
            "volume": _to_int(latest[COL_VOLUME]),
            "tradingValue": trading_value,
            "change": change,
            "changePercent": change_pct,
            "turnoverPercent": turnover * 100 if turnover is not None else None,
            "marketCap": market_cap,
            "shareCount": share_count,
            "fiftyTwoWeek": {
                "high": high_52,
                "low": low_52,
            },
            "history": [
                {
                    "date": idx.strftime("%Y-%m-%d") if isinstance(idx, pd.Timestamp) else str(idx),
                    "close": _to_int(row[COL_CLOSE]),
                    "volume": _to_int(row[COL_VOLUME]),
                }
                for idx, row in history.tail(10).iterrows()
            ],
            "marketCapDate": market_cap_date,
        }

    def get_financial_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        ticker = _require_ticker(params)
        years = int(params.get("years", 1) or 1)
        as_of_dt, as_of_str, row = _find_fundamental_row(ticker)

        per = _to_float(row.get("PER"))
        pbr = _to_float(row.get("PBR"))
        eps = _to_float(row.get("EPS"), digits=2)
        bps = _to_float(row.get("BPS"), digits=2)
        div_yield = _to_float(row.get("DIV"))
        dps = _to_float(row.get("DPS"), digits=2)
        roe = _safe_div(pbr, per, digits=2)
        roe = roe * 100 if roe is not None else None

        snapshot: Dict[str, Any] = {
            "ticker": ticker,
            "asOf": as_of_str,
            "metrics": {
                "per": per,
                "pbr": pbr,
                "eps": eps,
                "bps": bps,
                "roe": roe,
                "dividendYield": div_yield,
                "dividendPerShare": dps,
            },
        }

        if years > 1:
            yearly: List[Dict[str, Any]] = []
            for offset in range(years):
                year = as_of_dt.year - offset
                target_dt = datetime(year, 12, 31)
                try:
                    _, year_str, year_row = _find_fundamental_row(ticker, reference_date=target_dt)
                except StockAnalyzerError:
                    continue
                yearly.append(
                    {
                        "year": year,
                        "per": _to_float(year_row.get("PER")),
                        "pbr": _to_float(year_row.get("PBR")),
                        "eps": _to_float(year_row.get("EPS"), digits=2),
                        "bps": _to_float(year_row.get("BPS"), digits=2),
                        "dividendYield": _to_float(year_row.get("DIV")),
                        "dividendPerShare": _to_float(year_row.get("DPS"), digits=2),
                        "asOf": year_str,
                    }
                )
            snapshot["yearly"] = yearly

        return snapshot

    def get_technical_indicators(self, params: Dict[str, Any]) -> Dict[str, Any]:
        ticker = _require_ticker(params)
        end_dt, end_str, _ = _find_market_date_for_ticker(ticker)
        start_str = (end_dt - timedelta(days=RECENT_HISTORY_DAYS * 6)).strftime("%Y%m%d")
        frame = stock.get_market_ohlcv_by_date(start_str, end_str, ticker)
        if len(frame) < 20:
            raise StockAnalyzerError("기술적 분석을 위한 데이터가 부족합니다.", status=422)

        closes = frame[COL_CLOSE].astype(float)
        highs = frame[COL_HIGH].astype(float)
        lows = frame[COL_LOW].astype(float)

        ma5 = _to_float(closes.tail(5).mean(), digits=0)
        ma20 = _to_float(closes.tail(20).mean(), digits=0)
        ma60 = _to_float(closes.tail(60).mean(), digits=0)

        deltas = closes.diff().fillna(0)
        gains = deltas.where(deltas > 0, 0.0)
        losses = (-deltas).where(deltas < 0, 0.0)
        avg_gain = gains.rolling(window=14).mean()
        avg_loss = losses.rolling(window=14).mean()
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        rsi_value = _to_float(rsi.iloc[-1])

        ema12 = closes.ewm(span=12, adjust=False).mean()
        ema26 = closes.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line

        sma20 = closes.rolling(window=20).mean()
        std20 = closes.rolling(window=20).std()
        upper_band = sma20 + (std20 * 2)
        lower_band = sma20 - (std20 * 2)

        lowest14 = lows.rolling(window=14).min()
        highest14 = highs.rolling(window=14).max()
        stochastic_k = (closes - lowest14) / (highest14 - lowest14) * 100
        stochastic_d = stochastic_k.rolling(window=3).mean()

        current_price = closes.iloc[-1]

        return {
            "ticker": ticker,
            "asOf": end_str,
            "price": _to_float(current_price, digits=0),
            "movingAverages": {
                "ma5": ma5,
                "ma20": ma20,
                "ma60": ma60,
            },
            "rsi14": rsi_value,
            "macd": {
                "line": _to_float(macd_line.iloc[-1]),
                "signal": _to_float(signal_line.iloc[-1]),
                "histogram": _to_float(histogram.iloc[-1]),
            },
            "bollinger": {
                "upper": _to_float(upper_band.iloc[-1], digits=0),
                "middle": _to_float(sma20.iloc[-1], digits=0),
                "lower": _to_float(lower_band.iloc[-1], digits=0),
            },
            "stochastic": {
                "k": _to_float(stochastic_k.iloc[-1]),
                "d": _to_float(stochastic_d.iloc[-1]),
            },
            "volatility": _safe_div(std20.iloc[-1], sma20.iloc[-1], digits=2),
        }

    def get_supply_demand(self, params: Dict[str, Any]) -> Dict[str, Any]:
        ticker = _require_ticker(params)
        days = int(params.get("days", RECENT_HISTORY_DAYS) or RECENT_HISTORY_DAYS)
        end_dt, end_str, _ = _find_market_date_for_ticker(ticker)
        start_str = (end_dt - timedelta(days=max(days, RECENT_HISTORY_DAYS))).strftime("%Y%m%d")
        market = _detect_market(ticker, end_str)
        if market == "UNKNOWN":
            raise StockAnalyzerError("시장 구분을 찾지 못했습니다.", status=404)

        net_amount: Dict[str, Optional[float]] = {}
        net_volume: Dict[str, Optional[int]] = {}
        for investor_label, key in INVESTOR_MAP.items():
            frame = stock.get_market_net_purchases_of_equities_by_ticker(start_str, end_str, market=market, investor=investor_label)
            if ticker not in frame.index:
                net_amount[key] = None
                net_volume[key] = None
                continue
            row = frame.loc[ticker]
            net_amount[key] = _to_float(row.get(COL_NET_AMOUNT, 0) / HUNDRED_MILLION)
            net_volume[key] = _to_int(row.get(COL_NET_VOLUME))

        recent_history: List[Dict[str, Any]] = []
        for day, day_str in _collect_recent_trading_days(ticker, end_dt, RECENT_DAILY_POINTS):
            entry = {"date": day.strftime("%Y-%m-%d")}
            for investor_label, key in INVESTOR_MAP.items():
                frame = stock.get_market_net_purchases_of_equities_by_ticker(day_str, day_str, market=market, investor=investor_label)
                if ticker in frame.index:
                    amount = frame.loc[ticker].get(COL_NET_AMOUNT, 0)
                    entry[key] = _to_float(amount / HUNDRED_MILLION)
                else:
                    entry[key] = None
            recent_history.append(entry)

        return {
            "ticker": ticker,
            "market": market,
            "period": {
                "from": start_str,
                "to": end_str,
            },
            "netAmountByInvestor": net_amount,
            "netVolumeByInvestor": net_volume,
            "recent": recent_history,
        }

    def search_ticker(self, params: Dict[str, Any]) -> Dict[str, Any]:
        query = _require_company_name(params)
        base_dt, base_str, _ = _find_market_date_for_ticker("005930")  # use Samsung as a liquid proxy
        cap_date = base_str
        cap_frame = stock.get_market_cap_by_ticker(cap_date)
        if cap_frame.empty:
            raise StockAnalyzerError("시가총액 데이터를 불러오지 못했습니다.", status=500)

        market_sets: Dict[str, set[str]] = {}
        for market in ("KOSPI", "KOSDAQ", "KONEX"):
            try:
                market_sets[market] = set(stock.get_market_ticker_list(cap_date, market=market))
            except Exception:
                market_sets[market] = set()

        normalized_query = "".join(ch for ch in query.lower() if ch.isalnum())
        query_words = [word for word in query.lower().split() if word]

        scored: List[Dict[str, Any]] = []
        for ticker in cap_frame.index:
            try:
                name = stock.get_market_ticker_name(ticker)
            except Exception:
                continue
            if not name:
                continue
            lower_name = name.lower()
            normalized_name = "".join(ch for ch in lower_name if ch.isalnum())

            score = 0
            if normalized_query and normalized_query == normalized_name:
                score = 1000
            elif query.replace(" ", "").lower() == name.replace(" ", "").lower():
                score = 900
            elif query.lower() in lower_name:
                score = 800
            elif normalized_query and normalized_query in normalized_name:
                score = 700
            elif query_words and all(word in lower_name for word in query_words):
                score = 600
            elif query_words:
                matches = sum(1 for word in query_words if word in lower_name)
                if matches:
                    score = 400 + matches * 50
            else:
                common = set(normalized_query) & set(normalized_name)
                if common:
                    score = max(score, int(len(common) / max(len(normalized_query), 1) * 100))

            if score == 0:
                continue

            market = "UNKNOWN"
            for market_name, tickers in market_sets.items():
                if ticker in tickers:
                    market = market_name
                    break

            scored.append(
                {
                    "ticker": ticker,
                    "name": name,
                    "market": market,
                    "marketCap": _to_int(cap_frame.loc[ticker][COL_MARKET_CAP]),
                    "price": _to_int(cap_frame.loc[ticker][COL_CLOSE]),
                    "score": score,
                }
            )

        scored.sort(key=lambda item: (item["score"], item["marketCap"] or 0), reverse=True)
        top_results = [
            {k: v for k, v in item.items() if k != "score"}
            for item in scored[:10]
        ]

        return {
            "query": query,
            "count": len(top_results),
            "results": top_results,
            "asOf": cap_date,
        }

    def search_peers(self, params: Dict[str, Any]) -> Dict[str, Any]:
        ticker = _require_ticker(params)
        end_dt, end_str, _ = _find_market_date_for_ticker(ticker)
        cap_date, cap_row = _find_market_cap_row(ticker, end_dt)
        if cap_row is None or cap_date is None:
            raise StockAnalyzerError("시가총액 정보를 찾지 못했습니다.", status=404)

        market = _detect_market(ticker, end_str)
        frame = stock.get_market_cap_by_ticker(cap_date)
        if frame.empty:
            raise StockAnalyzerError("시가총액 정보를 찾지 못했습니다.", status=404)

        if market != "UNKNOWN":
            try:
                tickers = set(stock.get_market_ticker_list(cap_date, market=market))
                frame = frame.loc[frame.index.intersection(tickers)]
            except Exception:
                pass

        frame = frame.copy()
        frame["marketCap"] = frame[COL_MARKET_CAP].astype(float)
        target_cap = frame.loc[ticker, "marketCap"]

        frame["capDiff"] = (frame["marketCap"] - target_cap).abs()
        frame = frame.drop(index=ticker)
        peers = frame.nsmallest(6, "capDiff")

        peer_list: List[Dict[str, Any]] = []
        for peer_ticker, row in peers.iterrows():
            try:
                name = stock.get_market_ticker_name(peer_ticker)
            except Exception:
                name = peer_ticker
            peer_list.append(
                {
                    "ticker": peer_ticker,
                    "name": name,
                    "price": _to_int(row[COL_CLOSE]),
                    "marketCap": _to_int(row[COL_MARKET_CAP]),
                }
            )

        return {
            "ticker": ticker,
            "market": market,
            "asOf": cap_date,
            "base": {
                "price": _to_int(cap_row[COL_CLOSE]),
                "marketCap": _to_int(cap_row[COL_MARKET_CAP]),
            },
            "peers": peer_list,
        }

    def calculate_dcf(self, params: Dict[str, Any]) -> Dict[str, Any]:
        ticker = _require_ticker(params)
        growth_rate = float(params.get("growth_rate", 10)) / 100
        discount_rate = float(params.get("discount_rate", 10)) / 100

        financial = self.get_financial_data({"ticker": ticker, "years": 3})
        market = self.get_market_data({"ticker": ticker})

        eps = financial["metrics"].get("eps") or 0
        if eps <= 0:
            raise StockAnalyzerError("EPS가 0 이하이므로 DCF를 계산할 수 없습니다.", status=422)

        projected = []
        for year in range(1, 6):
            value = eps * math.pow(1 + growth_rate, year)
            projected.append(value)

        discounted = [value / math.pow(1 + discount_rate, idx + 1) for idx, value in enumerate(projected)]
        pv_sum = sum(discounted)

        terminal_growth = 0.02
        terminal_value = projected[-1] * (1 + terminal_growth) / (discount_rate - terminal_growth)
        terminal_pv = terminal_value / math.pow(1 + discount_rate, len(projected))

        intrinsic_value = pv_sum + terminal_pv

        current_price = market.get("close") or 0
        if not current_price:
            raise StockAnalyzerError("현재가 정보를 찾지 못했습니다.", status=500)

        fair_value = intrinsic_value
        upside = ((fair_value - current_price) / current_price) * 100 if current_price else None

        recommendation = None
        if upside is not None:
            if upside >= 20:
                recommendation = "매수"
            elif upside >= 0:
                recommendation = "보유"
            else:
                recommendation = "매도"

        return {
            "ticker": ticker,
            "assumptions": {
                "growthRate": round(growth_rate * 100, 2),
                "discountRate": round(discount_rate * 100, 2),
                "terminalGrowth": terminal_growth * 100,
            },
            "projectedEPS": [round(val, 2) for val in projected],
            "discountedEPS": [round(val, 2) for val in discounted],
            "intrinsicValue": round(intrinsic_value, 2),
            "currentPrice": current_price,
            "fairValue": round(fair_value, 2),
            "upsidePercent": round(upside, 2) if upside is not None else None,
            "recommendation": recommendation,
        }


class Handler(BaseHTTPRequestHandler):  # pragma: no cover - executed in Vercel runtime
    analyzer = StockAnalyzer()

    def _write_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self._write_json(200, _success_response({}))

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get('Content-Length') or 0)
            raw = self.rfile.read(length).decode('utf-8')
            payload = json.loads(raw or '{}')
        except Exception:
            self._write_json(400, _error_response(400, "잘못된 JSON 요청입니다."))
            return

        method = payload.get('method')
        params = payload.get('params', {})
        result = self.analyzer.dispatch(method, params)
        status = result.get('status', 200)
        self._write_json(status, result)

    def log_message(self, *_args: Any, **_kwargs: Any) -> None:
        return
