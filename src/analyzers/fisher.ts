/**
 * 필립 피셔 성장주 투자 분석 - 15 포인트 체크리스트
 */

import { BaseAnalyzer } from './base-analyzer.js';
import { FisherAnalysis, FinancialData } from '../types/index.js';

export class FisherAnalyzer extends BaseAnalyzer {
  constructor() {
    super('필립 피셔', 'Scuttlebutt Growth Investing');
  }

  async analyze(data: any): Promise<FisherAnalysis> {
    const { financialData, marketData, growthMetrics } = data;
    const currentFund = Array.isArray(financialData) ? financialData[0] : financialData;
    const financialHistory = Array.isArray(financialData) ? financialData : [financialData];
    const currentPrice = marketData?.currentPrice || 0;

    // 피셔의 15 포인트 체크리스트 평가
    const checklist = this.evaluateFisherChecklist(data);
    
    // 점수 계산 (15점 만점)
    const checklistScore = Object.values(checklist).filter(v => v).length;
    const scorePercentage = (checklistScore / 15) * 100;
    
    // 성장 지표 분석
    const growthAnalysis = this.analyzeGrowthMetrics(financialHistory, growthMetrics);
    
    // 경영진 품질 평가
    const managementQuality = this.evaluateManagementQuality(data);
    
    // R&D 및 혁신 평가
    const innovationScore = this.evaluateInnovation(data);
    
    // 경쟁 우위 평가
    const competitiveAdvantage = this.evaluateCompetitiveAdvantage(data);
    
    // 장기 성장 잠재력
    const longTermPotential = this.evaluateLongTermPotential(
      growthAnalysis,
      innovationScore,
      competitiveAdvantage
    );
    
    // 피셔는 정량적 가치평가를 하지 않음 - 투자 적합성만 판단
    // 참고용으로 현재가만 사용
    const fairValue = 0; // 피셔는 적정가를 계산하지 않음
    
    // 투자 적합성 (체크리스트 기반)
    const investmentSuitability = checklistScore >= 10 ? 'Suitable' : 
                                  checklistScore >= 7 ? 'Marginal' : 'Unsuitable';
    
    // 종합 피셔 점수
    const fisherScore = this.calculateFisherScore({
      checklistScore,
      growthAnalysis,
      managementQuality,
      innovationScore,
      competitiveAdvantage,
      longTermPotential
    });
    
    return {
      fairValue,
      method: '피셔 15 포인트: Scuttlebutt 성장주 투자',
      upside: 0, // 피셔는 상승여력 계산하지 않음
      recommendation: this.getFisherRecommendation(
        checklistScore,
        fisherScore,
        investmentSuitability
      ),
      // 15 포인트 체크리스트
      checklistPoints: checklistScore,
      checklistPercentage: Math.round(scorePercentage),
      checklist,
      // 성장 분석
      salesGrowthRate: growthAnalysis.salesGrowth,
      earningsGrowthRate: growthAnalysis.earningsGrowth,
      researchIntensity: growthAnalysis.rdIntensity,
      // 품질 점수
      managementQuality,
      innovationScore,
      competitiveAdvantageScore: competitiveAdvantage,
      longTermPotentialScore: longTermPotential,
      // 종합
      fisherScore,
      investmentGrade: this.getFisherGrade(fisherScore)
    };
  }

  private evaluateFisherChecklist(data: any): Record<string, boolean> {
    const fund = Array.isArray(data.financialData) ? 
      data.financialData[0] : data.financialData;
    const growth = data.growthMetrics || {};
    const market = data.marketData || {};
    
    return {
      // 1. 제품/서비스가 향후 몇 년간 매출 성장 가능한가?
      salesGrowthPotential: (growth.revenueGrowthEst || 10) > 10,
      
      // 2. 경영진이 새로운 제품/서비스 개발에 적극적인가?
      productDevelopment: true, // 데이터 없음, 긍정 가정
      
      // 3. 회사의 R&D 규모가 효과적인가?
      effectiveRnD: (growth.rdIntensity || 3) > 2,
      
      // 4. 평균 이상의 영업 조직을 가지고 있는가?
      salesOrganization: fund.per > 0 && fund.per < 25,
      
      // 5. 적절한 이익률을 유지하는가?
      profitMargin: (data.efficiencyMetrics?.profitMarginEst || 10) > 10,
      
      // 6. 이익률 개선을 위해 노력하는가?
      marginImprovement: true, // 개선 추세 가정
      
      // 7. 노사 관계가 원만한가?
      laborRelations: true, // 한국 대기업 가정
      
      // 8. 임원 관계가 원만한가?
      executiveRelations: true, // 긍정 가정
      
      // 9. 경영진이 깊이 있는가?
      managementDepth: market.marketCap > 100000000000, // 1000억 이상
      
      // 10. 원가 및 회계 관리가 우수한가?
      costControl: fund.pbr > 0 && fund.pbr < 3,
      
      // 11. 동종업계 대비 특별한 강점이 있는가?
      competitiveAdvantage: (data.efficiencyMetrics?.roe || 10) > 15,
      
      // 12. 단기/장기 수익 전망이 있는가?
      profitOutlook: fund.eps > 0,
      
      // 13. 가까운 미래에 증자 계획이 있는가? (없어야 좋음)
      noEquityDilution: true, // 증자 없음 가정
      
      // 14. 경영진이 주주와 솔직하게 소통하는가?
      transparentCommunication: fund.div > 0, // 배당 = 주주 친화
      
      // 15. 경영진이 정직한가?
      managementIntegrity: true // 긍정 가정
    };
  }

