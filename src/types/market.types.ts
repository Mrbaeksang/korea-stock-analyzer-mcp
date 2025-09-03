/**
 * 시장 데이터 관련 타입 정의
 */

export interface MarketData {
  ticker: string;
  companyName: string;
  currentPrice: number;
  yearAgoPrice: number;
  threeYearAgoPrice: number;
  yearReturn: number;
  threeYearReturn: number;
  ytdReturn: number;
  volume: number;
  avgVolume20d: number;
  avgVolume60d: number;
  high52w: number;
  low52w: number;
  highAllTime: number;
  lowAllTime: number;
  marketCap: number;
  shares: number;
  freeFloatRatio: number;
}

export interface SupplyDemandData {
  foreign5d: number;
  foreign20d: number;
  foreign60d: number;
  institution5d: number;
  institution20d: number;
  institution60d: number;
  individual5d: number;
  individual20d: number;
  individual60d: number;
}

export interface TechnicalIndicators {
  ma5: number;
  ma20: number;
  ma60: number;
  ma120?: number;
  ma200?: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  volatilityDaily: number;
  volatilityAnnual: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
}