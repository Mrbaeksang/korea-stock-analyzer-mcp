/**
 * 피터 린치 투자 분석 - 완전 개선판
 */

import { BaseAnalyzer } from './base-analyzer.js';
import { LynchAnalysis, FinancialData } from '../types/index.js';

export class LynchAnalyzer extends BaseAnalyzer {
  constructor() {
    super('피터 린치', 'GARP (Growth at Reasonable Price)');
  }

  async analyze(data: any): Promise<LynchAnalysis> {
    const { financialData, marketData, growthMetrics } = data;
    const currentFund = Array.isArray(financialData) ? financialData[0] : financialData;
    const financialHistory = Array.isArray(financialData) ? financialData : [financialData];
    const currentPrice = marketData?.currentPrice || 0;

    // 1. EPS 성장률 계산 (3-5년 CAGR)
    const epsGrowthRate = this.calculateEPSGrowthRate(financialHistory, growthMetrics);
    
    // 2. 매출 성장률 계산
    const salesGrowthRate = this.calculateSalesGrowthRate(financialHistory);
    
    // 3. 기본 PEG 비율 계산
    const peg = this.calculatePEG(currentFund.per, epsGrowthRate);
    
    // 4. 배당 조정 PEG (린치의 개선 공식)
    const dividendAdjustedPEG = this.calculateDividendAdjustedPEG(
      currentFund.per, 
      epsGrowthRate, 
      currentFund.div
    );
    
    // 5. 회사 분류 (6가지 카테고리)
    const companyType = this.classifyCompany(epsGrowthRate, currentFund);
    
    // 6. 적정 PER 산출 (린치 공식: PER = 성장률)
    const fairPer = this.determineFairPER(epsGrowthRate, companyType);
    
    // 7. 적정가 계산
    const fairValue = Math.round(currentFund.eps * fairPer);
    
    // 8. 재고회전율 (소매업 중요 지표)
    const inventoryTurnover = this.calculateInventoryTurnover(data);
    
    // 9. 부채비율 체크
    const debtToEquity = this.calculateDebtToEquity(currentFund);
    
    // 10. 린치 종합 점수
    const lynchScore = this.calculateLynchScore({
      peg,
      dividendAdjustedPEG,
      epsGrowthRate,
      salesGrowthRate,
      debtToEquity,
      inventoryTurnover,
      companyType
    });
    
    // 11. 상승여력
    const margin = this.calculateUpside(fairValue, currentPrice);
    
    return {
      fairValue,
      method: 'GARP 전략: PEG < 1.0 + 배당조정',
      margin,
      recommendation: this.getLynchRecommendation(peg, dividendAdjustedPEG, margin, lynchScore),
      category: companyType,
      growthRate: epsGrowthRate,
      pegRatio: peg,
      dividendAdjustedPEG,
      fairPer,
      salesGrowthRate,
      debtToEquity,
      inventoryTurnover,
      lynchScore
    };
  }

  private calculateEPSGrowthRate(history: FinancialData[], growthMetrics?: any): number {
    // 기존 메트릭스가 있으면 사용
    if (growthMetrics?.epsGrowth3yCagr) {
      return growthMetrics.epsGrowth3yCagr;
    }
    
    // 수동 계산 (3년 CAGR)
    if (history.length >= 3) {
      const current = history[0].eps;
      const threeYearsAgo = history[Math.min(2, history.length - 1)].eps;
      
      if (threeYearsAgo > 0 && current > 0) {
        const years = Math.min(3, history.length - 1);
        return ((Math.pow(current / threeYearsAgo, 1/years) - 1) * 100);
      }
    }
    
    return 10; // 기본값 10%
  }

  private calculateSalesGrowthRate(history: FinancialData[]): number {
    // 매출 성장률 추정 (EPS 성장률의 80%)
    const epsGrowth = this.calculateEPSGrowthRate(history);
    return epsGrowth * 0.8;
  }

  private calculatePEG(per: number, growthRate: number): number {
    if (growthRate <= 0) return 999;
    return Number((per / growthRate).toFixed(2));
  }

