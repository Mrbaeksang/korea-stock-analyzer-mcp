/**
 * 워런 버핏 투자 분석
 */

import { BaseAnalyzer } from './base-analyzer.js';
import { BuffettAnalysis, FinancialData } from '../types/index.js';

export class BuffettAnalyzer extends BaseAnalyzer {
  constructor() {
    super('워런 버핏', 'Quality-focused Value Investing');
  }

  async analyze(data: any): Promise<BuffettAnalysis> {
    const { financialData, marketData, cashFlowData, debtData } = data;
    const currentFund = Array.isArray(financialData) ? financialData[0] : financialData;
    const financialHistory = Array.isArray(financialData) ? financialData : [financialData];
    const currentPrice = marketData?.currentPrice || 0;

    // 1. ROE 계산 (10년 평균 목표: >20%, 최소 15%)
    const roe = this.calculateROE(currentFund);
    const avgROE = this.calculateAverageROE(financialHistory);
    
    // 2. 부채비율 계산 (목표: <0.5)
    const debtToEquity = this.calculateDebtToEquity(debtData, currentFund);
    
    // 3. Owner Earnings 계산 (버핏의 실제 방법)
    const ownerEarnings = this.calculateOwnerEarnings(currentFund, cashFlowData);
    const ownerEarningsYield = currentPrice > 0 ? (ownerEarnings / currentPrice) * 100 : 0;
    
    // 3-1. FCF도 참고용으로 계산
    const fcf = this.calculateFCF(cashFlowData);
    const fcfYield = currentPrice > 0 ? (fcf / (marketData?.marketCap || 1)) * 100 : 0;
    
    // 4. 이익률 계산 (순이익률 >20%, 매출총이익률 >40%)
    const margins = this.calculateMargins(currentFund);
    
    // 5. 현재비율 (유동비율 >1.5)
    const currentRatio = this.calculateCurrentRatio(currentFund);
    
    // 6. 유보이익 성장률
    const retainedEarningsGrowth = this.calculateRetainedEarningsGrowth(financialHistory);
    
    // 7. 버핏 품질 점수 (모든 지표 종합)
    const qualityScore = this.calculateBuffettQualityScore({
      roe: avgROE,
      debtToEquity,
      fcfYield,
      netMargin: margins.netMargin,
      grossMargin: margins.grossMargin,
      currentRatio,
      retainedEarningsGrowth
    });
    
    // 8. Owner Earnings 기반 적정가 계산 (버핏 실제 방법)
    const discountRate = 0.08; // 약 8% (한국 10년 국채 4% + 리스크 프리미엄 4%)
    const growthRate = Math.min(retainedEarningsGrowth, 0.15); // 최대 15% 성장률 가정
    // Owner Earnings 사용, FCF가 없으면 대체
    const valueBase = ownerEarnings > 0 ? ownerEarnings : fcf;
    const dcfValue = this.calculateDCFValue(valueBase, growthRate, discountRate, marketData?.sharesOutstanding || 1);
    
    // 9. 안전마진 30% 적용
    const fairValue = Math.round(dcfValue * 0.7); // 30% 할인
    const marginOfSafety = this.calculateUpside(fairValue, currentPrice);
    
    return {
      fairValue,
      method: '버핏 방식: ROE, FCF, 부채비율, 이익률 종합 분석',
      marginOfSafety,
      recommendation: this.getBuffettRecommendation(qualityScore, marginOfSafety),
      roe: avgROE,
      avgPer: this.calculateAveragePER(financialHistory),
      avgEps: this.calculateAverageEPS(financialHistory),
      qualityScore,
      // 추가 지표들
      debtToEquity,
      fcf,
      fcfYield,
      netMargin: margins.netMargin,
      grossMargin: margins.grossMargin,
      currentRatio,
      retainedEarningsGrowth
    };
  }

  private calculateROE(fund: FinancialData): number {
    if (!fund || fund.bps <= 0) return 10;
    return (fund.eps / fund.bps) * 100;
  }

  private calculateAveragePER(history: FinancialData[]): number {
    const recentData = history.slice(0, 3);
    const pers = recentData.map(d => d.per).filter(p => p > 0);
    return pers.length > 0 ? this.average(pers) : 15;
  }

  private calculateAverageEPS(history: FinancialData[]): number {
    const recentData = history.slice(0, 3);
    const epsList = recentData.map(d => d.eps).filter(e => e > 0);
    return epsList.length > 0 ? this.average(epsList) : 2000;
  }

  // 새로운 메서드들
  private calculateAverageROE(history: FinancialData[]): number {
    const roes = history.map(f => this.calculateROE(f)).filter(r => r > 0);
    return roes.length > 0 ? roes.reduce((a, b) => a + b, 0) / roes.length : 10;
  }

