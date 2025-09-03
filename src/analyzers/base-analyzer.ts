/**
 * 기본 분석기 클래스 - 모든 투자 대가 분석의 베이스
 */

import { FinancialData, GuruAnalysis } from '../types/index.js';

export abstract class BaseAnalyzer {
  protected name: string;
  protected method: string;

  constructor(name: string, method: string) {
    this.name = name;
    this.method = method;
  }

  /**
   * 분석 실행 (각 대가별로 구현)
   */
  abstract analyze(data: any): Promise<GuruAnalysis>;

  /**
   * 투자 추천 등급 결정
   */
  protected getRecommendation(upside: number): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    if (upside > 30) return 'Strong Buy';
    if (upside > 15) return 'Buy';
    if (upside > -10) return 'Hold';
    if (upside > -20) return 'Sell';
    return 'Strong Sell';
  }

  /**
   * 상승 여력 계산
   */
  protected calculateUpside(fairValue: number, currentPrice: number): number {
    if (currentPrice <= 0) return 0;
    return ((fairValue - currentPrice) / currentPrice) * 100;
  }

  /**
   * 평균 계산 헬퍼
   */
  protected average(values: number[]): number {
    if (values.length === 0) return 0;
    const validValues = values.filter(v => v > 0);
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  }
}