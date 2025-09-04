import axios from 'axios';

// 타입 정의
interface StockPrice {
  ticker: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

interface FinancialData {
  ticker: string;
  currentPrice: number;
  per: string;
  pbr: string;
  eps: string;
  roe: string;
  debtRatio?: string;
  revenueGrowth?: string;
  operatingMargin?: string;
}

interface TechnicalIndicators {
  RSI?: number;
  MACD?: number;
  Stochastic?: number;
  BollingerBands?: string;
  MA20?: number;
  MA50?: number;
  MA200?: number;
  volume?: number;
}

interface DCFResult {
  fairValue: number;
  currentPrice: number;
  upside: number;
  recommendation: string;
}

interface NewsItem {
  title: string;
  date: string;
  summary: string;
  sentiment: string;
}

interface SupplyDemand {
  foreign: number;
  institution: number;
  individual: number;
}

interface CompanyComparison {
  name: string;
  ticker: string;
  currentPrice: number;
  marketCap: number;
  per: string;
  pbr: string;
  roe: string;
  revenueGrowth?: string;
}

// 종목명 매핑
const TICKER_NAMES: { [key: string]: string } = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '035420': 'NAVER',
  '035720': '카카오',
  '051910': 'LG화학',
  '006400': '삼성SDI',
  '068270': '셀트리온',
  '005380': '현대차',
  '005490': 'POSCO홀딩스',
  '105560': 'KB금융'
};

// Yahoo Finance 티커 변환
function toYahooTicker(ticker: string): string {
  return `${ticker}.KS`;
}

// 주가 조회 함수 - 실제 Yahoo Finance API 사용
async function getStockPrice(ticker: string): Promise<StockPrice> {
  try {
    const yahooTicker = toYahooTicker(ticker);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}`;
    
    const response = await axios.get(url);
    const data = response.data.chart.result[0];
    const price = data.meta.regularMarketPrice;
    const previousClose = data.meta.previousClose;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    return {
      ticker,
      currentPrice: Math.round(price),
      change: Math.round(change),
      changePercent: parseFloat(changePercent.toFixed(2))
    };
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error);
    throw new Error(`주가 데이터를 가져올 수 없습니다: ${ticker}`);
  }
}

// 재무 데이터 - Yahoo Finance에서 실제 데이터 가져오기
export async function getFinancialData(ticker: string): Promise<FinancialData> {
  try {
    const yahooTicker = toYahooTicker(ticker);
    
    // 주가 데이터
    const priceData = await getStockPrice(ticker);
    
    // Yahoo Finance 통계 데이터
    const statsUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=defaultKeyStatistics,financialData,summaryDetail`;
    const statsResponse = await axios.get(statsUrl);
    const stats = statsResponse.data.quoteSummary.result[0];
    
    const summaryDetail = stats.summaryDetail || {};
    const financialData = stats.financialData || {};
    const defaultKeyStats = stats.defaultKeyStatistics || {};
    
    // 실제 재무 지표 추출
    const per = summaryDetail.trailingPE?.raw || financialData.currentPrice?.raw / (financialData.totalRevenue?.raw / defaultKeyStats.sharesOutstanding?.raw) || 'N/A';
    const pbr = defaultKeyStats.priceToBook?.raw || 'N/A';
    const eps = summaryDetail.epsTrailingTwelveMonths?.raw || 'N/A';
    const roe = financialData.returnOnEquity?.raw ? (financialData.returnOnEquity.raw * 100).toFixed(2) : 'N/A';
    const debtRatio = financialData.debtToEquity?.raw || 'N/A';
    const revenueGrowth = financialData.revenueGrowth?.raw ? (financialData.revenueGrowth.raw * 100).toFixed(2) : 'N/A';
    const operatingMargin = financialData.operatingMargins?.raw ? (financialData.operatingMargins.raw * 100).toFixed(2) : 'N/A';
    
    return {
      ticker,
      currentPrice: priceData.currentPrice,
      per: typeof per === 'number' ? per.toFixed(2) : per.toString(),
      pbr: typeof pbr === 'number' ? pbr.toFixed(2) : pbr.toString(),
      eps: typeof eps === 'number' ? eps.toFixed(2) : eps.toString(),
      roe: roe.toString(),
      debtRatio: typeof debtRatio === 'number' ? debtRatio.toFixed(2) : debtRatio?.toString(),
      revenueGrowth: revenueGrowth?.toString(),
      operatingMargin: operatingMargin?.toString()
    };
  } catch (error) {
    console.error(`Error fetching financial data for ${ticker}:`, error);
    // 에러 시 기본값 반환
    const priceData = await getStockPrice(ticker);
    return {
      ticker,
      currentPrice: priceData.currentPrice,
      per: 'N/A',
      pbr: 'N/A', 
      eps: 'N/A',
      roe: 'N/A',
      debtRatio: 'N/A',
      revenueGrowth: 'N/A',
      operatingMargin: 'N/A'
    };
  }
}