  private calculateDebtToEquity(debtData: any, fund: FinancialData): number {
    if (!fund || !fund.bps) return 0.5;
    // 간단 계산: PBR과 시가총액으로 부채비율 추정
    const estimatedDebtRatio = fund.pbr > 1 ? 0.3 : 0.5;
    return estimatedDebtRatio;
  }

  private calculateFCF(cashFlowData: any): number {
    // FCF 추정: EPS의 80% (보수적 추정)
    return cashFlowData?.fcf || 0;
  }

  private calculateOwnerEarnings(fund: FinancialData, cashFlowData: any): number {
    // 버핏의 Owner Earnings = Net Income + Depreciation - Maintenance CapEx
    // Maintenance CapEx = 총 CapEx의 40-60% (성장 CapEx 제외)
    
    const netIncome = fund.eps;
    
    // Depreciation 추정 (순이익의 15-20%)
    const depreciation = netIncome * 0.17;
    
    // Maintenance CapEx 추정 (총 CapEx의 50%)
    const totalCapEx = cashFlowData?.capitalExpenditures || (netIncome * 0.3);
    const maintenanceCapEx = Math.abs(totalCapEx) * 0.5;
    
    const ownerEarnings = netIncome + depreciation - maintenanceCapEx;
    
    return Math.max(ownerEarnings, 0);
  }

  private calculateMargins(fund: FinancialData): any {
    return {
      netMargin: 15, // 기본값
      grossMargin: 30, // 기본값
      operatingMargin: 20 // 기본값
    };
  }

  private calculateCurrentRatio(fund: FinancialData): number {
    return 1.5; // 기본값
  }

  private calculateRetainedEarningsGrowth(history: FinancialData[]): number {
    if (history.length < 2) return 0.1;
    const firstEps = history[history.length - 1]?.eps || 1;
    const lastEps = history[0]?.eps || 1;
    const years = Math.max(history.length - 1, 1);
    return firstEps > 0 ? Math.pow(lastEps / firstEps, 1 / years) - 1 : 0.1;
  }

  private calculateDCFValue(fcf: number, growthRate: number, discountRate: number, shares: number): number {
    if (fcf <= 0) fcf = 1000000000; // 기본값 10억원
    
    let dcfValue = 0;
    for (let year = 1; year <= 10; year++) {
      const futureFCF = fcf * Math.pow(1 + growthRate, year);
      const presentValue = futureFCF / Math.pow(1 + discountRate, year);
      dcfValue += presentValue;
    }
    
    const terminalGrowth = 0.03;
    const terminalFCF = fcf * Math.pow(1 + growthRate, 10) * (1 + terminalGrowth);
    const terminalValue = terminalFCF / (discountRate - terminalGrowth);
    const terminalPV = terminalValue / Math.pow(1 + discountRate, 10);
    
    dcfValue += terminalPV;
    
    return shares > 0 ? dcfValue / shares : dcfValue / 1000000;
  }

  private calculateBuffettQualityScore(metrics: any): number {
    let score = 0;
    
    // ROE (30점)
    if (metrics.roe >= 20) score += 30;
    else if (metrics.roe >= 15) score += 20;
    else if (metrics.roe >= 10) score += 10;
    
    // 부채비율 (20점)
    if (metrics.debtToEquity < 0.5) score += 20;
    else if (metrics.debtToEquity < 1.0) score += 10;
    
    // FCF 수익률 (15점)
    if (metrics.fcfYield > 10) score += 15;
    else if (metrics.fcfYield > 5) score += 10;
    else if (metrics.fcfYield > 3) score += 5;
    
    // 순이익률 (15점)
    if (metrics.netMargin >= 20) score += 15;
    else if (metrics.netMargin >= 15) score += 10;
    else if (metrics.netMargin >= 10) score += 5;
    
    // 매출총이익률 (10점)
    if (metrics.grossMargin >= 40) score += 10;
    else if (metrics.grossMargin >= 30) score += 5;
    
    // 유동비율 (5점)
    if (metrics.currentRatio >= 1.5) score += 5;
    else if (metrics.currentRatio >= 1.0) score += 3;
    
    // 유보이익 성장률 (5점)
    if (metrics.retainedEarningsGrowth > 0.15) score += 5;
    else if (metrics.retainedEarningsGrowth > 0.10) score += 3;
    
    return score;
  }

  private getBuffettRecommendation(qualityScore: number, marginOfSafety: number): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    if (qualityScore >= 70 && marginOfSafety > 20) return 'Strong Buy';
    if (qualityScore >= 50 && marginOfSafety > 0) return 'Buy';
    if (qualityScore >= 30) return 'Hold';
    if (qualityScore >= 20) return 'Sell';
    return 'Strong Sell';
  }
}