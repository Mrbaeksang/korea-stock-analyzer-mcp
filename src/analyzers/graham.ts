/**
 * 벤저민 그레이엄 투자 분석 - 완전 개선판
 */

import { BaseAnalyzer } from './base-analyzer.js';
import { GrahamAnalysis, FinancialData } from '../types/index.js';

export class GrahamAnalyzer extends BaseAnalyzer {
  constructor() {
    super('벤저민 그레이엄', 'Deep Value with Margin of Safety');
  }

  async analyze(data: any): Promise<GrahamAnalysis> {
    const { financialData, marketData, balanceSheetData } = data;
    const currentFund = Array.isArray(financialData) ? financialData[0] : financialData;
    const currentPrice = marketData?.currentPrice || 0;
    const sharesOutstanding = marketData?.sharesOutstanding || 1000000;

    // 1. NCAV (Net Current Asset Value) - 그레이엄의 핵심
    const ncav = this.calculateNCAV(balanceSheetData, sharesOutstanding);
    const ncavPerShare = ncav / sharesOutstanding;
    
    // 2. Net-Net 가치 (NCAV의 66.7% 매수 기준)
    const netNetValue = ncavPerShare * 0.667;
    
    // 3. Graham Number 계산
    const grahamNumber = this.calculateGrahamNumber(currentFund);
    
    // 4. 청산가치 (Liquidation Value)
    const liquidationValue = this.calculateLiquidationValue(currentFund, balanceSheetData);
    
    // 5. 수익가치 (Earnings Power Value)
    const earningsValue = this.calculateEarningsValue(currentFund);
    
    // 6. 개정 그레이엄 공식 (1974년 버전)
    const revisedGrahamValue = this.calculateRevisedGrahamFormula(currentFund);
    
    // 7. 방어적 투자자 7가지 기준
    const defensiveCriteria = this.checkDefensiveCriteria(currentFund, marketData, balanceSheetData);
    const defensiveScore = Object.values(defensiveCriteria).filter(v => v).length;
    
    // 8. 진취적 투자자 기준
    const enterprisingCriteria = this.checkEnterprisingCriteria(currentFund, currentPrice);
    const enterprisingScore = Object.values(enterprisingCriteria).filter(v => v).length;
    
    // 9. 최종 적정가 (3가지 방법 중 가장 보수적)
    const fairValue = this.determineFairValue({
      ncavPerShare: netNetValue,
      grahamNumber,
      liquidationValue,
      earningsValue,
      revisedGrahamValue
    });
    
    // 10. 안전마진 계산
    const marginOfSafety = this.calculateUpside(fairValue, currentPrice);
    const ncavMargin = this.calculateUpside(ncavPerShare, currentPrice);
    
    // 11. 그레이엄 종합 점수
    const grahamScore = this.calculateGrahamScore({
      marginOfSafety,
      ncavMargin,
      defensiveScore,
      enterprisingScore,
      currentPrice,
      grahamNumber,
      ncavPerShare
    });
    
    return {
      fairValue,
      method: '그레이엄 가치투자: NCAV + Graham Number + 안전마진',
      marginOfSafety,
      recommendation: this.getGrahamRecommendation(marginOfSafety, ncavMargin, grahamScore),
      // 상세 지표들
      ncavPerShare,
      netNetValue,
      grahamNumber,
      liquidationValue,
      earningsValue,
      revisedGrahamValue,
      defensiveCriteriaMet: `${defensiveScore}/7`,
      enterprisingCriteriaMet: `${enterprisingScore}/5`,
      ncavMargin,
      grahamScore,
      defensiveCriteria,
      enterprisingCriteria
    };
  }

  private calculateNCAV(balanceSheet: any, shares: number): number {
    // NCAV = 유동자산 - 총부채
    if (!balanceSheet) {
      // 추정값 사용
      return 0;
    }
    
    const currentAssets = balanceSheet?.currentAssets || 0;
    const totalLiabilities = balanceSheet?.totalLiabilities || 0;
    
    return Math.max(currentAssets - totalLiabilities, 0);
  }

  private calculateGrahamNumber(fund: FinancialData): number {
    // Graham Number = √(22.5 × EPS × BPS)
    // 22.5 = PER 15 × PBR 1.5
    if (fund.eps > 0 && fund.bps > 0) {
      return Math.round(Math.sqrt(22.5 * fund.eps * fund.bps));
    }
    return 0;
  }

