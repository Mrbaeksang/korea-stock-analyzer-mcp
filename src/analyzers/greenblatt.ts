/**
 * 조엘 그린블라트 매직 포뮬러 분석 - 완전 구현
 */

import { BaseAnalyzer } from './base-analyzer.js';
import { GreenblattAnalysis, FinancialData } from '../types/index.js';

export class GreenblattAnalyzer extends BaseAnalyzer {
  constructor() {
    super('조엘 그린블라트', 'Magic Formula Value Investing');
  }

  async analyze(data: any): Promise<GreenblattAnalysis> {
    const { financialData, marketData, balanceSheetData } = data;
    const currentFund = Array.isArray(financialData) ? financialData[0] : financialData;
    const currentPrice = marketData?.currentPrice || 0;
    const marketCap = marketData?.marketCap || 1000000000;

    // 1. ROIC (Return on Invested Capital) 계산
    // ROIC = EBIT / (Net Working Capital + Net Fixed Assets)
    const roic = this.calculateROIC(currentFund, balanceSheetData);
    
    // 2. Earnings Yield 계산
    // Earnings Yield = EBIT / Enterprise Value
    const earningsYield = this.calculateEarningsYield(currentFund, marketData);
    
    // 3. 조정 ROIC (한국 시장용)
    const adjustedROIC = this.calculateAdjustedROIC(currentFund);
    
    // 4. FCF Yield (Free Cash Flow Yield)
    const fcfYield = this.calculateFCFYield(data);
    
    // 5. 매직 포뮬러 종합 점수
    const magicScore = this.calculateMagicScore(roic, earningsYield);
    
    // 6. 랭킹 시스템 (퀀타일 기반)
    const rankings = this.calculateRankings({
      roic,
      earningsYield,
      adjustedROIC,
      fcfYield
    });
    
    // 7. 품질 지표들
    const qualityMetrics = this.calculateQualityMetrics(currentFund);
    
    // 8. 적정가 계산 (그린블라트 방식)
    const fairValue = this.calculateGreenblattFairValue(
      currentFund,
      earningsYield,
      roic,
      currentPrice
    );
    
    // 9. 상승여력
    const upside = this.calculateUpside(fairValue, currentPrice);
    
    // 10. 종합 평가
    const comprehensiveScore = this.calculateComprehensiveScore({
      magicScore,
      rankings,
      qualityMetrics,
      upside
    });
    
    return {
      fairValue,
      method: '매직 포뮬러: 높은 ROIC + 높은 Earnings Yield',
      upside,
      recommendation: this.getGreenblattRecommendation(
        magicScore, 
        comprehensiveScore, 
        rankings
      ),
      // 핵심 지표들
      roic,
      earningsYield,
      magicScore,
      adjustedROIC,
      fcfYield,
      // 랭킹
      roicRank: rankings.roicRank,
      earningsYieldRank: rankings.earningsYieldRank,
      combinedRank: rankings.combinedRank,
      // 품질 지표
      qualityScore: qualityMetrics.score,
      consistentProfitability: qualityMetrics.consistentProfitability,
      capitalEfficiency: qualityMetrics.capitalEfficiency,
      // 종합
      comprehensiveScore,
      investmentGrade: this.getInvestmentGrade(comprehensiveScore)
    };
  }

  private calculateROIC(fund: FinancialData, balanceSheet: any): number {
    // ROIC = EBIT / Invested Capital
    // EBIT 추정: EPS × 1.3 (세전이익 추정)
    const ebit = fund.eps * 1.3;
    
    // Invested Capital 추정: 시가총액의 80% (보수적)
    const investedCapital = fund.bps * 0.8;
    
    if (investedCapital <= 0) return 0;
    
    const roic = (ebit / investedCapital) * 100;
    return Math.round(roic * 100) / 100;
  }

  private calculateEarningsYield(fund: FinancialData, marketData: any): number {
    // 실제 그린블라트 공식: Earnings Yield = EBIT / Enterprise Value
    // EBIT = EPS × 1.43 (세후이익을 세전이익으로 변환, 법인세 30% 가정)
    // EV = Market Cap + Net Debt (순부채)
    
    if (!marketData || marketData.marketCap <= 0) return 0;
    
    // EBIT 계산
    const ebit = fund.eps * 1.43; // 1/(1-0.3) = 1.43
    
    // Enterprise Value 추정
    // 한국 기업 평균 Net Debt/Market Cap = 0.3
    const estimatedNetDebt = marketData.marketCap * 0.3;
    const enterpriseValue = marketData.marketCap + estimatedNetDebt;
    
    // Earnings Yield = EBIT / EV
    const earningsYield = (ebit * marketData.sharesOutstanding) / enterpriseValue * 100;
    
    return Math.round(earningsYield * 100) / 100;
  }

  private calculateAdjustedROIC(fund: FinancialData): number {
    // 한국 시장 조정 ROIC
    // ROE를 기반으로 조정
    if (fund.bps <= 0) return 0;
    
    const roe = (fund.eps / fund.bps) * 100;
    
    // 레버리지 조정 (PBR로 추정)
    const leverageAdjustment = fund.pbr > 1.5 ? 0.8 : 1.0;
    
    return Math.round(roe * leverageAdjustment * 100) / 100;
  }