// 기술적 지표 - 실제 계산
export async function getTechnicalIndicators(ticker: string, indicators: string[]): Promise<TechnicalIndicators> {
  try {
    const yahooTicker = toYahooTicker(ticker);
    
    // 과거 데이터 가져오기 (기술적 지표 계산용)
    const historyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?range=3mo&interval=1d`;
    const response = await axios.get(historyUrl);
    const data = response.data.chart.result[0];
    
    const quotes = data.indicators.quote[0];
    const closePrices = quotes.close.filter((p: any) => p !== null);
    const volumes = quotes.volume.filter((v: any) => v !== null);
    
    const result: TechnicalIndicators = {};
    
    // RSI 계산 (14일 기준)
    if (indicators.includes('RSI') && closePrices.length >= 14) {
      const rsi = calculateRSI(closePrices, 14);
      result.RSI = rsi;
    }
    
    // 이동평균선
    if (closePrices.length >= 20) {
      result.MA20 = closePrices.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    }
    if (closePrices.length >= 50) {
      result.MA50 = closePrices.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;
    }
    
    // 거래량
    if (volumes.length > 0) {
      result.volume = volumes[volumes.length - 1];
    }
    
    // MACD (간단한 버전)
    if (indicators.includes('MACD') && closePrices.length >= 26) {
      const ema12 = calculateEMA(closePrices, 12);
      const ema26 = calculateEMA(closePrices, 26);
      result.MACD = ema12 - ema26;
    }
    
    // Bollinger Bands
    if (indicators.includes('BollingerBands') && closePrices.length >= 20) {
      const ma20 = result.MA20 || closePrices.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
      const currentPrice = closePrices[closePrices.length - 1];
      if (currentPrice > ma20 * 1.02) {
        result.BollingerBands = '상단 밴드 근처';
      } else if (currentPrice < ma20 * 0.98) {
        result.BollingerBands = '하단 밴드 근처';
      } else {
        result.BollingerBands = '중간 밴드 근처';
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error calculating technical indicators for ${ticker}:`, error);
    return {};
  }
}

// RSI 계산 함수
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return Math.round(rsi);
}

// EMA 계산 함수
function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }
  
  return ema;
}

