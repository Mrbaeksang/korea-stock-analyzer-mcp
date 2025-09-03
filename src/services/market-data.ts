/**
 * 시장 데이터 수집 서비스
 */

import { PythonExecutor } from './python-executor.js';
import { MarketData, TechnicalIndicators } from '../types/index.js';

export class MarketDataService {
  /**
   * 전체 시장 데이터 수집
   */
  static async fetch(ticker: string): Promise<MarketData> {
    const pythonCode = `
from pykrx import stock
from datetime import datetime, timedelta
import json

ticker = '${ticker}'
end_date = datetime.now()
start_5y = end_date - timedelta(days=365*5)
end_str = end_date.strftime('%Y%m%d')
start_5y_str = start_5y.strftime('%Y%m%d')

# 5년 가격 데이터
ohlcv_5y = stock.get_market_ohlcv_by_date(start_5y_str, end_str, ticker)

if len(ohlcv_5y) > 0:
    latest = ohlcv_5y.iloc[-1]
    year_ago = ohlcv_5y.iloc[-252] if len(ohlcv_5y) > 252 else ohlcv_5y.iloc[0]
    three_year_ago = ohlcv_5y.iloc[-252*3] if len(ohlcv_5y) > 252*3 else ohlcv_5y.iloc[0]
    
    # 시가총액
    cap = stock.get_market_cap_by_ticker(end_str)
    market_cap = int(cap.loc[ticker, '시가총액']) if ticker in cap.index else 0
    shares = int(cap.loc[ticker, '상장주식수']) if ticker in cap.index else 0
    
    if market_cap == 0 and shares > 0:
        market_cap = int(latest['종가']) * shares
    
    result = {
        'currentPrice': int(latest['종가']),
        'yearAgoPrice': int(year_ago['종가']),
        'threeYearAgoPrice': int(three_year_ago['종가']),
        'yearReturn': float((latest['종가'] - year_ago['종가']) / year_ago['종가'] * 100),
        'threeYearReturn': float((latest['종가'] - three_year_ago['종가']) / three_year_ago['종가'] * 100),
        'volume': int(latest['거래량']),
        'avgVolume20d': int(ohlcv_5y['거래량'].tail(20).mean()),
        'avgVolume60d': int(ohlcv_5y['거래량'].tail(60).mean()),
        'high52w': int(ohlcv_5y['고가'].tail(252).max()),
        'low52w': int(ohlcv_5y['저가'].tail(252).min()),
        'highAllTime': int(ohlcv_5y['고가'].max()),
        'lowAllTime': int(ohlcv_5y['저가'].min()),
        'marketCap': market_cap,
        'shares': shares,
        'freeFloatRatio': 0.7
    }
    
    # YTD 수익률
    if len(ohlcv_5y[ohlcv_5y.index.year == end_date.year]) > 0:
        year_start = ohlcv_5y[ohlcv_5y.index.year == end_date.year].iloc[0]['종가']
        result['ytdReturn'] = float((latest['종가'] - year_start) / year_start * 100)
    else:
        result['ytdReturn'] = 0
        
    print(json.dumps(result, ensure_ascii=False))
else:
    print(json.dumps({}, ensure_ascii=False))
`;

    return await PythonExecutor.execute(pythonCode);
  }

  /**
   * 기본 시장 데이터만 수집 (빠른 조회용)
   */
  static async fetchBasic(ticker: string): Promise<any> {
    const pythonCode = `
from pykrx import stock
from datetime import datetime, timedelta
import json

ticker = '${ticker}'
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
if not ohlcv.empty:
    result = {
        'currentPrice': int(ohlcv.iloc[0]['종가']),
        'volume': int(ohlcv.iloc[0]['거래량'])
    }
    
    # 시가총액
    cap = stock.get_market_cap_by_date(end_str, end_str, ticker)
    if not cap.empty:
        result['marketCap'] = int(cap.iloc[0]['시가총액'])
    
    print(json.dumps(result, ensure_ascii=False))
else:
    print(json.dumps({}, ensure_ascii=False))
`;

    return await PythonExecutor.execute(pythonCode);
  }