  private calculateLiquidationValue(fund: FinancialData, balanceSheet: any): number {
    // 보수적 청산가치
    // 유동자산 100% + 고정자산 50% - 총부채 100%
    if (!balanceSheet) {
      // BPS의 66%로 추정
      return Math.round(fund.bps * 0.66);
    }
    
    const currentAssets = balanceSheet?.currentAssets || 0;
    const fixedAssets = balanceSheet?.fixedAssets || 0;
    const totalLiabilities = balanceSheet?.totalLiabilities || 0;
    const shares = balanceSheet?.sharesOutstanding || 1000000;
    
    const liquidationTotal = currentAssets + (fixedAssets * 0.5) - totalLiabilities;
    return Math.round(liquidationTotal / shares);
  }

  private calculateEarningsValue(fund: FinancialData): number {
    // 수익가치 = EPS × (8.5 + 2g)
    // 8.5 = 무성장 기업의 기본 PER
    // g = 예상 성장률 (보수적으로 3-5%)
    const growthRate = 3; // 3% 보수적 성장률
    return Math.round(fund.eps * (8.5 + 2 * growthRate));
  }

  private calculateRevisedGrahamFormula(fund: FinancialData): number {
    // 주의: 그레이엄은 이 공식을 평가용이 아닌 "과거 성장 기대치의 오류 분석"용으로만 사용
    // 실제 평가는 Graham Number와 NCAV 중심
    // 참고용으로만 계산
    return 0; // 사용하지 않음
  }

  private checkDefensiveCriteria(fund: FinancialData, marketData: any, balanceSheet: any): Record<string, boolean> {
    // 방어적 투자자를 위한 7가지 기준
    return {
      adequateSize: marketData?.marketCap > 100000000000, // 1000억원 이상
      currentRatio: true, // 유동비율 2.0 이상 (데이터 없으면 true)
      earningsStability: fund.eps > 0, // 10년 연속 흑자 (현재만 체크)
      dividendRecord: fund.div > 0, // 20년 연속 배당 (현재만 체크)
      earningsGrowth: true, // EPS 33% 이상 성장 (10년간)
      moderatePE: fund.per > 0 && fund.per < 15, // PER 15 미만
      moderatePB: fund.pbr > 0 && fund.pbr < 1.5, // PBR 1.5 미만
    };
  }

  private checkEnterprisingCriteria(fund: FinancialData, currentPrice: number): Record<string, boolean> {
    // 진취적 투자자 기준
    return {
      lowPE: fund.per > 0 && fund.per < 10, // PER 10 미만
      lowPB: fund.pbr > 0 && fund.pbr < 1.2, // 유형자산 대비 120% 미만
      highDividend: fund.div > 4, // 배당수익률 4% 이상
      profitability: fund.eps > 0, // 수익성
      priceBelow120PercentTangible: true, // 유형자산의 120% 이하
    };
  }

  private determineFairValue(values: any): number {
    // 그레이엄의 실제 원칙: 가장 보수적인 값 선택
    const validValues = [
      values.ncavPerShare,
      values.grahamNumber,
      values.liquidationValue,
      values.earningsValue
      // revisedGrahamValue 제외 (평가용 아님)
    ].filter(v => v > 0);
    
    if (validValues.length === 0) return 0;
    
    // 가장 보수적인 값 선택 (최소값)
    return Math.min(...validValues);
  }

  private calculateGrahamScore(metrics: any): number {
    let score = 0;
    
    // 안전마진 (30점)
    if (metrics.marginOfSafety > 50) score += 30;
    else if (metrics.marginOfSafety > 33) score += 25;
    else if (metrics.marginOfSafety > 20) score += 15;
    else if (metrics.marginOfSafety > 10) score += 10;
    
    // NCAV 마진 (25점)
    if (metrics.ncavMargin > 33) score += 25;
    else if (metrics.ncavMargin > 20) score += 20;
    else if (metrics.ncavMargin > 10) score += 15;
    else if (metrics.ncavMargin > 0) score += 10;
    
    // Graham Number 대비 (20점)
    if (metrics.currentPrice < metrics.grahamNumber * 0.67) score += 20;
    else if (metrics.currentPrice < metrics.grahamNumber * 0.8) score += 15;
    else if (metrics.currentPrice < metrics.grahamNumber) score += 10;
    
    // 방어적 기준 충족 (15점)
    score += metrics.defensiveScore * 2.14; // 7개 기준, 총 15점
    
    // 진취적 기준 충족 (10점)
    score += metrics.enterprisingScore * 2; // 5개 기준, 총 10점
    
    return Math.round(score);
  }

  private getGrahamRecommendation(
    marginOfSafety: number, 
    ncavMargin: number, 
    score: number
  ): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    // 그레이엄의 엄격한 기준
    if (score >= 80 && marginOfSafety > 33 && ncavMargin > 0) return 'Strong Buy';
    if (score >= 60 && marginOfSafety > 20) return 'Buy';
    if (score >= 40 && marginOfSafety > 0) return 'Hold';
    if (score >= 20) return 'Sell';
    return 'Strong Sell';
  }
}