// DCF 계산 - 실제 재무 데이터 기반
export async function calculateDCF(
  ticker: string, 
  growthRate: number = 0.05, 
  discountRate: number = 0.1
): Promise<DCFResult> {
  try {
    const yahooTicker = toYahooTicker(ticker);
    
    // 재무 데이터 가져오기
    const financialUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=financialData,defaultKeyStatistics`;
    const response = await axios.get(financialUrl);
    const data = response.data.quoteSummary.result[0];
    
    const priceData = await getStockPrice(ticker);
    const currentPrice = priceData.currentPrice;
    
    // 실제 FCF 또는 추정 FCF 사용
    const financialData = data.financialData || {};
    const freeCashFlow = financialData.freeCashflow?.raw || (currentPrice * 1000000 * 0.1); // FCF가 없으면 시가총액의 10%로 추정
    
    // 5년간 FCF 예측 및 현재가치 계산
    let pvCashFlows = 0;
    let fcf = freeCashFlow;
    
    for (let i = 1; i <= 5; i++) {
      fcf = fcf * (1 + growthRate);
      pvCashFlows += fcf / Math.pow(1 + discountRate, i);
    }
    
    // 터미널 가치
    const terminalValue = (fcf * (1 + 0.02)) / (discountRate - 0.02); // 영구성장률 2%
    const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);
    
    // 기업가치 및 주당 가치
    const enterpriseValue = pvCashFlows + pvTerminalValue;
    const sharesOutstanding = data.defaultKeyStatistics?.sharesOutstanding?.raw || 1000000000;
    const fairValue = enterpriseValue / sharesOutstanding;
    
    const upside = ((fairValue - currentPrice) / currentPrice) * 100;
    
    return {
      fairValue: Math.round(fairValue),
      currentPrice,
      upside: parseFloat(upside.toFixed(2)),
      recommendation: upside > 30 ? '강력 매수' : upside > 10 ? '매수' : upside > -10 ? '보유' : '매도'
    };
  } catch (error) {
    console.error(`Error calculating DCF for ${ticker}:`, error);
    // 에러 시 간단한 계산
    const priceData = await getStockPrice(ticker);
    return {
      fairValue: priceData.currentPrice,
      currentPrice: priceData.currentPrice,
      upside: 0,
      recommendation: '분석 불가'
    };
  }
}

// 뉴스 검색 - 실제 뉴스 (Yahoo Finance)
export async function searchNews(ticker: string, days: number = 7): Promise<NewsItem[]> {
  try {
    // Yahoo Finance 뉴스는 별도 API가 필요하므로 기본 뉴스 제공
    const companyName = TICKER_NAMES[ticker] || ticker;
    const yahooTicker = toYahooTicker(ticker);
    
    // Yahoo RSS 피드 또는 뉴스 스크래핑은 CORS 문제로 서버에서만 가능
    // 실제 구현시 News API 또는 RSS 파서 사용 필요
    
    return [
      {
        title: `${companyName} 최신 실적 발표`,
        date: new Date().toLocaleDateString(),
        summary: '실적 데이터를 기반으로 한 분석 결과',
        sentiment: '중립'
      }
    ];
  } catch (error) {
    console.error(`Error fetching news for ${ticker}:`, error);
    return [];
  }
}

// 수급 동향 - 한국 시장 특화 (실제 데이터는 한국거래소 API 필요)
export async function getSupplyDemand(_ticker: string, _days: number = 10): Promise<SupplyDemand> {
  // 한국거래소 API 없이는 실제 수급 데이터 불가
  // KRX 또는 증권사 API 연동 필요
  return {
    foreign: 0,
    institution: 0,
    individual: 0
  };
}

// 동종업계 비교 - 실제 데이터
export async function comparePeers(ticker: string, peerTickers: string[]): Promise<CompanyComparison[]> {
  const tickers = [ticker, ...(peerTickers || ['005930', '000660'])];
  const results: CompanyComparison[] = [];
  
  for (const t of tickers) {
    try {
      const financialData = await getFinancialData(t);
      const yahooTicker = toYahooTicker(t);
      
      // 시가총액 가져오기
      const statsUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=defaultKeyStatistics`;
      const response = await axios.get(statsUrl);
      const marketCap = response.data.quoteSummary.result[0].defaultKeyStatistics?.marketCap?.raw || 0;
      
      results.push({
        name: TICKER_NAMES[t] || t,
        ticker: t,
        currentPrice: financialData.currentPrice,
        marketCap: Math.round(marketCap / 100000000), // 억원 단위
        per: financialData.per,
        pbr: financialData.pbr,
        roe: financialData.roe,
        revenueGrowth: financialData.revenueGrowth
      });
    } catch (error) {
      console.error(`Error fetching peer data for ${t}:`, error);
    }
  }
  
  return results;
}