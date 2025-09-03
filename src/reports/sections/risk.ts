/**
 * 리스크 분석 섹션
 */

import { AnalysisResult } from '../../types/index.js';

export class RiskAnalysisSection {
  static generate(data: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('## 5. 리스크 분석');
    lines.push('');
    
    const risk = data.riskMetrics;
    const market = data.marketData;
    
    // 변동성 분석
    lines.push('### 📊 변동성 분석');
    lines.push(this.generateVolatilityAnalysis(risk));
    lines.push('');
    
    // 수익률 분석
    lines.push('### 📈 수익률 분석');
    lines.push(this.generateReturnAnalysis(market));
    lines.push('');
    
    // 리스크 지표
    lines.push('### ⚠️ 리스크 지표');
    lines.push(this.generateRiskMetrics(risk));
    lines.push('');
    
    // 시장 리스크
    lines.push('### 🌍 시장 리스크');
    lines.push(this.generateMarketRisk(risk, market));
    lines.push('');
    
    // 기업 고유 리스크
    lines.push('### 🏢 기업 고유 리스크');
    lines.push(this.generateCompanyRisk(data));
    lines.push('');
    
    // 종합 리스크 평가
    lines.push('### 🎯 종합 리스크 평가');
    lines.push(this.generateRiskSummary(data));
    
    return lines.join('\n');
  }
  
