/**
 * 재무 데이터 관련 타입 정의
 */

export interface FinancialData {
  날짜?: string;
  year?: number;
  per: number;
  pbr: number;
  eps: number;
  bps: number;
  div: number;
}

export interface GrowthMetrics {
  epsGrowth1y?: number;
  epsGrowth3yCagr?: number | null;
  revenueGrowthEst?: number;
  profitGrowthEst?: number;
  earningsMomentum?: 'Positive' | 'Negative' | 'Neutral';
}

export interface EfficiencyMetrics {
  roe: number;
  roa?: number;
  roaEst?: number;
  profitMarginEst?: number;
  operatingMarginEst?: number;
  assetTurnoverEst?: number;
}

export interface RiskMetrics {
  dailyVolatility?: number;
  annualVolatility?: number;
  volatilityAnnual?: number;
  maxDrawdown: number;
  beta: number;
  sharpeRatio: number;
  var95?: number;
  cvar95?: number;
  debtToEquityEst?: number;
  currentRatioEst?: number;
  interestCoverageEst?: number;
}