  private analyzeGrowthMetrics(history: FinancialData[], growthMetrics: any): any {
    // 매출 성장률
    const salesGrowth = growthMetrics?.revenueGrowthEst || 
      this.estimateSalesGrowth(history);
    
    // 이익 성장률
    const earningsGrowth = growthMetrics?.epsGrowth3yCagr || 
      this.calculateEPSGrowth(history);
    
    // R&D 집약도
    const rdIntensity = growthMetrics?.rdIntensity || 3;
    
    // 성장 일관성
    const growthConsistency = this.evaluateGrowthConsistency(history);
    
    return {
      salesGrowth: Math.round(salesGrowth * 100) / 100,
      earningsGrowth: Math.round(earningsGrowth * 100) / 100,
      rdIntensity: Math.round(rdIntensity * 100) / 100,
      consistency: growthConsistency,
      growthQuality: this.assessGrowthQuality(salesGrowth, earningsGrowth)
    };
  }

  private estimateSalesGrowth(history: FinancialData[]): number {
    // EPS 성장률의 80%로 추정
    const epsGrowth = this.calculateEPSGrowth(history);
    return epsGrowth * 0.8;
  }

  private calculateEPSGrowth(history: FinancialData[]): number {
    if (history.length < 2) return 10;
    
    const current = history[0]?.eps || 0;
    const previous = history[Math.min(2, history.length - 1)]?.eps || 1;
    
    if (previous <= 0) return 0;
    
    const years = Math.min(3, history.length - 1);
    return ((Math.pow(current / previous, 1 / years) - 1) * 100);
  }

