/**
 * 모든 투자 대가 분석 통합
 */

import { BuffettAnalyzer } from './buffett.js';
import { LynchAnalyzer } from './lynch.js';
import { GrahamAnalyzer } from './graham.js';
import { GreenblattAnalyzer } from './greenblatt.js';
import { FisherAnalyzer } from './fisher.js';
import { TempletonAnalyzer } from './templeton.js';
import { AnalysisResult } from '../types/index.js';

export class GuruAnalyzers {
  private buffett = new BuffettAnalyzer();
  private lynch = new LynchAnalyzer();
  private graham = new GrahamAnalyzer();
  private greenblatt = new GreenblattAnalyzer();
  private fisher = new FisherAnalyzer();
  private templeton = new TempletonAnalyzer();

  /**
   * 모든 투자 대가 분석 실행
   */
  async analyzeAll(data: AnalysisResult): Promise<void> {
    console.log('[GuruAnalyzers] 6대 투자 대가 분석 시작...');
    
    // 병렬로 분석 실행
    const [
      buffettResult, 
      lynchResult, 
      grahamResult,
      greenblattResult,
      fisherResult,
      templetonResult
    ] = await Promise.all([
      this.buffett.analyze(data),
      this.lynch.analyze(data),
      this.graham.analyze(data),
      this.greenblatt.analyze(data),
      this.fisher.analyze(data),
      this.templeton.analyze(data),
    ]);

    // 결과 저장
    data.valuations = {
      buffett: buffettResult,
      lynch: lynchResult,
      graham: grahamResult,
      greenblatt: greenblattResult,
      fisher: fisherResult,
      templeton: templetonResult,
    };

    // 종합 밸류에이션 계산
    this.calculateComprehensiveValuation(data);
    
    console.log('[GuruAnalyzers] 분석 완료');
  }

  /**
   * 종합 밸류에이션 계산
   */
  private calculateComprehensiveValuation(data: AnalysisResult): void {
    const fairValues: number[] = [];
    const weights: number[] = [];

    if (data.valuations.buffett?.fairValue) {
      fairValues.push(data.valuations.buffett.fairValue);
      weights.push(0.20);
    }
    if (data.valuations.lynch?.fairValue) {
      fairValues.push(data.valuations.lynch.fairValue);
      weights.push(0.15);
    }
    if (data.valuations.graham?.fairValue) {
      fairValues.push(data.valuations.graham.fairValue);
      weights.push(0.20);
    }
    if (data.valuations.greenblatt?.fairValue) {
      fairValues.push(data.valuations.greenblatt.fairValue);
      weights.push(0.15);
    }
    if (data.valuations.fisher?.fairValue) {
      fairValues.push(data.valuations.fisher.fairValue);
      weights.push(0.15);
    }
    if (data.valuations.templeton?.fairValue) {
      fairValues.push(data.valuations.templeton.fairValue);
      weights.push(0.15);
    }

    if (fairValues.length > 0) {
      const weightedSum = fairValues.reduce((sum, val, idx) => sum + val * weights[idx], 0);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const weightedAverage = Math.round(weightedSum / totalWeight);

      const currentPrice = data.marketData?.currentPrice || 0;
      
      data.comprehensiveValuation = {
        weightedAverage,
        median: this.median(fairValues),
        conservative: Math.min(...fairValues),
        optimistic: Math.max(...fairValues),
        currentPrice,
        upsideWeighted: this.calculateUpside(weightedAverage, currentPrice),
        upsideMedian: this.calculateUpside(this.median(fairValues), currentPrice),
        upsideConservative: this.calculateUpside(Math.min(...fairValues), currentPrice),
        upsideOptimistic: this.calculateUpside(Math.max(...fairValues), currentPrice),
      };
    }
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  private calculateUpside(fairValue: number, currentPrice: number): number {
    if (currentPrice <= 0) return 0;
    return Math.round(((fairValue - currentPrice) / currentPrice) * 100 * 100) / 100;
  }

}

export * from './buffett.js';
export * from './lynch.js';
export * from './graham.js';
export * from './greenblatt.js';
export * from './fisher.js';
export * from './templeton.js';