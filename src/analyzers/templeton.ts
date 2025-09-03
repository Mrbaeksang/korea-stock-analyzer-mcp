/**
 * 존 템플턴 역발상 투자 분석 - 최대 비관 시점 매수
 */

import { BaseAnalyzer } from './base-analyzer.js';
import { TempletonAnalysis, FinancialData } from '../types/index.js';

export class TempletonAnalyzer extends BaseAnalyzer {
  constructor() {
    super('존 템플턴', 'Maximum Pessimism Contrarian Investing');
  }

  async analyze(data: any): Promise<TempletonAnalysis> {
    const { financialData, marketData } = data;
    const currentFund = Array.isArray(financialData) ? financialData[0] : financialData;
    const financialHistory = Array.isArray(financialData) ? financialData : [financialData];
    const currentPrice = marketData?.currentPrice || 0;

    // 1. 52주 가격 위치 분석
    const pricePosition = this.calculate52WeekPosition(marketData);
    
    // 2. 역발상 지표들
    const contrarianIndicators = this.evaluateContrarianIndicators(
      currentFund,
      marketData,
      pricePosition
    );
    
    // 3. 비관 점수 계산 (높을수록 매수 기회)
    const pessimismScore = this.calculatePessimismScore(contrarianIndicators);
    
    // 4. 글로벌 상대 가치 평가
    const globalValue = this.evaluateGlobalRelativeValue(currentFund, marketData);
    
    // 5. 위기 = 기회 분석
    const crisisOpportunity = this.analyzeCrisisOpportunity(
      marketData,
      pricePosition,
      pessimismScore
    );
    
    // 6. 가치 함정 체크 (Value Trap 회피)
    const valueTrapRisk = this.assessValueTrapRisk(currentFund, financialHistory);
    
    // 7. 시장 사이클 위치
    const marketCycle = this.identifyMarketCycle(pricePosition, marketData);
    
    // 8. 템플턴 적정가 (역발상 프리미엄/할인)
    const fairValue = this.calculateTempletonFairValue(
      currentFund,
      pessimismScore,
      valueTrapRisk,
      globalValue
    );
    
    // 9. 상승 잠재력
    const upside = this.calculateUpside(fairValue, currentPrice);
    
    // 10. 종합 템플턴 점수
    const templetonScore = this.calculateTempletonScore({
      pessimismScore,
      globalValue,
      crisisOpportunity,
      valueTrapRisk,
      marketCycle,
      upside
    });
    
    // 11. 진입 타이밍 평가
    const entryTiming = this.evaluateEntryTiming(
      pessimismScore,
      marketCycle,
      contrarianIndicators
    );
    
    return {
      fairValue,
      method: '템플턴 역발상: 최대 비관 시점 매수',
      upside,
      recommendation: this.getTempletonRecommendation(
        pessimismScore,
        templetonScore,
        valueTrapRisk,
        entryTiming
      ),
      // 핵심 지표
      pricePosition52Week: pricePosition,
      pessimismScore,
      contrarianIndicators,
      // 분석 결과
      globalRelativeValue: globalValue,
      crisisOpportunityScore: crisisOpportunity,
      valueTrapRisk,
      marketCyclePhase: marketCycle.phase,
      // 타이밍
      entryTimingScore: entryTiming,
      buyZoneActive: this.isBuyZoneActive(pessimismScore, pricePosition),
      // 종합
      templetonScore,
      investmentThesis: this.generateInvestmentThesis(
        pessimismScore,
        valueTrapRisk,
        marketCycle
      )
    };
  }

  private calculate52WeekPosition(marketData: any): number {
    if (!marketData || !marketData.high52w || !marketData.low52w) {
      return 50; // 중간값
    }
    
    const { currentPrice, high52w, low52w } = marketData;
    const range = high52w - low52w;
    
    if (range <= 0) return 50;
    
    const position = ((currentPrice - low52w) / range) * 100;
    return Math.round(Math.max(0, Math.min(100, position)));
  }

  private evaluateContrarianIndicators(
    fund: FinancialData,
    marketData: any,
    pricePosition: number
  ): any {
    return {
      // 가격 지표 (템플턴 핵심)
      near52WeekLow: pricePosition < 25,
      down50PercentFromHigh: pricePosition < 50,
      at52WeekLow: pricePosition < 10, // 극단적 저점
      
      // 밸류에이션 지표
      lowPER: fund.per > 0 && fund.per < 10,
      veryLowPER: fund.per > 0 && fund.per < 7,
      belowBookValue: fund.pbr > 0 && fund.pbr < 1,
      deepValuePBR: fund.pbr > 0 && fund.pbr < 0.7,
      extremeValuePBR: fund.pbr > 0 && fund.pbr < 0.5, // 추가
      
      // 수익률 지표
      negativeYearReturn: (marketData?.yearReturn || 0) < 0,
      deepNegativeReturn: (marketData?.yearReturn || 0) < -20,
      extremeNegativeReturn: (marketData?.yearReturn || 0) < -40, // 추가
      
      // 배당 지표
      highDividendYield: fund.div > 4,
      exceptionalDividend: fund.div > 6,
      
      // 시장 심리 (템플턴 핵심 강화)
      extremeFear: pricePosition < 20 && fund.per < 10,
      panicSelling: pricePosition < 15 && (marketData?.yearReturn || 0) < -30,
      maximumPessimism: pricePosition < 10 && fund.pbr < 0.5, // 템플턴 정수
      capitulation: pricePosition < 5, // 완전 항복
      
      // 펀더멘털 대비 저평가
      profitableButCheap: fund.eps > 0 && fund.per < 8,
      cashRichButCheap: fund.pbr < 1 && fund.div > 3
    };
  }