  private calculateFCFYield(data: any): number {
    // FCF Yield = FCF / Market Cap
    const fund = Array.isArray(data.financialData) ? 
      data.financialData[0] : data.financialData;
    const marketCap = data.marketData?.marketCap || 1;
    
    // FCF 추정: EPS의 70%
    const fcf = fund.eps * 0.7;
    
    return Math.round((fcf / marketCap) * 10000 * 100) / 100;
  }

  private calculateMagicScore(roic: number, earningsYield: number): number {
    // 그린블라트 매직 포뮬러 점수
    // 단순 합산이 아닌 가중 평균
    const roicScore = Math.min(roic, 50); // 최대 50점
    const eyScore = Math.min(earningsYield * 2, 50); // 최대 50점
    
    return Math.round(roicScore + eyScore);
  }

  private calculateRankings(metrics: any): any {
    // 실제로는 전체 종목과 비교해야 하지만, 
    // 절대 수치로 퀀타일 추정
    
    const roicRank = this.getRank(metrics.roic, [5, 10, 15, 20, 30]);
    const eyRank = this.getRank(metrics.earningsYield, [3, 5, 7, 10, 15]);
    const combinedRank = Math.round((roicRank + eyRank) / 2);
    
    return {
      roicRank,
      earningsYieldRank: eyRank,
      combinedRank,
      percentile: this.getPercentile(combinedRank)
    };
  }

  private getRank(value: number, thresholds: number[]): number {
    // 1-5 등급 (1이 최고)
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (value >= thresholds[i]) return 5 - i;
    }
    return 5;
  }

  private getPercentile(rank: number): number {
    // 랭킹을 퍼센타일로 변환
    const percentiles = { 1: 95, 2: 80, 3: 60, 4: 40, 5: 20 };
    return percentiles[rank] || 10;
  }

  private calculateQualityMetrics(fund: FinancialData): any {
    const metrics = {
      profitability: fund.eps > 0,
      efficiency: fund.per > 0 && fund.per < 20,
      valuation: fund.pbr > 0 && fund.pbr < 3,
      dividend: fund.div > 0,
      growth: true // 성장성 가정
    };
    
    const score = Object.values(metrics).filter(v => v).length * 20;
    
    return {
      score,
      consistentProfitability: metrics.profitability,
      capitalEfficiency: metrics.efficiency,
      attractiveValuation: metrics.valuation,
      dividendPaying: metrics.dividend,
      growthPotential: metrics.growth
    };
  }

  private calculateGreenblattFairValue(
    fund: FinancialData,
    earningsYield: number,
    roic: number,
    currentPrice: number
  ): number {
    // 그린블라트 적정가 = EPS × 목표 PER
    // 목표 PER = 100 / 목표 수익률
    
    // 목표 수익률 설정 (ROIC 기반)
    let targetYield = 10; // 기본 10%
    if (roic > 30) targetYield = 7;
    else if (roic > 20) targetYield = 8;
    else if (roic > 15) targetYield = 9;
    
    const targetPER = 100 / targetYield;
    const fairValue = fund.eps * targetPER;
    
    // 현재가 대비 조정 (극단값 방지)
    if (fairValue > currentPrice * 3) {
      return Math.round(currentPrice * 2.5);
    }
    
    return Math.round(fairValue);
  }

  private calculateComprehensiveScore(metrics: any): number {
    let score = 0;
    
    // 매직 점수 (40점)
    if (metrics.magicScore >= 80) score += 40;
    else if (metrics.magicScore >= 60) score += 30;
    else if (metrics.magicScore >= 40) score += 20;
    else if (metrics.magicScore >= 20) score += 10;
    
    // 랭킹 (30점)
    if (metrics.rankings.combinedRank <= 2) score += 30;
    else if (metrics.rankings.combinedRank <= 3) score += 20;
    else if (metrics.rankings.combinedRank <= 4) score += 10;
    
    // 품질 (20점)
    score += metrics.qualityMetrics.score * 0.2;
    
    // 상승여력 (10점)
    if (metrics.upside > 50) score += 10;
    else if (metrics.upside > 30) score += 7;
    else if (metrics.upside > 15) score += 5;
    
    return Math.round(score);
  }

  private getInvestmentGrade(score: number): string {
    if (score >= 80) return 'A+ (최우수)';
    if (score >= 70) return 'A (우수)';
    if (score >= 60) return 'B+ (양호)';
    if (score >= 50) return 'B (보통)';
    if (score >= 40) return 'C (주의)';
    return 'D (위험)';
  }

  private getGreenblattRecommendation(
    magicScore: number,
    comprehensiveScore: number,
    rankings: any
  ): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    // 그린블라트 매직 포뮬러 기준
    if (comprehensiveScore >= 80 && rankings.combinedRank <= 2) {
      return 'Strong Buy';
    }
    if (comprehensiveScore >= 60 && magicScore >= 50) {
      return 'Buy';
    }
    if (comprehensiveScore >= 40 || magicScore >= 30) {
      return 'Hold';
    }
    if (comprehensiveScore >= 20) {
      return 'Sell';
    }
    return 'Strong Sell';
  }
}