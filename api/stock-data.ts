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

// 주가 조회 함수
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
    // 폴백 데이터
    return {
      ticker,
      currentPrice: 50000 + Math.floor(Math.random() * 50000),
      change: Math.floor(Math.random() * 2000) - 1000,
      changePercent: parseFloat((Math.random() * 10 - 5).toFixed(2))
    };
  }
}

// 재무 데이터
export async function getFinancialData(ticker: string): Promise<FinancialData> {
  const priceData = await getStockPrice(ticker);
  
  // 간단한 추정값 (실제로는 Yahoo Finance API에서 가져와야 함)
  const eps = priceData.currentPrice / 15;
  const per = 15;
  const pbr = 1.2;
  const roe = (pbr / per) * 100;
  
  return {
    ticker,
    currentPrice: priceData.currentPrice,
    per: per.toFixed(2),
    pbr: pbr.toFixed(2),
    eps: eps.toFixed(0),
    roe: roe.toFixed(2),
    debtRatio: (50 + Math.random() * 50).toFixed(2),
    revenueGrowth: (5 + Math.random() * 15).toFixed(2),
    operatingMargin: (10 + Math.random() * 20).toFixed(2)
  };
}

// 기술적 지표
export async function getTechnicalIndicators(_ticker: string, indicators: string[]): Promise<TechnicalIndicators> {
  const result: TechnicalIndicators = {};
  
  // 간단한 랜덤 값 생성 (실제로는 계산 로직 필요)
  if (indicators.includes('RSI')) {
    result.RSI = Math.floor(30 + Math.random() * 40);
  }
  if (indicators.includes('MACD')) {
    result.MACD = parseFloat((Math.random() * 10 - 5).toFixed(2));
  }
  if (indicators.includes('Stochastic')) {
    result.Stochastic = Math.floor(20 + Math.random() * 60);
  }
  if (indicators.includes('BollingerBands')) {
    result.BollingerBands = '중간 밴드 근처';
  }
  
  return result;
}

// DCF 계산
export async function calculateDCF(
  ticker: string, 
  growthRate: number = 0.05, 
  discountRate: number = 0.1
): Promise<DCFResult> {
  const priceData = await getStockPrice(ticker);
  const currentPrice = priceData.currentPrice;
  
  // 간단한 DCF 모델
  const cashFlow = currentPrice * 0.1;
  const terminalValue = (cashFlow * (1 + growthRate)) / (discountRate - growthRate);
  const fairValue = terminalValue * 0.9; // 할인
  
  const upside = ((fairValue - currentPrice) / currentPrice) * 100;
  
  return {
    fairValue: Math.round(fairValue),
    currentPrice,
    upside: parseFloat(upside.toFixed(2)),
    recommendation: upside > 20 ? '강력 매수' : upside > 0 ? '매수' : '매도'
  };
}

// 뉴스 검색
export async function searchNews(ticker: string, _days: number = 7): Promise<NewsItem[]> {
  const companyName = TICKER_NAMES[ticker] || ticker;
  
  // 더미 뉴스 데이터
  const newsItems: NewsItem[] = [
    {
      title: `${companyName}, 실적 전망 상향 조정`,
      date: new Date().toLocaleDateString(),
      summary: '애널리스트들이 실적 전망을 상향 조정했습니다.',
      sentiment: '긍정'
    },
    {
      title: `${companyName}, 신규 투자 계획 발표`,
      date: new Date(Date.now() - 86400000).toLocaleDateString(),
      summary: '대규모 시설 투자 계획을 발표했습니다.',
      sentiment: '긍정'
    },
    {
      title: `${companyName}, 시장 점유율 확대`,
      date: new Date(Date.now() - 172800000).toLocaleDateString(),
      summary: '주요 사업 부문에서 시장 점유율이 확대되었습니다.',
      sentiment: '긍정'
    }
  ];
  
  return newsItems;
}

// 수급 동향
export async function getSupplyDemand(_ticker: string, _days: number = 10): Promise<SupplyDemand> {
  // 실제로는 API에서 가져와야 하지만, 더미 데이터 사용
  return {
    foreign: parseFloat((Math.random() * 200 - 100).toFixed(2)),
    institution: parseFloat((Math.random() * 150 - 75).toFixed(2)),
    individual: parseFloat((Math.random() * -100 - 50).toFixed(2))
  };
}

// 동종업계 비교
export async function comparePeers(ticker: string, peerTickers: string[]): Promise<CompanyComparison[]> {
  const tickers = [ticker, ...(peerTickers || ['005930', '000660'])];
  const results: CompanyComparison[] = [];
  
  for (const t of tickers) {
    const priceData = await getStockPrice(t);
    const financialData = await getFinancialData(t);
    
    results.push({
      name: TICKER_NAMES[t] || t,
      ticker: t,
      currentPrice: priceData.currentPrice,
      marketCap: Math.floor(priceData.currentPrice * 1000000),
      per: financialData.per,
      pbr: financialData.pbr,
      roe: financialData.roe,
      revenueGrowth: financialData.revenueGrowth
    });
  }
  
  return results;
}