  private evaluateGrowthConsistency(history: FinancialData[]): number {
    // 성장 일관성 평가 (0-100)
    if (history.length < 3) return 50;
    
    let consistentGrowth = 0;
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].eps > history[i + 1].eps) {
        consistentGrowth++;
      }
    }
    
    return Math.round((consistentGrowth / (history.length - 1)) * 100);
  }

  private assessGrowthQuality(salesGrowth: number, earningsGrowth: number): string {
    if (salesGrowth > 20 && earningsGrowth > 20) return '탁월';
    if (salesGrowth > 15 && earningsGrowth > 15) return '우수';
    if (salesGrowth > 10 && earningsGrowth > 10) return '양호';
    if (salesGrowth > 5 && earningsGrowth > 5) return '보통';
    return '미흡';
  }

  private evaluateManagementQuality(data: any): number {
    let score = 0;
    const fund = Array.isArray(data.financialData) ? 
      data.financialData[0] : data.financialData;
    
    // ROE 기반 평가 (40점)
    const roe = (data.efficiencyMetrics?.roe || 10);
    if (roe > 20) score += 40;
    else if (roe > 15) score += 30;
    else if (roe > 10) score += 20;
    else if (roe > 5) score += 10;
    
    // 배당 정책 (20점)
    if (fund.div > 3) score += 20;
    else if (fund.div > 2) score += 15;
    else if (fund.div > 1) score += 10;
    else if (fund.div > 0) score += 5;
    
    // 수익성 (20점)
    if (fund.eps > 0 && fund.per < 20) score += 20;
    else if (fund.eps > 0 && fund.per < 30) score += 10;
    
    // 재무 건전성 (20점)
    if (fund.pbr < 2) score += 20;
    else if (fund.pbr < 3) score += 10;
    
    return score;
  }

  private evaluateInnovation(data: any): number {
    // R&D 및 혁신 평가
    const rdIntensity = data.growthMetrics?.rdIntensity || 3;
    let score = 0;
    
    if (rdIntensity > 10) score = 100;
    else if (rdIntensity > 5) score = 80;
    else if (rdIntensity > 3) score = 60;
    else if (rdIntensity > 2) score = 40;
    else if (rdIntensity > 1) score = 20;
    
    return score;
  }

  private evaluateCompetitiveAdvantage(data: any): number {
    let score = 0;
    const fund = Array.isArray(data.financialData) ? 
      data.financialData[0] : data.financialData;
    
    // 시장 지위 (30점)
    const marketCap = data.marketData?.marketCap || 0;
    if (marketCap > 1000000000000) score += 30; // 1조원 이상
    else if (marketCap > 500000000000) score += 20;
    else if (marketCap > 100000000000) score += 10;
    
    // 수익성 우위 (30점)
    const roe = data.efficiencyMetrics?.roe || 10;
    if (roe > 20) score += 30;
    else if (roe > 15) score += 20;
    else if (roe > 10) score += 10;
    
    // 밸류에이션 프리미엄 (20점)
    if (fund.per > 20) score += 20; // 프리미엄 밸류에이션
    else if (fund.per > 15) score += 10;
    
    // 브랜드 가치 (20점)
    if (fund.pbr > 2) score += 20; // 무형자산 가치
    else if (fund.pbr > 1.5) score += 10;
    
    return Math.min(score, 100);
  }

  private evaluateLongTermPotential(
    growth: any,
    innovation: number,
    competitive: number
  ): number {
    // 장기 성장 잠재력 종합 평가
    const growthScore = growth.salesGrowth > 15 ? 40 : 
                       growth.salesGrowth > 10 ? 30 :
                       growth.salesGrowth > 5 ? 20 : 10;
    
    const innovationAdjusted = innovation * 0.3;
    const competitiveAdjusted = competitive * 0.3;
    
    return Math.round(growthScore + innovationAdjusted + competitiveAdjusted);
  }

  private calculateFisherFairValue(
    fund: FinancialData,
    growth: any,
    checklistScore: number,
    longTermPotential: number
  ): number {
    // 피셔 방식: 성장주는 높은 PER 허용
    let targetPER = 15; // 기본 PER
    
    // 체크리스트 점수 반영
    if (checklistScore > 80) targetPER = 35;
    else if (checklistScore > 60) targetPER = 25;
    else if (checklistScore > 40) targetPER = 20;
    
    // 성장률 반영
    if (growth.earningsGrowth > 20) targetPER *= 1.3;
    else if (growth.earningsGrowth > 15) targetPER *= 1.2;
    else if (growth.earningsGrowth > 10) targetPER *= 1.1;
    
    // 장기 잠재력 반영
    if (longTermPotential > 80) targetPER *= 1.2;
    else if (longTermPotential > 60) targetPER *= 1.1;
    
    // 최대 PER 제한
    targetPER = Math.min(targetPER, 50);
    
    return Math.round(fund.eps * targetPER);
  }

  private calculateFisherScore(metrics: any): number {
    let score = 0;
    
    // 체크리스트 점수 (40점)
    score += (metrics.checklistScore / 15) * 40;
    
    // 성장성 (25점)
    if (metrics.growthAnalysis.earningsGrowth > 20) score += 25;
    else if (metrics.growthAnalysis.earningsGrowth > 15) score += 20;
    else if (metrics.growthAnalysis.earningsGrowth > 10) score += 15;
    else if (metrics.growthAnalysis.earningsGrowth > 5) score += 10;
    
    // 경영진 품질 (15점)
    score += metrics.managementQuality * 0.15;
    
    // 혁신성 (10점)
    score += metrics.innovationScore * 0.1;
    
    // 경쟁 우위 (5점)
    score += metrics.competitiveAdvantage * 0.05;
    
    // 장기 잠재력 (5점)
    score += metrics.longTermPotential * 0.05;
    
    return Math.round(score);
  }

  private getFisherGrade(score: number): string {
    if (score >= 85) return 'A+ (최상위 성장주)';
    if (score >= 75) return 'A (우수 성장주)';
    if (score >= 65) return 'B+ (양호 성장주)';
    if (score >= 55) return 'B (보통 성장주)';
    if (score >= 45) return 'C (주의 필요)';
    return 'D (투자 부적합)';
  }

  private getFisherRecommendation(
    checklistScore: number,
    fisherScore: number,
    investmentSuitability: string
  ): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    // 피셔 기준: 15포인트 체크리스트 중심
    if (investmentSuitability === 'Suitable' && checklistScore >= 12) return 'Strong Buy';
    if (investmentSuitability === 'Suitable' && checklistScore >= 10) return 'Buy';
    if (investmentSuitability === 'Marginal' || checklistScore >= 7) return 'Hold';
    if (checklistScore >= 5) return 'Sell';
    return 'Strong Sell';
  }
}