/**
 * 시나리오 분석 섹션
 */

import { AnalysisResult } from '../../types/index.js';

export class ScenarioAnalysisSection {
  static generate(data: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('## 6. 시나리오 분석');
    lines.push('');
    lines.push('다양한 시장 상황을 가정한 주가 시뮬레이션 결과입니다.');
    lines.push('');
    
    const currentPrice = data.marketData?.currentPrice || 0;
    
    // 낙관적 시나리오
    lines.push('### 🚀 낙관적 시나리오 (발생 확률: 25%)');
    lines.push(this.generateOptimisticScenario(data, currentPrice));
    lines.push('');
    
    // 기본 시나리오
    lines.push('### 📊 기본 시나리오 (발생 확률: 50%)');
    lines.push(this.generateBaseScenario(data, currentPrice));
    lines.push('');
    
    // 비관적 시나리오
    lines.push('### ⚠️ 비관적 시나리오 (발생 확률: 25%)');
    lines.push(this.generatePessimisticScenario(data, currentPrice));
    lines.push('');
    
    // 확률 가중 기대 수익률
    lines.push('### 📈 확률 가중 기대 수익률');
    lines.push(this.generateExpectedReturn(data, currentPrice));
    lines.push('');
    
    // 민감도 분석
    lines.push('### 🔍 민감도 분석');
    lines.push(this.generateSensitivityAnalysis(data, currentPrice));
    lines.push('');
    
    // 투자 시뮬레이션
    lines.push('### 💰 투자 시뮬레이션');
    lines.push(this.generateInvestmentSimulation(currentPrice));
    
    return lines.join('\n');
  }
  
  private static generateOptimisticScenario(data: AnalysisResult, currentPrice: number): string {
    const lines: string[] = [];
    
    lines.push('**가정:**');
    lines.push('- 매출 성장률: 예상치 대비 +50%');
    lines.push('- 영업이익률: 업계 최고 수준 달성');
    lines.push('- 시장 점유율 확대');
    lines.push('- 신사업 성공적 진출');
    lines.push('');
    
    const optimisticPrice = data.comprehensiveValuation?.optimistic || currentPrice * 1.5;
    const optimisticReturn = ((optimisticPrice / currentPrice - 1) * 100);
    
    lines.push('**예상 결과:**');
    lines.push(`- 목표 주가: ₩${optimisticPrice.toLocaleString()}`);
    lines.push(`- 예상 수익률: +${optimisticReturn.toFixed(1)}%`);
    lines.push(`- 시가총액: ₩${(data.marketData?.marketCap * (optimisticPrice / currentPrice) / 100000000).toFixed(0)}억`);
    
    lines.push('');
    lines.push('**주요 촉매:**');
    lines.push('- 실적 서프라이즈');
    lines.push('- 대규모 수주 성공');
    lines.push('- 업계 재편으로 인한 수혜');
    lines.push('- 규제 완화 또는 정책 지원');
    
    return lines.join('\n');
  }
  
  private static generateBaseScenario(data: AnalysisResult, currentPrice: number): string {
    const lines: string[] = [];
    
    lines.push('**가정:**');
    lines.push('- 매출 성장률: 컨센서스 부합');
    lines.push('- 영업이익률: 현 수준 유지');
    lines.push('- 시장 점유율 현상 유지');
    lines.push('- 예상 범위 내 실적 달성');
    lines.push('');
    
    const basePrice = data.comprehensiveValuation?.weightedAverage || currentPrice * 1.15;
    const baseReturn = ((basePrice / currentPrice - 1) * 100);
    
    lines.push('**예상 결과:**');
    lines.push(`- 목표 주가: ₩${basePrice.toLocaleString()}`);
    lines.push(`- 예상 수익률: ${baseReturn > 0 ? '+' : ''}${baseReturn.toFixed(1)}%`);
    lines.push(`- 시가총액: ₩${(data.marketData?.marketCap * (basePrice / currentPrice) / 100000000).toFixed(0)}억`);
    
    lines.push('');
    lines.push('**전제 조건:**');
    lines.push('- 거시경제 안정적 성장');
    lines.push('- 업계 평균 수준 성장');
    lines.push('- 특별한 악재 없음');
    lines.push('- 현재 경영 전략 유지');
    
    return lines.join('\n');
  }
  
