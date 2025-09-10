import json
import traceback
from http.server import BaseHTTPRequestHandler
from pykrx import stock
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

class StockAnalyzer:
    def handle_request(self, method, params):
        """요청 처리"""
        try:
            if method == 'getMarketData':
                result = self.get_market_data(params.get('ticker'))
            elif method == 'getFinancialData':
                result = self.get_financial_data(params.get('ticker'), params.get('years', 1))
            elif method == 'getTechnicalIndicators':
                result = self.get_technical_indicators(params.get('ticker'))
            elif method == 'getSupplyDemand':
                result = self.get_supply_demand(params.get('ticker'))
            elif method == 'searchTicker':
                result = self.search_ticker(params.get('company_name'))
            elif method == 'searchPeers':
                result = self.search_peers(params.get('ticker'))
            else:
                result = {'error': f'Unknown method: {method}'}
            
            # 응답 전송
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            error_result = {'error': str(e), 'trace': traceback.format_exc()}
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_result).encode())
    
    def get_market_data(self, ticker):
        """시장 데이터 가져오기"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            end_str = end_date.strftime('%Y%m%d')
            start_str = start_date.strftime('%Y%m%d')
            
            # 30일 데이터 가져오기
            ohlcv = stock.get_market_ohlcv_by_date(start_str, end_str, ticker)
            
            if ohlcv.empty:
                return {'error': f'No data for ticker {ticker}'}
            
            # 최신 데이터
            latest = ohlcv.iloc[-1]
            # 이전 데이터
            prev = ohlcv.iloc[-2] if len(ohlcv) > 1 else latest
            
            # 52주 최고/최저 계산
            year_ago = end_date - timedelta(days=365)
            year_str = year_ago.strftime('%Y%m%d')
            year_data = stock.get_market_ohlcv_by_date(year_str, end_str, ticker)
            
            high_52w = year_data['고가'].max() if not year_data.empty else latest['고가']
            low_52w = year_data['저가'].min() if not year_data.empty else latest['저가']
            
            # 거래대금 계산 (백만원 단위)
            trading_value = int(latest['거래대금'] / 1000000)
            
            return {
                'ticker': ticker,
                'currentPrice': int(latest['종가']),
                'previousClose': int(prev['종가']),
                'change': int(latest['종가'] - prev['종가']),
                'changePercent': round((latest['종가'] - prev['종가']) / prev['종가'] * 100, 2),
                'open': int(latest['시가']),
                'high': int(latest['고가']),
                'low': int(latest['저가']),
                'volume': int(latest['거래량']),
                'tradingValue': trading_value,
                'high52w': int(high_52w),
                'low52w': int(low_52w),
                'marketCap': None  # 시가총액은 별도 API 필요
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def get_financial_data(self, ticker, years=1):
        """재무 데이터 가져오기"""
        try:
            end_date = datetime.now()
            end_str = end_date.strftime('%Y%m%d')
            
            # 최신 재무 데이터
            fundamental = stock.get_market_fundamental_by_ticker(end_str, market="ALL")
            
            if ticker not in fundamental.index:
                return {'error': f'No financial data for {ticker}'}
            
            fund = fundamental.loc[ticker]
            
            # PER이 0인 경우 (적자 기업) 실제 음수 PER 계산
            per_value = float(fund['PER']) if pd.notna(fund['PER']) else None
            eps_value = float(fund['EPS']) if pd.notna(fund['EPS']) else None
            bps_value = float(fund['BPS']) if pd.notna(fund['BPS']) else None
            
            # PER이 0이고 EPS가 음수인 경우 실제 PER 계산
            if per_value == 0 and eps_value and eps_value < 0:
                # 현재가 가져오기
                ohlcv = stock.get_market_ohlcv_by_date(end_str, end_str, ticker)
                if not ohlcv.empty:
                    current_price = float(ohlcv.iloc[0]['종가'])
                    per_value = current_price / eps_value  # 음수 PER
            
            # EPS가 0인 경우 이전 데이터에서 찾기
            if eps_value == 0 and per_value == 0 and bps_value > 0:
                # 최근 180일간 데이터에서 유효한 EPS 찾기
                check_date = end_date
                for i in range(180):
                    check_date = check_date - timedelta(days=1)
                    check_str = check_date.strftime('%Y%m%d')
                    try:
                        hist_fund = stock.get_market_fundamental_by_ticker(check_str, market="ALL")
                        if ticker in hist_fund.index:
                            hist_eps = float(hist_fund.loc[ticker, 'EPS'])
                            if hist_eps != 0:
                                eps_value = hist_eps
                                # 현재가로 PER 재계산
                                ohlcv = stock.get_market_ohlcv_by_date(end_str, end_str, ticker)
                                if not ohlcv.empty:
                                    current_price = float(ohlcv.iloc[0]['종가'])
                                    per_value = current_price / eps_value
                                break
                    except:
                        continue
            
            result = {
                'ticker': ticker,
                'per': per_value,
                'pbr': float(fund['PBR']) if pd.notna(fund['PBR']) else None,
                'eps': eps_value,
                'bps': bps_value,
                'div': float(fund['DIV']) if pd.notna(fund['DIV']) else 0.0,
                'dps': float(fund['DPS']) if pd.notna(fund['DPS']) else 0.0
            }
            
            # 연도별 데이터 추가 (요청 시)
            if years > 1:
                result['yearly'] = []
                for i in range(years):
                    year = end_date.year - i
                    year_end = datetime(year, 12, 31)
                    
                    # 주말인 경우 금요일로 조정
                    while year_end.weekday() > 4:
                        year_end = year_end - timedelta(days=1)
                    
                    year_str = year_end.strftime('%Y%m%d')
                    
                    try:
                        year_fund = stock.get_market_fundamental_by_ticker(year_str, market="ALL")
                        if ticker in year_fund.index:
                            fund = year_fund.loc[ticker]
                            
                            # PER 처리
                            per_value = float(fund['PER']) if pd.notna(fund['PER']) else None
                            eps_value = float(fund['EPS']) if pd.notna(fund['EPS']) else None
                            
                            # PER이 0이고 EPS가 음수인 경우
                            if per_value == 0 and eps_value and eps_value < 0:
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
            
            avg_gain = gains.rolling(window=14).mean()
            avg_loss = losses.rolling(window=14).mean()
            
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            current_rsi = rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50
            
            # 볼린저 밴드
            sma20 = ohlcv['종가'].rolling(window=20).mean()
            std20 = ohlcv['종가'].rolling(window=20).std()
            upper_band = sma20 + (std20 * 2)
            lower_band = sma20 - (std20 * 2)
            
            # 최근 값
            current_price = closes[-1]
            
            return {
                'ticker': ticker,
                'currentPrice': int(current_price),
                'ma5': int(ma5),
                'ma20': int(ma20),
                'ma60': int(ma60),
                'rsi14': round(current_rsi, 2),
                'bollingerUpper': int(upper_band.iloc[-1]) if not pd.isna(upper_band.iloc[-1]) else None,
                'bollingerMiddle': int(sma20.iloc[-1]) if not pd.isna(sma20.iloc[-1]) else None,
                'bollingerLower': int(lower_band.iloc[-1]) if not pd.isna(lower_band.iloc[-1]) else None,
                'volatility': round(std20.iloc[-1] / sma20.iloc[-1] * 100, 2) if not pd.isna(std20.iloc[-1]) else None
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def calculate_dcf(self, ticker, growth_rate=0.05, discount_rate=0.1):
        """DCF 가치평가"""
        try:
            # 재무 데이터 가져오기
            financial = self.get_financial_data(ticker, years=3)
            
            if 'error' in financial:
                return financial
            
            eps = financial.get('eps', 0)
            if not eps or eps <= 0:
                return {'error': 'Cannot calculate DCF with negative or zero EPS'}
            
            # FCF 추정 (EPS의 70% 가정)
            fcf = eps * 0.7
            
            # 5년간 FCF 예측
            projected_fcf = []
            for year in range(1, 6):
                fcf_year = fcf * ((1 + growth_rate) ** year)
                projected_fcf.append(fcf_year)
            
            # 터미널 가치 (영구 성장률 2% 가정)
            terminal_growth = 0.02
            terminal_value = projected_fcf[-1] * (1 + terminal_growth) / (discount_rate - terminal_growth)
            
            # 현재가치 계산
            pv_fcf = sum([fcf / ((1 + discount_rate) ** (i+1)) for i, fcf in enumerate(projected_fcf)])
            pv_terminal = terminal_value / ((1 + discount_rate) ** 5)
            
            # 적정 주가
            intrinsic_value = pv_fcf + pv_terminal
            
            # 현재가 가져오기
            market_data = self.get_market_data(ticker)
            current_price = market_data.get('currentPrice', 0)
            
            return {
                'ticker': ticker,
                'currentPrice': current_price,
                'intrinsicValue': int(intrinsic_value),
                'upside': round((intrinsic_value - current_price) / current_price * 100, 2) if current_price > 0 else None,
                'assumptions': {
                    'growthRate': f"{growth_rate*100}%",
                    'discountRate': f"{discount_rate*100}%",
                    'terminalGrowth': "2%"
                },
                'projectedFCF': [int(fcf) for fcf in projected_fcf],
                'terminalValue': int(terminal_value)
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def get_supply_demand(self, ticker):
        """수급 데이터 가져오기"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            end_str = end_date.strftime('%Y%m%d')
            start_str = start_date.strftime('%Y%m%d')
            
            # 투자자별 거래 데이터
            investor_data = stock.get_market_net_purchases_of_equities_by_ticker(start_str, end_str, ticker, "순매수금액")
            
            if investor_data.empty:
                return {'error': f'No supply/demand data for {ticker}'}
            
            # 최근 30일 합계 (억원 단위)
            foreign_sum = investor_data['외국인합계'].sum() / 100000000
            institution_sum = investor_data['기관합계'].sum() / 100000000
            individual_sum = investor_data['개인'].sum() / 100000000
            
            # 일별 데이터 (최근 10일)
            recent_data = investor_data.tail(10)
            daily_data = []
            
            for date, row in recent_data.iterrows():
                daily_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'foreign': round(row['외국인합계'] / 100000000, 2),
                    'institution': round(row['기관합계'] / 100000000, 2),
                    'individual': round(row['개인'] / 100000000, 2)
                })
            
            return {
                'ticker': ticker,
                'period': '30days',
                'summary': {
                    'foreign': round(foreign_sum, 2),
                    'institution': round(institution_sum, 2),
                    'individual': round(individual_sum, 2)
                },
                'daily': daily_data
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}
    
    def search_ticker(self, company_name):
        """종목명으로 종목코드 검색 - 유연한 매칭"""
        try:
            from datetime import datetime, timedelta
            import re
            
            # 어제 날짜
            end_date = (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
            
            # 시가총액 데이터 한 번만 가져오기
            cap_data = stock.get_market_cap_by_ticker(end_date)
            
            # 전체 종목 리스트
            all_tickers = []
            
            # KOSPI 종목
            kospi_tickers = stock.get_market_ticker_list(end_date, market="KOSPI")
            for ticker in kospi_tickers:
                name = stock.get_market_ticker_name(ticker)
                if ticker in cap_data.index:
                    all_tickers.append({
                        'ticker': ticker,
                        'name': name,
                        'market': 'KOSPI',
                        'marketCap': int(cap_data.loc[ticker, '시가총액'])
                    })
            
            # KOSDAQ 종목
            kosdaq_tickers = stock.get_market_ticker_list(end_date, market="KOSDAQ")
            for ticker in kosdaq_tickers:
                name = stock.get_market_ticker_name(ticker)
                if ticker in cap_data.index:
                    all_tickers.append({
                        'ticker': ticker,
                        'name': name,
                        'market': 'KOSDAQ',
                        'marketCap': int(cap_data.loc[ticker, '시가총액'])
                    })
            
            # 검색어 정규화
            query_normalized = re.sub(r'[^\w가-힣]', '', company_name.lower())
            query_words = company_name.lower().split()
            
            # 점수 기반 매칭
            scored_results = []
            
            for stock_info in all_tickers:
                name = stock_info['name']
                name_lower = name.lower()
                name_normalized = re.sub(r'[^\w가-힣]', '', name_lower)
                
                score = 0
                
                # 완전 일치
                if query_normalized == name_normalized:
                    score = 1000
                # 공백 제거 후 일치
                elif company_name.replace(' ', '').lower() == name.replace(' ', '').lower():
                    score = 900
                # 전체 쿼리가 이름에 포함
                elif company_name.lower() in name_lower:
                    score = 800
                # 이름이 쿼리에 포함 (짧은 이름 우선)
                elif name_lower in company_name.lower():
                    score = 700 - len(name)
                # 정규화된 쿼리가 정규화된 이름에 포함
                elif query_normalized in name_normalized:
                    score = 600
                # 정규화된 이름이 정규화된 쿼리에 포함
                elif name_normalized in query_normalized:
                    score = 500
                # 모든 쿼리 단어가 이름에 포함
                elif query_words and all(word in name_lower for word in query_words):
                    score = 400
                # 일부 쿼리 단어가 이름에 포함
                elif query_words:
                    matching_words = sum(1 for word in query_words if word in name_lower)
                    if matching_words > 0:
                        score = 200 + (matching_words * 50)
                
                # 문자 유사도 추가 점수 (편집 거리 기반)
                if score == 0:
                    # 간단한 문자 일치 비율
                    common_chars = set(query_normalized) & set(name_normalized)
                    if len(common_chars) > 0:
                        similarity = len(common_chars) / max(len(query_normalized), len(name_normalized))
                        if similarity > 0.5:  # 50% 이상 문자 일치
                            score = int(similarity * 100)
                
                if score > 0:
                    scored_results.append({
                        **stock_info,
                        'score': score
                    })
            
            # 점수와 시가총액으로 정렬
            scored_results.sort(key=lambda x: (x['score'], x['marketCap']), reverse=True)
            
            # 상위 10개만 반환
            top_results = scored_results[:10]
            
            # score 필드 제거
            results = [{k: v for k, v in item.items() if k != 'score'} for item in top_results]
            
            return {
                'query': company_name,
                'count': len(results),
                'results': results
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
                peers = []  # 빈 배열로 초기화
                
            # 같은 업종이 없거나 peers가 비어있으면 시가총액 유사 종목으로 대체
            if len(peers) == 0:
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
                
                peer_tickers = similar_caps.index[:10].tolist()  # 10개로 늘림
                
                for peer_ticker in peer_tickers:
                    try:
                        peer_info = similar_caps.loc[peer_ticker]
                        peers.append({
                            'ticker': peer_ticker,
                            'name': peer_info['종목명'],
                            'marketCap': int(peer_info['시가총액']),
                            'sector': peer_info['업종명']
                        })
                        if len(peers) >= 5:  # 5개 찾으면 중단
                            break
                    except:
                        continue
            
            # peers가 비어있으면 무조건 채우기 (전체 시장에서 시가총액 유사 종목)
            if len(peers) == 0:
                # 전체 시장 데이터 가져오기
                all_market = stock.get_market_cap_by_ticker(end_date)
                all_market = all_market[all_market.index != ticker]
                
                # 시가총액 차이로 정렬
                all_market['cap_diff'] = abs(all_market['시가총액'] - target_cap)
                all_market = all_market.sort_values('cap_diff').head(5)
                
                for peer_ticker in all_market.index:
                    try:
                        peers.append({
                            'ticker': peer_ticker,
                            'name': stock.get_market_ticker_name(peer_ticker),
                            'marketCap': int(all_market.loc[peer_ticker, '시가총액'])
                        })
                    except:
                        continue
            
            return {
                'mainTicker': ticker,
                'mainName': target_name,
                'mainSector': target_sector if 'target_sector' in locals() else 'N/A',
                'mainMarketCap': int(target_cap),
                'peers': peers,
                'method': 'sector_based' if len(same_sector) > 0 else 'market_cap_similarity'
            }
            
        except Exception as e:
            return {'error': str(e), 'trace': traceback.format_exc()}

def handler(request, response):
    """Vercel 핸들러"""
    if request.method == 'POST':
        body = json.loads(request.body)
        method = body.get('method')
        params = body.get('params', {})
        
        analyzer = StockAnalyzer()
        result = analyzer.handle_request(method, params)
        
        response.status_code = 200
        response.headers['Content-Type'] = 'application/json'
        return json.dumps(result)
    
    response.status_code = 405
    return json.dumps({'error': 'Method not allowed'})