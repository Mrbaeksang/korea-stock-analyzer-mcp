"""
한국 주식 데이터 수집 모듈 (Vercel Python Runtime)
"""

from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime, timedelta
from pykrx import stock
import traceback


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """POST 요청 처리"""
        try:
            # 요청 본문 읽기
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request = json.loads(post_data.decode('utf-8'))
            
            # 메서드별 처리
            method = request.get('method')
            params = request.get('params', {})
            
            if method == 'getMarketData':
                result = self.get_market_data(params.get('ticker'))
            elif method == 'getFinancialData':
                result = self.get_financial_data(params.get('ticker'))
            elif method == 'getTechnicalIndicators':
                result = self.get_technical_indicators(params.get('ticker'))
            elif method == 'getSupplyDemand':
                result = self.get_supply_demand(params.get('ticker'))
            elif method == 'searchPeers':
                result = self.search_peers(params.get('ticker'))
            else:
                result = {'error': f'Unknown method: {method}'}
            
            # 응답 전송
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def do_OPTIONS(self):
        """CORS preflight 처리"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def get_market_data(self, ticker):
        """시장 데이터 조회"""
        try:
            end_date = datetime.now()
            
            # 최근 거래일 찾기
            for i in range(7):
                check_date = (end_date - timedelta(days=i)).strftime('%Y%m%d')
                ohlcv = stock.get_market_ohlcv_by_date(check_date, check_date, ticker)
                if not ohlcv.empty:
                    end_str = check_date
                    break
            else:
                end_str = end_date.strftime('%Y%m%d')
            
            # OHLCV 데이터
            ohlcv = stock.get_market_ohlcv_by_date(end_str, end_str, ticker)
            if ohlcv.empty:
                return {'error': f'No data for ticker {ticker}'}
            
            # 시가총액
            cap = stock.get_market_cap_by_ticker(end_str)
            market_cap = int(cap.loc[ticker, '시가총액']) if ticker in cap.index else 0
            
            return {
                'currentPrice': int(ohlcv.iloc[0]['종가']),
                'volume': int(ohlcv.iloc[0]['거래량']),
                'open': int(ohlcv.iloc[0]['시가']),
                'high': int(ohlcv.iloc[0]['고가']),
                'low': int(ohlcv.iloc[0]['저가']),
                'marketCap': market_cap,
                'date': end_str
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def get_financial_data(self, ticker):
        """재무 데이터 조회"""
        try:
            end_date = datetime.now().strftime('%Y%m%d')
            
            # 펀더멘털 데이터
            fundamental = stock.get_market_fundamental_by_ticker(end_date, market="ALL")
            
            if ticker not in fundamental.index:
                return {'error': f'No fundamental data for {ticker}'}
            
            fund = fundamental.loc[ticker]
            
            return {
                'ticker': ticker,
                'per': float(fund['PER']) if fund['PER'] > 0 else None,
                'pbr': float(fund['PBR']) if fund['PBR'] > 0 else None,
                'eps': float(fund['EPS']) if fund['EPS'] > 0 else None,
                'bps': float(fund['BPS']) if fund['BPS'] > 0 else None,
                'div': float(fund['DIV']) if fund['DIV'] > 0 else None,
                'dps': float(fund['DPS']) if fund['DPS'] > 0 else None
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def get_technical_indicators(self, ticker):
        """기술적 지표 계산"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=100)
            
            end_str = end_date.strftime('%Y%m%d')
            start_str = start_date.strftime('%Y%m%d')
            
            # 100일 가격 데이터
            ohlcv = stock.get_market_ohlcv_by_date(start_str, end_str, ticker)
            
            if len(ohlcv) < 20:
                return {'error': 'Not enough data for technical analysis'}
            
            closes = ohlcv['종가'].values
            
            # 이동평균
            ma5 = closes[-5:].mean() if len(closes) >= 5 else closes[-1]
            ma20 = closes[-20:].mean() if len(closes) >= 20 else closes[-1]
            ma60 = closes[-60:].mean() if len(closes) >= 60 else closes[-1]
            
            # RSI 계산
            deltas = ohlcv['종가'].diff()
            gains = deltas.where(deltas > 0, 0)
            losses = -deltas.where(deltas < 0, 0)
            
            avg_gain = gains.rolling(14).mean()
            avg_loss = losses.rolling(14).mean()
            
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            rsi_value = rsi.iloc[-1] if not rsi.empty else 50
            
            # 볼린저 밴드
            std20 = closes[-20:].std() if len(closes) >= 20 else 0
            bb_upper = ma20 + (std20 * 2)
            bb_lower = ma20 - (std20 * 2)
            
            # 변동성
            returns = ohlcv['종가'].pct_change().dropna()
            volatility = returns.std() * (252 ** 0.5) * 100  # 연간 변동성
            
            return {
                'ma5': int(ma5),
                'ma20': int(ma20),
                'ma60': int(ma60),
                'rsi14': float(rsi_value),
                'bollingerUpper': int(bb_upper),
                'bollingerLower': int(bb_lower),
                'volatilityAnnual': float(volatility),
                'currentPrice': int(closes[-1])
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def get_supply_demand(self, ticker):
        """수급 데이터 조회"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=20)
            
            end_str = end_date.strftime('%Y%m%d')
            start_str = start_date.strftime('%Y%m%d')
            
            # 투자자별 거래 데이터
            investor = stock.get_market_trading_value_by_date(start_str, end_str, ticker, detail=True)
            
            if investor.empty:
                return {'error': 'No investor data available'}
            
            # 최근 누적 수급
            foreign_net = investor['외국인합계'].sum()
            institution_net = investor['기관합계'].sum()
            individual_net = investor['개인'].sum()
            
            # 최근 5일 데이터
            recent_5d = investor.tail(5)
            foreign_5d = recent_5d['외국인합계'].sum()
            institution_5d = recent_5d['기관합계'].sum()
            individual_5d = recent_5d['개인'].sum()
            
            return {
                'recent': {
                    'foreignNet': int(foreign_net),
                    'institutionNet': int(institution_net),
                    'individualNet': int(individual_net)
                },
                'fiveDays': {
                    'foreignNet': int(foreign_5d),
                    'institutionNet': int(institution_5d),
                    'individualNet': int(individual_5d)
                },
                'period': f'{start_str} ~ {end_str}'
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def search_peers(self, ticker):
        """동종업계 종목 찾기"""
        try:
            end_date = datetime.now().strftime('%Y%m%d')
            
            # 시가총액 데이터
            market_cap = stock.get_market_cap_by_ticker(end_date)
            
            if ticker not in market_cap.index:
                return {'error': f'Ticker {ticker} not found'}
            
            target_cap = market_cap.loc[ticker, '시가총액']
            
            # 시가총액 유사 종목 찾기
            if target_cap > 10000000000000:  # 10조원 이상
                min_ratio, max_ratio = 0.1, 10.0
            elif target_cap > 1000000000000:  # 1조원 이상
                min_ratio, max_ratio = 0.3, 3.0
            else:
                min_ratio, max_ratio = 0.5, 2.0
            
            similar_caps = market_cap[
                (market_cap['시가총액'] >= target_cap * min_ratio) & 
                (market_cap['시가총액'] <= target_cap * max_ratio) &
                (market_cap.index != ticker)
            ].sort_values('시가총액', ascending=False)
            
            # 상위 5개 종목
            peer_tickers = similar_caps.index[:5].tolist()
            
            # 종목명 가져오기
            peers = []
            for peer_ticker in peer_tickers:
                try:
                    name = stock.get_market_ticker_name(peer_ticker)
                    peers.append({
                        'ticker': peer_ticker,
                        'name': name,
                        'marketCap': int(similar_caps.loc[peer_ticker, '시가총액'])
                    })
                except:
                    continue
            
            return {
                'mainTicker': ticker,
                'mainMarketCap': int(target_cap),
                'peers': peers,
                'method': 'market_cap_similarity'
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}