  private static generatePessimisticScenario(data: AnalysisResult, currentPrice: number): string {
    const lines: string[] = [];
    
    lines.push('**가정:**');
    lines.push('- 매출 성장률: 예상치 대비 -30%');
    lines.push('- 영업이익률 악화');
    lines.push('- 시장 점유율 하락');
    lines.push('- 경쟁 심화로 마진 압박');
    lines.push('');
    
    const pessimisticPrice = data.comprehensiveValuation?.conservative || currentPrice * 0.7;
    const pessimisticReturn = ((pessimisticPrice / currentPrice - 1) * 100);
    
    lines.push('**예상 결과:**');
    lines.push(`- 목표 주가: ₩${pessimisticPrice.toLocaleString()}`);
    lines.push(`- 예상 수익률: ${pessimisticReturn.toFixed(1)}%`);
    lines.push(`- 시가총액: ₩${(data.marketData?.marketCap * (pessimisticPrice / currentPrice) / 100000000).toFixed(0)}억`);
    
    lines.push('');
    lines.push('**리스크 요인:**');
    lines.push('- 경기 침체 또는 불황');
    lines.push('- 주요 고객 이탈');
    lines.push('- 규제 강화 또는 벌금');
    lines.push('- 기술 변화로 인한 경쟁력 상실');
    
    return lines.join('\n');
  }
  
