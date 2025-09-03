/**
 * 분석 결과 관련 타입 정의
 */

import { MarketData, TechnicalIndicators, SupplyDemandData } from './market.types.js';
import { FinancialData, GrowthMetrics, EfficiencyMetrics, RiskMetrics } from './financial.types.js';

export interface GuruAnalysis {
  fairValue: number;
  method: string;
  margin?: number;
  marginOfSafety?: number;
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  score?: number;
  details?: Record<string, any>;
}

export interface BuffettAnalysis extends GuruAnalysis {
  roe: number;
  avgPer: number;
  avgEps: number;
  qualityScore: number;
  debtToEquity?: number;
  fcf?: number;
  fcfYield?: number;
  netMargin?: number;
  grossMargin?: number;
  currentRatio?: number;
  retainedEarningsGrowth?: number;
}

export interface LynchAnalysis extends GuruAnalysis {
  category: string;
  growthRate: number;
  pegRatio: number;
  fairPer: number;
  dividendAdjustedPEG?: number;
  salesGrowthRate?: number;
  debtToEquity?: number;
  inventoryTurnover?: number;
  lynchScore?: number;
}

export interface GrahamAnalysis extends GuruAnalysis {
  ncavPerShare?: number;
  netNetValue?: number;
  grahamNumber?: number;
  liquidationValue?: number;
  earningsValue?: number;
  revisedGrahamValue?: number;
  defensiveCriteriaMet: string;
  enterprisingCriteriaMet?: string;
  ncavMargin?: number;
  grahamScore?: number;
  defensiveCriteria?: Record<string, boolean>;
  enterprisingCriteria?: Record<string, boolean>;
}

export interface GreenblattAnalysis extends GuruAnalysis {
  roic: number;
  earningsYield: number;
  magicScore: number;
  adjustedROIC?: number;
  fcfYield?: number;
  roicRank?: number;
  earningsYieldRank?: number;
  combinedRank?: number;
  qualityScore?: number;
  consistentProfitability?: boolean;
  capitalEfficiency?: boolean;
  comprehensiveScore?: number;
  investmentGrade?: string;
  upside?: number;
}

export interface FisherAnalysis extends GuruAnalysis {
  checklistPoints: number;
  checklistPercentage: number;
  checklist: Record<string, boolean>;
  salesGrowthRate?: number;
  earningsGrowthRate?: number;
  researchIntensity?: number;
  managementQuality?: number;
  innovationScore?: number;
  competitiveAdvantageScore?: number;
  longTermPotentialScore?: number;
  fisherScore?: number;
  investmentGrade?: string;
  upside?: number;
}

export interface TempletonAnalysis extends GuruAnalysis {
  pricePosition52Week: number;
  pessimismScore: number;
  contrarianIndicators: Record<string, boolean>;
  globalRelativeValue?: number;
  crisisOpportunityScore?: number;
  valueTrapRisk?: number;
  marketCyclePhase?: string;
  entryTimingScore?: number;
  buyZoneActive?: boolean;
  templetonScore?: number;
  investmentThesis?: string;
  upside?: number;
}

export interface ComprehensiveValuation {
  weightedAverage: number;
  median: number;
  conservative: number;
  optimistic: number;
  currentPrice: number;
  upsideWeighted: number;
  upsideMedian: number;
  upsideConservative: number;
  upsideOptimistic: number;
}

export interface AnalysisResult {
  ticker: string;
  companyName: string;
  analysisDate: string;
  marketData: any;
  financialData: any;
  technicalIndicators: any;
  valuations: {
    buffett?: BuffettAnalysis;
    lynch?: LynchAnalysis;
    graham?: GrahamAnalysis;
    greenblatt?: GreenblattAnalysis;
    fisher?: FisherAnalysis;
    templeton?: TempletonAnalysis;
  };
  comprehensiveValuation?: ComprehensiveValuation;
  growthMetrics?: GrowthMetrics;
  efficiencyMetrics?: EfficiencyMetrics;
  riskMetrics?: RiskMetrics;
  supplyDemand?: SupplyDemandData;
}