  private calculateDividendAdjustedPEG(per: number, growthRate: number, dividendYield: number): number {
    // 린치의 배당 조정 PEG = PER / (성장률 + 배당수익률)
    const adjustedGrowth = growthRate + dividendYield;
    if (adjustedGrowth <= 0) return 999;
    return Number((per / adjustedGrowth).toFixed(2));
  }

  private classifyCompany(growthRate: number, fund: FinancialData): string {
    // 린치의 6가지 분류
    if (growthRate > 20) return 'Fast Grower (고성장주)';
    if (growthRate > 10) return 'Stalwart (우량주)';
    if (growthRate > 5) return 'Slow Grower (저성장주)';
    if (fund.per < 10 && fund.pbr < 1) return 'Asset Play (자산주)';
    if (growthRate < 0) return 'Turnaround (턴어라운드)';
    return 'Cyclical (경기순환주)';
  }

  private determineFairPER(growthRate: number, companyType: string): number {
    // 린치 원칙: 적정 PER = 성장률
    let fairPer = Math.max(growthRate, 5);
    
    // 회사 유형별 조정
    if (companyType.includes('Fast Grower')) {
      // 고성장주는 PER 25-40 허용
      fairPer = Math.min(fairPer * 1.5, 40);
    } else if (companyType.includes('Stalwart')) {
      // 우량주는 PER 10-20
      fairPer = Math.min(fairPer, 20);
    } else if (companyType.includes('Slow Grower')) {
      // 저성장주는 PER 8-12
      fairPer = Math.min(fairPer * 0.8, 12);
    } else if (companyType.includes('Asset Play')) {
      // 자산주는 PBR 중심
      fairPer = 10;
    } else if (companyType.includes('Turnaround')) {
      // 턴어라운드는 보수적
      fairPer = 8;
    } else {
      // 경기순환주
      fairPer = Math.min(fairPer, 15);
    }
    
    return fairPer;
  }

  private calculateInventoryTurnover(data: any): number {
    // 재고회전율 (소매업 중요)
    // 높을수록 좋음
    return 5; // 기본값
  }

  private calculateDebtToEquity(fund: FinancialData): number {
    // 부채비율 추정
    if (fund.pbr > 2) return 1.0; // 높은 PBR = 높은 부채 추정
    if (fund.pbr > 1) return 0.5;
    return 0.3;
  }

  private calculateLynchScore(metrics: any): number {
    let score = 0;
    
    // PEG 평가 (40점)
    if (metrics.peg <= 0.5) score += 40;
    else if (metrics.peg <= 1.0) score += 30;
    else if (metrics.peg <= 1.5) score += 20;
    else if (metrics.peg <= 2.0) score += 10;
    
    // 배당조정 PEG (20점)
    if (metrics.dividendAdjustedPEG <= 1.0) score += 20;
    else if (metrics.dividendAdjustedPEG <= 1.5) score += 10;
    
    // EPS 성장률 (15점)
    if (metrics.epsGrowthRate >= 20) score += 15;
    else if (metrics.epsGrowthRate >= 15) score += 10;
    else if (metrics.epsGrowthRate >= 10) score += 5;
    
    // 매출 성장률 (10점)
    if (metrics.salesGrowthRate >= 15) score += 10;
    else if (metrics.salesGrowthRate >= 10) score += 5;
    
    // 부채비율 (10점)
    if (metrics.debtToEquity < 0.3) score += 10;
    else if (metrics.debtToEquity < 0.5) score += 5;
    
    // 회사 유형 (5점)
    if (metrics.companyType.includes('Fast Grower') || 
        metrics.companyType.includes('Stalwart')) {
      score += 5;
    }
    
    return score;
  }

  private getLynchRecommendation(
    peg: number, 
    dividendPEG: number, 
    margin: number, 
    score: number
  ): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    // 종합 판단
    if (score >= 80 && peg <= 1.0 && margin > 30) return 'Strong Buy';
    if (score >= 60 && peg <= 1.5 && margin > 15) return 'Buy';
    if (score >= 40 || peg <= 2.0) return 'Hold';
    if (score >= 20) return 'Sell';
    return 'Strong Sell';
  }
}