  private static generateVolatilityAnalysis(risk: any): string {
    const lines: string[] = [];
    
    if (!risk) {
      return '변동성 데이터 없음';
    }
    
    lines.push('| 지표 | 값 | 평가 |');
    lines.push('|------|-----|------|');
    
    // 일일 변동성
    const dailyVolEval = risk.dailyVolatility > 3 ? '높음' : 
                         risk.dailyVolatility > 2 ? '보통' : '낮음';
    lines.push(`| 일일 변동성 | ${risk.dailyVolatility?.toFixed(2)}% | ${dailyVolEval} |`);
    
    // 연간 변동성
    const annualVolEval = risk.annualVolatility > 40 ? '매우 높음' : 
                          risk.annualVolatility > 30 ? '높음' : 
                          risk.annualVolatility > 20 ? '보통' : '낮음';
    lines.push(`| 연간 변동성 | ${risk.annualVolatility?.toFixed(2)}% | ${annualVolEval} |`);
    
    // 최대 낙폭
    const drawdownEval = risk.maxDrawdown < -30 ? '매우 높음' : 
                        risk.maxDrawdown < -20 ? '높음' : 
                        risk.maxDrawdown < -10 ? '보통' : '낮음';
    lines.push(`| 최대 낙폭 | ${risk.maxDrawdown?.toFixed(2)}% | ${drawdownEval} |`);
    
    lines.push('');
    
    if (risk.annualVolatility > 40) {
      lines.push('> ⚠️ **고변동성 종목**: 단기 변동성이 매우 높아 리스크 관리가 필요합니다.');
    } else if (risk.annualVolatility > 30) {
      lines.push('> ⚠️ **변동성 주의**: 평균 이상의 변동성을 보이고 있습니다.');
    } else {
      lines.push('> ✅ **안정적 변동성**: 상대적으로 안정적인 가격 움직임을 보이고 있습니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateReturnAnalysis(market: any): string {
    const lines: string[] = [];
    
    if (!market) {
      return '수익률 데이터 없음';
    }
    
    lines.push('| 기간 | 수익률 | 평가 |');
    lines.push('|------|--------|------|');
    
    // 1개월 수익률
    const month1Eval = market.monthReturn > 10 ? '강세' : 
                       market.monthReturn > 0 ? '상승' : 
                       market.monthReturn > -10 ? '하락' : '급락';
    lines.push(`| 1개월 | ${market.monthReturn?.toFixed(2)}% | ${month1Eval} |`);
    
    // 3개월 수익률
    const month3Eval = market.month3Return > 20 ? '강세' : 
                       market.month3Return > 0 ? '상승' : 
                       market.month3Return > -20 ? '하락' : '급락';
    lines.push(`| 3개월 | ${market.month3Return?.toFixed(2)}% | ${month3Eval} |`);
    
    // 6개월 수익률
    const month6Eval = market.month6Return > 30 ? '강세' : 
                       market.month6Return > 0 ? '상승' : 
                       market.month6Return > -30 ? '하락' : '급락';
    lines.push(`| 6개월 | ${market.month6Return?.toFixed(2)}% | ${month6Eval} |`);
    
    // 연간 수익률
    const yearEval = market.yearReturn > 50 ? '급등' : 
                     market.yearReturn > 20 ? '강세' : 
                     market.yearReturn > 0 ? '상승' : 
                     market.yearReturn > -20 ? '하락' : '급락';
    lines.push(`| 1년 | ${market.yearReturn?.toFixed(2)}% | ${yearEval} |`);
    
    lines.push('');
    
    // 수익률 트렌드 분석
    if (market.monthReturn > 0 && market.month3Return > 0 && market.yearReturn > 0) {
      lines.push('> 📈 **상승 트렌드**: 모든 기간에서 양의 수익률을 기록하고 있습니다.');
    } else if (market.monthReturn < 0 && market.month3Return < 0) {
      lines.push('> 📉 **하락 트렌드**: 최근 하락세가 지속되고 있어 주의가 필요합니다.');
    } else {
      lines.push('> 📊 **혼조세**: 기간별 수익률이 엇갈리고 있습니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateRiskMetrics(risk: any): string {
    const lines: string[] = [];
    
    if (!risk) {
      return '리스크 지표 데이터 없음';
    }
    
    lines.push('| 지표 | 값 | 해석 |');
    lines.push('|------|-----|------|');
    
    // 샤프 비율
    const sharpeEval = risk.sharpeRatio > 1 ? '우수' : 
                       risk.sharpeRatio > 0.5 ? '양호' : 
                       risk.sharpeRatio > 0 ? '보통' : '미흡';
    lines.push(`| 샤프 비율 | ${risk.sharpeRatio?.toFixed(3)} | ${sharpeEval} |`);
    
    // 베타
    const betaEval = risk.beta > 1.5 ? '고위험' : 
                     risk.beta > 1 ? '시장 이상' : 
                     risk.beta > 0.5 ? '시장 이하' : '저위험';
    lines.push(`| 베타 (β) | ${risk.beta?.toFixed(3)} | ${betaEval} |`);
    
    // VaR (95%)
    lines.push(`| VaR (95%) | ${risk.var95?.toFixed(2)}% | 5% 확률로 이 이상 손실 |`);
    
    // CVaR (95%)
    lines.push(`| CVaR (95%) | ${risk.cvar95?.toFixed(2)}% | 극단적 손실 예상치 |`);
    
    lines.push('');
    
    // 리스크 수준 평가
    if (risk.sharpeRatio > 1 && risk.beta < 1.2) {
      lines.push('> ✅ **리스크 대비 수익 우수**: 낮은 리스크로 양호한 수익을 제공하고 있습니다.');
    } else if (risk.beta > 1.5) {
      lines.push('> ⚠️ **고위험 종목**: 시장 대비 높은 변동성을 보이고 있습니다.');
    } else {
      lines.push('> 📊 **보통 리스크**: 시장 평균 수준의 리스크를 보이고 있습니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateMarketRisk(risk: any, market: any): string {
    const lines: string[] = [];
    
    lines.push('**시장 연관성 분석:**');
    lines.push('');
    
    if (risk?.beta) {
      if (risk.beta > 1.5) {
        lines.push('- 🔴 **고베타 종목**: 시장 변동에 1.5배 이상 반응');
        lines.push('- 시장 하락 시 더 큰 폭으로 하락할 위험');
        lines.push('- 공격적 투자자에게 적합');
      } else if (risk.beta > 1) {
        lines.push('- 🟡 **시장 민감 종목**: 시장 움직임과 유사하거나 약간 높은 변동성');
        lines.push('- 일반적인 성장주 특성');
      } else if (risk.beta > 0.5) {
        lines.push('- 🟢 **방어적 종목**: 시장 변동에 상대적으로 둔감');
        lines.push('- 안정적 투자 선호 투자자에게 적합');
      } else {
        lines.push('- ⚪ **저베타 종목**: 시장과 낮은 상관관계');
        lines.push('- 포트폴리오 분산 효과 우수');
      }
    }
    
    lines.push('');
    lines.push('**외부 요인 리스크:**');
    lines.push('- 금리 변동 리스크');
    lines.push('- 환율 변동 리스크');
    lines.push('- 규제 변화 리스크');
    lines.push('- 경기 순환 리스크');
    
    return lines.join('\n');
  }
  
  private static generateCompanyRisk(data: AnalysisResult): string {
    const lines: string[] = [];
    const risks: string[] = [];
    
    // 재무 리스크 체크
    const fund = Array.isArray(data.financialData) ? data.financialData[0] : data.financialData;
    if (fund) {
      if (fund.per > 30) {
        risks.push('- 📊 **밸류에이션 리스크**: PER이 30배를 초과하여 고평가 우려');
      }
      if (fund.eps < 0) {
        risks.push('- 💰 **수익성 리스크**: 적자 상태로 수익 개선 필요');
      }
      if (fund.div === 0) {
        risks.push('- 💵 **배당 리스크**: 무배당 상태');
      }
    }
    
    // 성장 리스크 체크
    if (data.growthMetrics) {
      if (data.growthMetrics.revenueGrowthEst < 0) {
        risks.push('- 📉 **성장 정체 리스크**: 매출 역성장 중');
      }
      if (data.growthMetrics.profitGrowthEst < -10) {
        risks.push('- 📉 **이익 감소 리스크**: 영업이익 급감');
      }
    }
    
    // 효율성 리스크 체크
    if (data.efficiencyMetrics) {
      if (data.efficiencyMetrics.roe < 5) {
        risks.push('- ⚠️ **자본 효율성 리스크**: ROE 5% 미만');
      }
      if (data.efficiencyMetrics.profitMarginEst < 3) {
        risks.push('- ⚠️ **마진 리스크**: 순이익률 3% 미만');
      }
    }
    
    if (risks.length > 0) {
      lines.push('**주요 기업 리스크:**');
      lines.push('');
      risks.forEach(risk => lines.push(risk));
    } else {
      lines.push('> ✅ 특별한 기업 고유 리스크는 발견되지 않았습니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateRiskSummary(data: AnalysisResult): string {
    const lines: string[] = [];
    const riskLevel = this.calculateOverallRiskLevel(data);
    
    lines.push(`**종합 리스크 등급: ${riskLevel.grade}**`);
    lines.push('');
    
    lines.push('| 리스크 유형 | 수준 | 가중치 |');
    lines.push('|-------------|------|--------|');
    lines.push(`| 시장 리스크 | ${riskLevel.market} | 30% |`);
    lines.push(`| 기업 리스크 | ${riskLevel.company} | 30% |`);
    lines.push(`| 유동성 리스크 | ${riskLevel.liquidity} | 20% |`);
    lines.push(`| 밸류에이션 리스크 | ${riskLevel.valuation} | 20% |`);
    
    lines.push('');
    lines.push('**리스크 관리 제언:**');
    
    if (riskLevel.grade === '높음' || riskLevel.grade === '매우 높음') {
      lines.push('> ⚠️ **주의 필요**: 높은 리스크 수준으로 신중한 접근이 필요합니다.');
      lines.push('> - 분할 매수 전략 고려');
      lines.push('> - 손절매 기준 설정 필수');
      lines.push('> - 포트폴리오 비중 제한 (5% 이하)');
    } else if (riskLevel.grade === '보통') {
      lines.push('> 📊 **일반적 수준**: 시장 평균 수준의 리스크입니다.');
      lines.push('> - 적정 비중 투자 가능');
      lines.push('> - 정기적 모니터링 필요');
    } else {
      lines.push('> ✅ **낮은 리스크**: 상대적으로 안정적인 투자 대상입니다.');
      lines.push('> - 장기 투자 적합');
      lines.push('> - 포트폴리오 핵심 종목으로 고려 가능');
    }
    
    return lines.join('\n');
  }
  
  private static calculateOverallRiskLevel(data: AnalysisResult): any {
    const result = {
      grade: '보통',
      market: '보통',
      company: '보통',
      liquidity: '보통',
      valuation: '보통'
    };
    
    // 시장 리스크 평가
    if (data.riskMetrics?.beta > 1.5) {
      result.market = '높음';
    } else if (data.riskMetrics?.beta < 0.7) {
      result.market = '낮음';
    }
    
    // 기업 리스크 평가
    const fund = Array.isArray(data.financialData) ? data.financialData[0] : data.financialData;
    if (fund?.eps < 0 || data.efficiencyMetrics?.roe < 5) {
      result.company = '높음';
    } else if (data.efficiencyMetrics?.roe > 15) {
      result.company = '낮음';
    }
    
    // 유동성 리스크 평가
    if (data.marketData?.volume < data.marketData?.volumeAvg20 * 0.5) {
      result.liquidity = '높음';
    } else if (data.marketData?.volume > data.marketData?.volumeAvg20 * 1.5) {
      result.liquidity = '낮음';
    }
    
    // 밸류에이션 리스크 평가
    if (fund?.per > 30 || fund?.pbr > 5) {
      result.valuation = '높음';
    } else if (fund?.per < 10 && fund?.pbr < 1) {
      result.valuation = '낮음';
    }
    
    // 종합 등급 계산
    const highCount = Object.values(result).filter(v => v === '높음').length;
    const lowCount = Object.values(result).filter(v => v === '낮음').length;
    
    if (highCount >= 3) {
      result.grade = '매우 높음';
    } else if (highCount >= 2) {
      result.grade = '높음';
    } else if (lowCount >= 3) {
      result.grade = '낮음';
    } else {
      result.grade = '보통';
    }
    
    return result;
  }
}