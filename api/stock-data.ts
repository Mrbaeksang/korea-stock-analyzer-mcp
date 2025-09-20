import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.KOREA_STOCK_ANALYZER_API ?? 'https://korea-stock-analyzer-mcp.vercel.app';

interface PythonSuccess<T> {
  success: true;
  status: number;
  data: T;
}

interface PythonFailure {
  success: false;
  status: number;
  error?: {
    message?: string;
    detail?: unknown;
  };
}

type PythonResponse<T> = PythonSuccess<T> | PythonFailure;

type InvestorKey = 'foreign' | 'institution' | 'individual';

export interface MarketSnapshot {
  ticker: string;
  market: string;
  asOf: string;
  close: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  tradingValue: number | null;
  change: number | null;
  changePercent: number | null;
  turnoverPercent: number | null;
  marketCap: number | null;
  shareCount: number | null;
  fiftyTwoWeek: {
    high: number | null;
    low: number | null;
  };
  history: Array<{ date: string; close: number | null; volume: number | null }>;
  marketCapDate?: string | null;
}

export interface FinancialSnapshot {
  ticker: string;
  asOf: string;
  metrics: {
    per: number | null;
    pbr: number | null;
    eps: number | null;
    bps: number | null;
    roe: number | null;
    dividendYield: number | null;
    dividendPerShare: number | null;
  };
  yearly?: Array<{
    year: number;
    per: number | null;
    pbr: number | null;
    eps: number | null;
    bps: number | null;
    dividendYield: number | null;
    dividendPerShare: number | null;
    asOf: string;
  }>;
}

export interface TechnicalSnapshot {
  ticker: string;
  asOf: string;
  price: number | null;
  movingAverages: {
    ma5: number | null;
    ma20: number | null;
    ma60: number | null;
  };
  rsi14: number | null;
  macd: {
    line: number | null;
    signal: number | null;
    histogram: number | null;
  };
  bollinger: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
  stochastic: {
    k: number | null;
    d: number | null;
  };
  volatility: number | null;
}

export interface SupplyDemandSnapshot {
  ticker: string;
  market: string;
  period: {
    from: string;
    to: string;
  };
  netAmountByInvestor: Record<InvestorKey, number | null>;
  netVolumeByInvestor: Record<InvestorKey, number | null>;
  recent: Array<{
    date: string;
    foreign: number | null;
    institution: number | null;
    individual: number | null;
  }>;
}

export interface TickerSuggestion {
  ticker: string;
  name: string;
  market: string;
  marketCap: number | null;
  price: number | null;
}

export interface TickerSearchResult {
  query: string;
  count: number;
  results: TickerSuggestion[];
  asOf: string;
}

export interface PeerComparison {
  ticker: string;
  market: string;
  asOf: string;
  base: {
    price: number | null;
    marketCap: number | null;
  };
  peers: Array<{
    ticker: string;
    name: string;
    price: number | null;
    marketCap: number | null;
  }>;
}

export interface DCFValuation {
  ticker: string;
  assumptions: {
    growthRate: number;
    discountRate: number;
    terminalGrowth: number;
  };
  projectedEPS: number[];
  discountedEPS: number[];
  intrinsicValue: number;
  currentPrice: number;
  fairValue: number;
  upsidePercent: number | null;
  recommendation: string | null;
}

interface ErrorResult {
  ticker: string;
  error: string;
}

async function callPythonAPI<T>(method: string, params: Record<string, unknown>): Promise<T> {
  try {
    const { data } = await axios.post<PythonResponse<T>>(
      `${BASE_URL}/api/stock_data`,
      { method, params },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000,
      }
    );

    if ((data as PythonFailure).success === false) {
      const failure = data as PythonFailure;
      const message = failure.error?.message ?? `Python backend error (${method})`;
      const error = new Error(message);
      (error as any).detail = failure.error?.detail;
      throw error;
    }

    return (data as PythonSuccess<T>).data;
  } catch (err) {
    const message = normalizeAxiosError(err);
    throw new Error(message);
  }
}

function normalizeAxiosError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<PythonResponse<unknown>>;
    const responseData = axiosError.response?.data;
    if (responseData && (responseData as PythonFailure).success === false) {
      const failure = responseData as PythonFailure;
      if (failure.error?.message) {
        return failure.error.message;
      }
    }
    if (axiosError.code === 'ECONNABORTED') {
      return 'Python 백엔드 응답이 지연되었습니다.';
    }
    return axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
}

export async function getMarketData(ticker: string): Promise<MarketSnapshot | ErrorResult> {
  try {
    return await callPythonAPI<MarketSnapshot>('getMarketData', { ticker });
  } catch (error) {
    console.error('getMarketData error:', error);
    return { ticker, error: (error as Error).message };
  }
}

export async function getFinancialData(ticker: string, years = 1): Promise<FinancialSnapshot | ErrorResult> {
  try {
    return await callPythonAPI<FinancialSnapshot>('getFinancialData', { ticker, years });
  } catch (error) {
    console.error('getFinancialData error:', error);
    return { ticker, error: (error as Error).message };
  }
}

export async function getTechnicalIndicators(ticker: string): Promise<TechnicalSnapshot | ErrorResult> {
  try {
    return await callPythonAPI<TechnicalSnapshot>('getTechnicalIndicators', { ticker });
  } catch (error) {
    console.error('getTechnicalIndicators error:', error);
    return { ticker, error: (error as Error).message };
  }
}

export async function getSupplyDemand(ticker: string, days = 30): Promise<SupplyDemandSnapshot | ErrorResult> {
  try {
    return await callPythonAPI<SupplyDemandSnapshot>('getSupplyDemand', { ticker, days });
  } catch (error) {
    console.error('getSupplyDemand error:', error);
    return { ticker, error: (error as Error).message };
  }
}

export async function searchTicker(companyName: string): Promise<TickerSearchResult | { error: string }> {
  try {
    return await callPythonAPI<TickerSearchResult>('searchTicker', { company_name: companyName });
  } catch (error) {
    console.error('searchTicker error:', error);
    return { error: (error as Error).message };
  }
}

export async function searchPeers(ticker: string): Promise<PeerComparison | ErrorResult> {
  try {
    return await callPythonAPI<PeerComparison>('searchPeers', { ticker });
  } catch (error) {
    console.error('searchPeers error:', error);
    return { ticker, error: (error as Error).message };
  }
}

export async function calculateDCF(
  ticker: string,
  growthRate?: number,
  discountRate?: number,
): Promise<DCFValuation | ErrorResult> {
  try {
    return await callPythonAPI<DCFValuation>('calculateDCF', { ticker, growth_rate: growthRate, discount_rate: discountRate });
  } catch (error) {
    console.error('calculateDCF error:', error);
    return { ticker, error: (error as Error).message };
  }
}

export async function searchNews(_ticker: string, _days?: number): Promise<any[]> {
  return [];
}