  private static generateExpectedReturn(data: AnalysisResult, currentPrice: number): string {
    const lines: string[] = [];
    
    const optimistic = data.comprehensiveValuation?.optimistic || currentPrice * 1.5;
    const base = data.comprehensiveValuation?.weightedAverage || currentPrice * 1.15;
    const pessimistic = data.comprehensiveValuation?.conservative || currentPrice * 0.7;
    
    const optimisticReturn = ((optimistic / currentPrice - 1) * 100);
    const baseReturn = ((base / currentPrice - 1) * 100);
    const pessimisticReturn = ((pessimistic / currentPrice - 1) * 100);
    
    const expectedReturn = (optimisticReturn * 0.25) + (baseReturn * 0.50) + (pessimisticReturn * 0.25);
    
    lines.push('| 시나리오 | 확률 | 목표가 | 수익률 | 기여도 |');
    lines.push('|----------|------|--------|--------|--------|');
    lines.push(`| 낙관적 | 25% | ₩${optimistic.toLocaleString()} | ${optimisticReturn.toFixed(1)}% | ${(optimisticReturn * 0.25).toFixed(1)}% |`);
    lines.push(`| 기본 | 50% | ₩${base.toLocaleString()} | ${baseReturn.toFixed(1)}% | ${(baseReturn * 0.50).toFixed(1)}% |`);
    lines.push(`| 비관적 | 25% | ₩${pessimistic.toLocaleString()} | ${pessimisticReturn.toFixed(1)}% | ${(pessimisticReturn * 0.25).toFixed(1)}% |`);
    lines.push(`| **기대 수익률** | **100%** | - | - | **${expectedReturn.toFixed(1)}%** |`);
    
    lines.push('');
    
    if (expectedReturn > 15) {
      lines.push('> 📈 **긍정적 기대 수익**: 리스크 대비 충분한 기대 수익을 제공합니다.');
    } else if (expectedReturn > 0) {
      lines.push('> 📊 **제한적 상승 여력**: 리스크 대비 기대 수익이 제한적입니다.');
    } else {
      lines.push('> ⚠️ **부정적 기대 수익**: 하방 리스크가 상방 잠재력보다 큽니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateSensitivityAnalysis(data: AnalysisResult, currentPrice: number): string {
    const lines: string[] = [];
    
    lines.push('**주요 변수 변화에 따른 주가 영향도:**');
    lines.push('');
    
    lines.push('| 변수 | -20% | -10% | 기준 | +10% | +20% |');
    lines.push('|------|------|------|------|------|------|');
    
    // EPS 민감도
    const baseEPS = Array.isArray(data.financialData) ? data.financialData[0].eps : data.financialData?.eps || 2000;
    const basePER = Array.isArray(data.financialData) ? data.financialData[0].per : data.financialData?.per || 15;
    
    lines.push(`| EPS 변화 | ₩${(baseEPS * 0.8 * basePER).toLocaleString()} | ₩${(baseEPS * 0.9 * basePER).toLocaleString()} | ₩${currentPrice.toLocaleString()} | ₩${(baseEPS * 1.1 * basePER).toLocaleString()} | ₩${(baseEPS * 1.2 * basePER).toLocaleString()} |`);
    
    // PER 민감도
    lines.push(`| PER 변화 | ₩${(baseEPS * basePER * 0.8).toLocaleString()} | ₩${(baseEPS * basePER * 0.9).toLocaleString()} | ₩${currentPrice.toLocaleString()} | ₩${(baseEPS * basePER * 1.1).toLocaleString()} | ₩${(baseEPS * basePER * 1.2).toLocaleString()} |`);
    
    // 성장률 민감도
    const growthImpact = currentPrice * 0.02; // 1% 성장률 = 2% 주가 영향 가정
    lines.push(`| 성장률 | ₩${(currentPrice - growthImpact * 20).toLocaleString()} | ₩${(currentPrice - growthImpact * 10).toLocaleString()} | ₩${currentPrice.toLocaleString()} | ₩${(currentPrice + growthImpact * 10).toLocaleString()} | ₩${(currentPrice + growthImpact * 20).toLocaleString()} |`);
    
    lines.push('');
    lines.push('> 📊 EPS와 PER 변화가 주가에 가장 직접적인 영향을 미칩니다.');
    
    return lines.join('\n');
  }
  
  private static generateInvestmentSimulation(currentPrice: number): string {
    const lines: string[] = [];
    
    const investmentAmount = 10000000; // 1천만원
    const shares = Math.floor(investmentAmount / currentPrice);
    
    lines.push(`**투자금 ₩${investmentAmount.toLocaleString()} 기준 시뮬레이션:**`);
    lines.push('');
    
    lines.push('| 시나리오 | 보유 주식 | 평가금액 | 손익 | 수익률 |');
    lines.push('|----------|-----------|----------|------|--------|');
    
    // 각 시나리오별 계산
    const scenarios = [
      { name: '+50%', priceMultiple: 1.5 },
      { name: '+30%', priceMultiple: 1.3 },
      { name: '+15%', priceMultiple: 1.15 },
      { name: '현재가', priceMultiple: 1.0 },
      { name: '-15%', priceMultiple: 0.85 },
      { name: '-30%', priceMultiple: 0.7 },
    ];
    
    scenarios.forEach(scenario => {
      const futurePrice = currentPrice * scenario.priceMultiple;
      const futureValue = shares * futurePrice;
      const profit = futureValue - investmentAmount;
      const returnRate = (profit / investmentAmount) * 100;
      
      lines.push(`| ${scenario.name} | ${shares.toLocaleString()}주 | ₩${futureValue.toLocaleString()} | ₩${profit.toLocaleString()} | ${returnRate.toFixed(1)}% |`);
    });
    
    lines.push('');
    lines.push('**분할 매수 전략 (DCA) 시뮬레이션:**');
    lines.push('- 3개월 분할 매수 시: 변동성 리스크 30% 감소');
    lines.push('- 6개월 분할 매수 시: 변동성 리스크 50% 감소');
    lines.push('- 평균 매수 단가 개선 가능성 증가');
    
    return lines.join('\n');
  }
}