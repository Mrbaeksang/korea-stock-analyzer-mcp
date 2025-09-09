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
                result = self.get_financial_data(params.get('ticker'), params.get('years', 1))
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
    
    def get_financial_data(self, ticker, years=1):
        """재무 데이터 조회 (년도별 추이 지원)"""
        try:
            import pandas as pd
            
            if years == 1:
                # 기존 로직: 최신 데이터만
                end_date = datetime.now()
                
                # 최근 거래일 찾기 (주말/공휴일 대응)
                for i in range(7):
                    check_date = (end_date - timedelta(days=i)).strftime('%Y%m%d')
                    try:
                        fundamental = stock.get_market_fundamental_by_ticker(check_date, market="ALL")
                        if not fundamental.empty and ticker in fundamental.index:
                            fund = fundamental.loc[ticker]
                            
                            # PER과 EPS 값 가져오기
                            per_value = float(fund['PER']) if pd.notna(fund['PER']) else None
                            eps_value = float(fund['EPS']) if pd.notna(fund['EPS']) else None
                            
                            # EPS가 0이고 PER도 0인 경우 - 데이터 문제 또는 적자
                            # BPS가 있으면 데이터는 있는 것이므로 적자로 판단
                            if eps_value == 0 and per_value == 0:
                                bps_value = float(fund['BPS']) if pd.notna(fund['BPS']) else 0
                                if bps_value > 0:
                                    # BPS가 있으면 실제 적자 상황
                                    # 이전 분기 EPS 데이터 찾기 시도
                                    try:
                                        # 최근 180일 데이터에서 EPS가 0이 아닌 마지막 값 찾기
                                        start_date = (datetime.strptime(check_date, '%Y%m%d') - timedelta(days=180)).strftime('%Y%m%d')
                                        hist_fund = stock.get_market_fundamental_by_date(start_date, check_date, ticker)
                                        hist_fund = hist_fund[hist_fund['EPS'] != 0]
                                        if not hist_fund.empty:
                                            last_eps = float(hist_fund.iloc[-1]['EPS'])
                                            if last_eps < 0:
                                                # 이전에도 적자였음
                                                eps_value = last_eps
                                                ohlcv = stock.get_market_ohlcv_by_date(check_date, check_date, ticker)
                                                if not ohlcv.empty:
                                                    current_price = float(ohlcv.iloc[0]['종가'])
                                                    per_value = current_price / eps_value
                                            else:
                                                # 이전엔 흑자였는데 지금 적자 전환
                                                per_value = None  # 적자 전환 시 PER 계산 불가
                                                eps_value = None
                                        else:
                                            # 과거 데이터도 없음
                                            eps_value = None
                                            per_value = None
                                    except:
                                        eps_value = None
                                        per_value = None
                                else:
                                    # BPS도 0이면 데이터 자체가 없음
                                    eps_value = None
                                    per_value = None
                            # PER이 0이고 EPS가 음수면 실제 음수 PER 계산
                            elif per_value == 0 and eps_value and eps_value < 0:
                                # 현재가 가져오기
                                ohlcv = stock.get_market_ohlcv_by_date(check_date, check_date, ticker)
                                if not ohlcv.empty:
                                    current_price = float(ohlcv.iloc[0]['종가'])
                                    per_value = current_price / eps_value  # 음수 PER
                            
                            return {
                                'ticker': ticker,
                                'per': per_value,
                                'pbr': float(fund['PBR']) if pd.notna(fund['PBR']) else None,
                                'eps': eps_value,
                                'bps': float(fund['BPS']) if pd.notna(fund['BPS']) else None,
                                'div': float(fund['DIV']) if pd.notna(fund['DIV']) else 0.0,
                                'dps': float(fund['DPS']) if pd.notna(fund['DPS']) else 0.0
                            }
                    except:
                        continue
            else:
                # 여러 년도 데이터
                result = {'ticker': ticker, 'yearly': []}
                end_date = datetime.now()
                
                for year_offset in range(years):
                    if year_offset == 0:
                        # 현재 년도는 최신 데이터 사용
                        year = end_date.year
                        year_end = end_date.strftime('%Y%m%d')
                        year_start = (end_date - timedelta(days=10)).strftime('%Y%m%d')
                    else:
                        # 과거 년도는 12월 말 기준
                        year = end_date.year - year_offset
                        year_end = f"{year}1231"
                        year_start = f"{year}1220"
                    
                    try:
                        fundamental = stock.get_market_fundamental_by_date(year_start, year_end, ticker)
                        if not fundamental.empty:
                            # 마지막 거래일 데이터
                            fund = fundamental.iloc[-1]
                            
                            per_value = float(fund['PER']) if pd.notna(fund['PER']) else None
                            eps_value = float(fund['EPS']) if pd.notna(fund['EPS']) else None
                            
                            # EPS가 0이면 이전 데이터 사용 시도 (데이터 문제 해결)
                            if eps_value == 0 and per_value == 0:
                                bps_value = float(fund['BPS']) if pd.notna(fund['BPS']) else 0
                                if bps_value > 0:
                                    # BPS가 있으면 데이터는 있지만 EPS가 0인 상황
                                    # 이전 유효한 EPS 찾기
                                    try:
                                        start_search = f"{year}0101"
                                        hist = stock.get_market_fundamental_by_date(start_search, year_end, ticker)
                                        hist = hist[hist['EPS'] != 0]
                                        if not hist.empty:
                                            eps_value = float(hist.iloc[-1]['EPS'])
                                            if eps_value < 0:
                                                year_ohlcv = stock.get_market_ohlcv_by_date(year_end, year_end, ticker)
                                                if not year_ohlcv.empty:
                                                    year_price = float(year_ohlcv.iloc[0]['종가'])
                                                    per_value = year_price / eps_value
                                    except:
                                        pass
                            # PER이 0이고 EPS가 음수면 실제 음수 PER 계산  
                            elif per_value == 0 and eps_value and eps_value < 0:
                                # 현재가 가져오기 (yearly 데이터는 해당 년도 말 기준)
                                year_ohlcv = stock.get_market_ohlcv_by_date(year_end, year_end, ticker)
                                if not year_ohlcv.empty:
                                    year_price = float(year_ohlcv.iloc[0]['종가'])
                                    per_value = year_price / eps_value  # 음수 PER
                            
                            result['yearly'].append({
                                'year': year,
                                'per': per_value,
                                'pbr': float(fund['PBR']) if pd.notna(fund['PBR']) else None,
                                'eps': eps_value,
                                'bps': float(fund['BPS']) if pd.notna(fund['BPS']) else None,
                                'div': float(fund['DIV']) if pd.notna(fund['DIV']) else 0.0
                            })
                    except Exception as e:
                        print(f"Error for year {year}: {str(e)}")
                        continue
                
                return result
            
            return {'error': f'No fundamental data for {ticker}'}
            
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
            
            # 최근 거래일 찾기
            for i in range(10):  # 더 많은 날짜 탐색
                check_date = (end_date - timedelta(days=i))
                end_str = check_date.strftime('%Y%m%d')
                start_date = check_date - timedelta(days=30)  # 더 긴 기간
                start_str = start_date.strftime('%Y%m%d')
                
                try:
                    # 투자자별 순매수대금 데이터
                    investor = stock.get_market_trading_value_by_date(start_str, end_str, ticker)
                    
                    if not investor.empty and len(investor) > 0:
                        # NaN 값을 0으로 처리
                        investor = investor.fillna(0)
                        
                        # 실제 컬럼 확인
                        columns = investor.columns.tolist()
                        
                        # 기본값
                        foreign_net = 0
                        institution_net = 0
                        individual_net = 0
                        
                        # pykrx 컬럼명: 기관합계, 기타법인, 개인, 외국인합계, 전체
                        if '외국인합계' in columns:
                            foreign_net = investor['외국인합계'].sum()
                        elif '외국인' in columns:
                            foreign_net = investor['외국인'].sum()
                            
                        if '기관합계' in columns:
                            institution_net = investor['기관합계'].sum()
                        elif '기관' in columns:
                            institution_net = investor['기관'].sum()
                            
                        if '개인' in columns:
                            individual_net = investor['개인'].sum()
                        
                        # 최근 5일 데이터
                        recent_5d = investor.tail(5) if len(investor) >= 5 else investor
                        
                        foreign_5d = 0
                        institution_5d = 0
                        individual_5d = 0
                        
                        if '외국인합계' in columns:
                            foreign_5d = recent_5d['외국인합계'].sum()
                        elif '외국인' in columns:
                            foreign_5d = recent_5d['외국인'].sum()
                            
                        if '기관합계' in columns:
                            institution_5d = recent_5d['기관합계'].sum()
                        elif '기관' in columns:
                            institution_5d = recent_5d['기관'].sum()
                            
                        if '개인' in columns:
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
                            'period': f'{start_str} ~ {end_str}',
                            'dataPoints': len(investor)
                        }
                except Exception as e:
                    # 더 구체적인 에러 로깅
                    print(f"Error for date {end_str}: {str(e)}")
                    continue
            
            # 데이터가 없는 경우 0으로 반환
            return {
                'recent': {
                    'foreignNet': 0,
                    'institutionNet': 0,
                    'individualNet': 0
                },
                'fiveDays': {
                    'foreignNet': 0,
                    'institutionNet': 0,
                    'individualNet': 0
                },
                'period': 'No data available'
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def search_peers(self, ticker):
        """동종업계 종목 찾기 (업종 기반)"""
        try:
            # 어제 날짜 사용
            end_date = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
            
            # 업종 정보와 시가총액 가져오기 (KOSPI 먼저 시도, 없으면 KOSDAQ)
            try:
                sector_data = stock.get_market_sector_classifications(end_date, market="KOSPI")
                if ticker not in sector_data.index:
                    # KOSDAQ 시도
                    sector_data = stock.get_market_sector_classifications(end_date, market="KOSDAQ")
                    if ticker not in sector_data.index:
                        return {'error': f'Ticker {ticker} not found'}
            except Exception as e:
                # 에러 시 시가총액 기반으로 fallback
                print(f"Sector classification failed: {e}, using market cap method")
                market_cap = stock.get_market_cap_by_ticker(end_date)
                if ticker not in market_cap.index:
                    return {'error': f'Ticker {ticker} not found'}
                
                target_cap = market_cap.loc[ticker, '시가총액']
                target_name = stock.get_market_ticker_name(ticker)
                
                # 시가총액 유사 종목
                if target_cap > 10000000000000:
                    min_ratio, max_ratio = 0.1, 10.0
                elif target_cap > 1000000000000:
                    min_ratio, max_ratio = 0.3, 3.0
                else:
                    min_ratio, max_ratio = 0.5, 2.0
                
                similar = market_cap[
                    (market_cap['시가총액'] >= target_cap * min_ratio) & 
                    (market_cap['시가총액'] <= target_cap * max_ratio) &
                    (market_cap.index != ticker)
                ].sort_values('시가총액', ascending=False).head(5)
                
                peers = []
                for peer_ticker in similar.index:
                    peers.append({
                        'ticker': peer_ticker,
                        'name': stock.get_market_ticker_name(peer_ticker),
                        'marketCap': int(similar.loc[peer_ticker, '시가총액'])
                    })
                
                return {
                    'mainTicker': ticker,
                    'mainName': target_name,
                    'mainMarketCap': int(target_cap),
                    'peers': peers,
                    'method': 'market_cap_similarity'
                }
            
            # 대상 종목 정보
            target_info = sector_data.loc[ticker]
            target_sector = target_info['업종명']
            target_cap = target_info['시가총액']
            target_name = target_info['종목명']
            
            # 같은 업종 종목들 찾기
            same_sector = sector_data[
                (sector_data['업종명'] == target_sector) & 
                (sector_data.index != ticker)
            ]
            
            # 시가총액 기준 정렬
            if len(same_sector) > 0:
                # 시가총액 차이 계산
                same_sector['cap_diff'] = abs(same_sector['시가총액'] - target_cap)
                same_sector = same_sector.sort_values('cap_diff')
                
                # 상위 5개 선택
                peer_tickers = same_sector.index[:5].tolist()
                
                peers = []
                for peer_ticker in peer_tickers:
                    try:
                        peer_info = same_sector.loc[peer_ticker]
                        peers.append({
                            'ticker': peer_ticker,
                            'name': peer_info['종목명'],
                            'marketCap': int(peer_info['시가총액'])
                        })
                    except:
                        continue
            else:
                # 같은 업종이 없으면 시가총액 유사 종목으로 대체
                if target_cap > 10000000000000:  # 10조원 이상
                    min_ratio, max_ratio = 0.1, 10.0
                elif target_cap > 1000000000000:  # 1조원 이상
                    min_ratio, max_ratio = 0.3, 3.0
                else:
                    min_ratio, max_ratio = 0.5, 2.0
                
                similar_caps = sector_data[
                    (sector_data['시가총액'] >= target_cap * min_ratio) & 
                    (sector_data['시가총액'] <= target_cap * max_ratio) &
                    (sector_data.index != ticker)
                ].sort_values('시가총액', ascending=False)
                
                peer_tickers = similar_caps.index[:5].tolist()
                
                peers = []
                for peer_ticker in peer_tickers:
                    try:
                        peer_info = similar_caps.loc[peer_ticker]
                        peers.append({
                            'ticker': peer_ticker,
                            'name': peer_info['종목명'],
                            'marketCap': int(peer_info['시가총액']),
                            'sector': peer_info['업종명']  # 다른 업종임을 표시
                        })
                    except:
                        continue
            
            return {
                'mainTicker': ticker,
                'mainName': target_name,
                'mainSector': target_sector,
                'mainMarketCap': int(target_cap),
                'peers': peers,
                'method': 'sector_based' if len(same_sector) > 0 else 'market_cap_similarity'
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}