  private calculatePessimismScore(indicators: any): number {
    let score = 0;
    const weights = {
      // 가격 위치 (25점)
      near52WeekLow: 15,
      down50PercentFromHigh: 10,
      
      // 밸류에이션 (30점)
      veryLowPER: 15,
      deepValuePBR: 15,
      
      // 수익률 (20점)
      deepNegativeReturn: 20,
      
      // 배당 (10점)
      exceptionalDividend: 10,
      
      // 극단적 상황 (15점)
      extremeFear: 10,
      panicSelling: 5
    };
    
    for (const [key, value] of Object.entries(weights)) {
      if (indicators[key]) {
        score += value;
      }
    }
    
    // 추가 조정
    if (indicators.profitableButCheap) score += 5;
    if (indicators.cashRichButCheap) score += 5;
    
    return Math.min(100, score);
  }

  private evaluateGlobalRelativeValue(fund: FinancialData, marketData: any): number {
    // 글로벌 시장 대비 상대 가치
    let score = 0;
    
    // 한국 시장 디스카운트 (기본 20점)
    score += 20;
    
    // PER 기준 (30점)
    const globalAvgPER = 18; // 글로벌 평균 PER
    if (fund.per > 0) {
      if (fund.per < globalAvgPER * 0.5) score += 30;
      else if (fund.per < globalAvgPER * 0.7) score += 20;
      else if (fund.per < globalAvgPER) score += 10;
    }
    
    // PBR 기준 (25점)
    const globalAvgPBR = 2.0; // 글로벌 평균 PBR
    if (fund.pbr > 0) {
      if (fund.pbr < globalAvgPBR * 0.5) score += 25;
      else if (fund.pbr < globalAvgPBR * 0.7) score += 15;
      else if (fund.pbr < globalAvgPBR) score += 10;
    }
    
    // 배당 수익률 (25점)
    const globalAvgDiv = 2.5; // 글로벌 평균 배당수익률
    if (fund.div > globalAvgDiv * 2) score += 25;
    else if (fund.div > globalAvgDiv * 1.5) score += 15;
    else if (fund.div > globalAvgDiv) score += 10;
    
    return Math.min(100, score);
  }

  private analyzeCrisisOpportunity(
    marketData: any,
    pricePosition: number,
    pessimismScore: number
  ): number {
    // 위기를 기회로 보는 템플턴 철학
    let score = 0;
    
    // 극단적 하락 = 큰 기회
    if (pricePosition < 20) score += 40;
    else if (pricePosition < 30) score += 25;
    else if (pricePosition < 40) score += 15;
    
    // 높은 비관 = 반등 가능성
    if (pessimismScore > 80) score += 30;
    else if (pessimismScore > 60) score += 20;
    else if (pessimismScore > 40) score += 10;
    
    // 연간 수익률 폭락 = 반등 기대
    const yearReturn = marketData?.yearReturn || 0;
    if (yearReturn < -40) score += 30;
    else if (yearReturn < -25) score += 20;
    else if (yearReturn < -10) score += 10;
    
    return Math.min(100, score);
  }

  private assessValueTrapRisk(fund: FinancialData, history: FinancialData[]): number {
    // Value Trap 위험도 (0-100, 낮을수록 좋음)
    let risk = 0;
    
    // 지속적인 수익성 악화
    if (history.length >= 3) {
      const declining = history[0].eps < history[1]?.eps && 
                       history[1]?.eps < history[2]?.eps;
      if (declining) risk += 30;
    }
    
    // 구조적 문제 징후
    if (fund.eps <= 0) risk += 25; // 적자
    if (fund.pbr < 0.5) risk += 15; // 극단적 저PBR
    if (fund.per < 0) risk += 20; // 음의 PER
    
    // 배당 지속가능성
    if (fund.div > 8) risk += 10; // 지나치게 높은 배당 (지속 불가능)
    
    return Math.min(100, risk);
  }