  /**
   * 기술적 지표 계산
   */
  static async fetchTechnicalIndicators(ticker: string): Promise<TechnicalIndicators> {
    const pythonCode = `
from pykrx import stock
from datetime import datetime, timedelta
import json
import numpy as np

ticker = '${ticker}'
end_date = datetime.now()
start_date = end_date - timedelta(days=365)
end_str = end_date.strftime('%Y%m%d')
start_str = start_date.strftime('%Y%m%d')

ohlcv = stock.get_market_ohlcv_by_date(start_str, end_str, ticker)

if len(ohlcv) > 0:
    # 이동평균
    ma5 = ohlcv['종가'].rolling(window=5).mean().iloc[-1]
    ma20 = ohlcv['종가'].rolling(window=20).mean().iloc[-1]
    ma60 = ohlcv['종가'].rolling(window=60).mean().iloc[-1]
    ma120 = ohlcv['종가'].rolling(window=120).mean().iloc[-1] if len(ohlcv) >= 120 else None
    ma200 = ohlcv['종가'].rolling(window=200).mean().iloc[-1] if len(ohlcv) >= 200 else None
    
    # RSI
    delta = ohlcv['종가'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs)).iloc[-1]
    
    # MACD
    exp1 = ohlcv['종가'].ewm(span=12, adjust=False).mean()
    exp2 = ohlcv['종가'].ewm(span=26, adjust=False).mean()
    macd = exp1 - exp2
    signal = macd.ewm(span=9, adjust=False).mean()
    macd_histogram = macd - signal
    
    # 볼린저 밴드
    sma20 = ohlcv['종가'].rolling(window=20).mean().iloc[-1]
    std20 = ohlcv['종가'].rolling(window=20).std().iloc[-1]
    upper_band = sma20 + (std20 * 2)
    lower_band = sma20 - (std20 * 2)
    
    # 변동성
    returns = ohlcv['종가'].pct_change()
    volatility_daily = returns.std()
    volatility_annual = volatility_daily * np.sqrt(252) * 100
    
    # Sharpe Ratio
    avg_return = returns.mean() * 252
    sharpe_ratio = (avg_return - 0.03) / (volatility_daily * np.sqrt(252)) if volatility_daily > 0 else 0
    
    # Max Drawdown
    cumulative = (1 + returns).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    max_drawdown = drawdown.min() * 100
    
    # Beta 계산 (KOSPI 대비)
    try:
        # KOSPI 데이터 가져오기
        kospi = stock.get_index_ohlcv_by_date(
            (end_date - pd.Timedelta(days=365)).strftime('%Y%m%d'),
            end_date.strftime('%Y%m%d'),
            "1001"  # KOSPI 코드
        )
        if len(kospi) > 0:
            kospi_returns = kospi['종가'].pct_change().dropna()
            stock_returns = returns.dropna()
            
            # 날짜 정렬 및 매칭
            common_dates = stock_returns.index.intersection(kospi_returns.index)
            if len(common_dates) > 30:
                stock_aligned = stock_returns[common_dates]
                kospi_aligned = kospi_returns[common_dates]
                
                # 베타 계산 = Cov(stock, market) / Var(market)
                covariance = np.cov(stock_aligned, kospi_aligned)[0][1]
                market_variance = np.var(kospi_aligned)
                beta = covariance / market_variance if market_variance > 0 else 1.0
            else:
                beta = 1.0
        else:
            beta = 1.0
    except:
        beta = 1.0  # 계산 실패 시 기본값
    
    result = {
        'ma5': int(ma5),
        'ma20': int(ma20),
        'ma60': int(ma60),
        'ma120': int(ma120) if ma120 else None,
        'ma200': int(ma200) if ma200 else None,
        'rsi14': round(rsi, 2),
        'macd': round(macd.iloc[-1], 2),
        'macdSignal': round(signal.iloc[-1], 2),
        'macdHistogram': round(macd_histogram.iloc[-1], 2),
        'bollingerUpper': int(upper_band),
        'bollingerMiddle': int(sma20),
        'bollingerLower': int(lower_band),
        'volatilityDaily': round(volatility_daily * 100, 2),
        'volatilityAnnual': round(volatility_annual, 2),
        'sharpeRatio': round(sharpe_ratio, 2),
        'maxDrawdown': round(max_drawdown, 2),
        'beta': round(beta, 2)
    }
    
    print(json.dumps(result, ensure_ascii=False))
else:
    print(json.dumps({}, ensure_ascii=False))
`;

    return await PythonExecutor.execute(pythonCode);
  }
}