  private identifyMarketCycle(pricePosition: number, marketData: any): any {
    // 시장 사이클 단계 식별
    const yearReturn = marketData?.yearReturn || 0;
    
    let phase = '';
    let cycleScore = 0;
    
    if (pricePosition < 25 && yearReturn < -20) {
      phase = 'Capitulation (투항/바닥)';
      cycleScore = 100; // 최고의 매수 시점
    } else if (pricePosition < 40 && yearReturn < 0) {
      phase = 'Despair (절망)';
      cycleScore = 80;
    } else if (pricePosition < 60 && yearReturn < 10) {
      phase = 'Hope (희망)';
      cycleScore = 60;
    } else if (pricePosition < 80 && yearReturn < 20) {
      phase = 'Optimism (낙관)';
      cycleScore = 40;
    } else {
      phase = 'Euphoria (도취)';
      cycleScore = 20; // 최악의 매수 시점
    }
    
    return { phase, cycleScore };
  }

  private calculateTempletonFairValue(
    fund: FinancialData,
    pessimismScore: number,
    valueTrapRisk: number,
    globalValue: number
  ): number {
    // 템플턴 방식: 극단적 비관 시 프리미엄
    let basePER = 12; // 기본 PER
    
    // 비관 점수에 따른 조정
    if (pessimismScore > 80) {
      basePER = 18; // 극단적 비관 = 높은 목표 PER
    } else if (pessimismScore > 60) {
      basePER = 15;
    } else if (pessimismScore > 40) {
      basePER = 13;
    }
    
    // Value Trap 위험 조정
    if (valueTrapRisk > 70) {
      basePER *= 0.7; // 30% 할인
    } else if (valueTrapRisk > 50) {
      basePER *= 0.85; // 15% 할인
    }
    
    // 글로벌 상대가치 조정
    if (globalValue > 70) {
      basePER *= 1.2; // 20% 프리미엄
    } else if (globalValue > 50) {
      basePER *= 1.1; // 10% 프리미엄
    }
    
    return Math.round(fund.eps * basePER);
  }

  private calculateTempletonScore(metrics: any): number {
    let score = 0;
    
    // 비관 점수 (35점)
    score += metrics.pessimismScore * 0.35;
    
    // 글로벌 가치 (20점)
    score += metrics.globalValue * 0.2;
    
    // 위기 기회 (20점)
    score += metrics.crisisOpportunity * 0.2;
    
    // Value Trap 위험 (15점, 역산)
    score += (100 - metrics.valueTrapRisk) * 0.15;
    
    // 시장 사이클 (10점)
    score += metrics.marketCycle.cycleScore * 0.1;
    
    return Math.round(score);
  }

  private evaluateEntryTiming(
    pessimismScore: number,
    marketCycle: any,
    indicators: any
  ): number {
    // 진입 타이밍 점수 (0-100)
    let timing = 0;
    
    // 비관 수준
    if (pessimismScore > 70) timing += 40;
    else if (pessimismScore > 50) timing += 25;
    else if (pessimismScore > 30) timing += 15;
    
    // 시장 사이클
    timing += marketCycle.cycleScore * 0.3;
    
    // 극단적 지표
    if (indicators.panicSelling) timing += 20;
    else if (indicators.extremeFear) timing += 15;
    else if (indicators.near52WeekLow) timing += 10;
    
    return Math.min(100, timing);
  }

  private isBuyZoneActive(pessimismScore: number, pricePosition: number): boolean {
    // 템플턴 매수 구간 활성화 여부
    return pessimismScore > 60 || pricePosition < 30;
  }

  private generateInvestmentThesis(
    pessimismScore: number,
    valueTrapRisk: number,
    marketCycle: any
  ): string {
    if (pessimismScore > 80 && valueTrapRisk < 40) {
      return '극단적 비관 상황. 강력한 역발상 매수 기회';
    }
    if (pessimismScore > 60 && valueTrapRisk < 50) {
      return '높은 비관 수준. 단계적 매수 고려';
    }
    if (pessimismScore > 40) {
      return '적당한 비관. 선별적 접근 필요';
    }
    if (marketCycle.phase.includes('Euphoria')) {
      return '과열 구간. 매도 고려';
    }
    return '중립 구간. 관망 권장';
  }

  private getTempletonRecommendation(
    pessimismScore: number,
    templetonScore: number,
    valueTrapRisk: number,
    entryTiming: number
  ): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    // 템플턴 투자 철학: 극단적 비관 시 매수
    if (templetonScore > 75 && pessimismScore > 70 && valueTrapRisk < 40) {
      return 'Strong Buy';
    }
    if (templetonScore > 60 && pessimismScore > 50 && valueTrapRisk < 50) {
      return 'Buy';
    }
    if (templetonScore > 40 || entryTiming > 40) {
      return 'Hold';
    }
    if (templetonScore > 20) {
      return 'Sell';
    }
    return 'Strong Sell';
  }
}