/**
 * 경영진 요약 섹션
 */

import { AnalysisResult } from '../../types/index.js';

export class ExecutiveSummarySection {
  static generate(data: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('## 1. 경영진 요약');
    lines.push('');
    
    // 투자 등급
    const upside = data.comprehensiveValuation?.upsideWeighted || 0;
    const rating = this.getInvestmentRating(upside);
    
    lines.push(`### 📊 투자 등급: ${rating}`);
    lines.push('');
    
    // 핵심 투자 포인트
    lines.push('### 💡 핵심 투자 포인트');
    const keyPoints = this.generateKeyPoints(data);
    keyPoints.forEach(point => lines.push(`- ${point}`));
    lines.push('');
    
    // 밸류에이션 요약
    lines.push('### 💰 밸류에이션 요약');
    lines.push('| 구분 | 값 | 상승여력 |');
    lines.push('|------|-----|----------|');
    
    const currentPrice = data.marketData?.currentPrice || 0;
    const comprehensive = data.comprehensiveValuation;
    
    if (comprehensive) {
      lines.push(`| 현재가 | ₩${currentPrice.toLocaleString()} | - |`);
      lines.push(`| 목표가 (가중평균) | ₩${comprehensive.weightedAverage.toLocaleString()} | ${comprehensive.upsideWeighted.toFixed(1)}% |`);
      lines.push(`| 보수적 목표가 | ₩${comprehensive.conservative.toLocaleString()} | ${comprehensive.upsideConservative.toFixed(1)}% |`);
      lines.push(`| 낙관적 목표가 | ₩${comprehensive.optimistic.toLocaleString()} | ${comprehensive.upsideOptimistic.toFixed(1)}% |`);
    }
    lines.push('');
    
    // 투자 의견
    lines.push('### 📝 투자 의견');
    lines.push(this.generateInvestmentOpinion(data, rating, upside));
    
    return lines.join('\n');
  }
  
  private static getInvestmentRating(upside: number): string {
    if (upside > 30) return '⭐⭐⭐⭐⭐ 적극 매수';
    if (upside > 15) return '⭐⭐⭐⭐ 매수';
    if (upside > -10) return '⭐⭐⭐ 보유';
    if (upside > -20) return '⭐⭐ 매도';
    return '⭐ 적극 매도';
  }
  
  private static generateKeyPoints(data: AnalysisResult): string[] {
    const points: string[] = [];
    
    // ROE 기반 포인트
    const roe = data.efficiencyMetrics?.roe || 0;
    if (roe > 20) {
      points.push(`뛰어난 자본 효율성 (ROE ${roe.toFixed(1)}%)`);
    } else if (roe > 15) {
      points.push(`양호한 자본 효율성 (ROE ${roe.toFixed(1)}%)`);
    }
    
    // 성장성 포인트
    const revenueGrowth = data.growthMetrics?.revenueGrowthEst || 0;
    if (revenueGrowth > 15) {
      points.push(`강력한 매출 성장세 (${revenueGrowth.toFixed(1)}% YoY)`);
    }
    
    // 밸류에이션 포인트
    const fund = Array.isArray(data.financialData) ? data.financialData[0] : data.financialData;
    if (fund?.per > 0 && fund.per < 10) {
      points.push(`저평가 구간 (PER ${fund.per}배)`);
    }
    
    // 배당 포인트
    if (fund?.div > 3) {
      points.push(`우수한 배당수익률 (${fund.div}%)`);
    }
    
    // 기술적 포인트
    if (data.technicalIndicators?.rsi < 30) {
      points.push('기술적 과매도 구간');
    } else if (data.technicalIndicators?.rsi > 70) {
      points.push('기술적 과매수 구간 주의');
    }
    
    return points;
  }
  
  private static generateInvestmentOpinion(data: AnalysisResult, rating: string, upside: number): string {
    const opinions: string[] = [];
    
    opinions.push(`${data.companyName}(${data.ticker})에 대한 종합 분석 결과, `);
    
    if (upside > 20) {
      opinions.push('현재 주가는 내재가치 대비 상당히 저평가되어 있습니다. ');
      opinions.push('다양한 밸류에이션 방법론을 통해 검증한 결과, ');
      opinions.push(`평균 ${upside.toFixed(1)}%의 상승 여력이 있는 것으로 판단됩니다. `);
    } else if (upside > 0) {
      opinions.push('현재 주가는 적정 수준에서 약간 저평가되어 있습니다. ');
      opinions.push(`제한적이지만 ${upside.toFixed(1)}%의 상승 여력이 존재합니다. `);
    } else {
      opinions.push('현재 주가는 내재가치를 상회하고 있습니다. ');
      opinions.push('단기적인 조정 가능성을 염두에 두시기 바랍니다. ');
    }
    
    // 리스크 언급
    opinions.push('\n\n');
    opinions.push('**주요 리스크 요인**: ');
    
    const risks: string[] = [];
    if (data.technicalIndicators?.rsi > 70) risks.push('기술적 과매수');
    if (data.riskMetrics?.maxDrawdown < -30) risks.push('높은 변동성');
    const fund = Array.isArray(data.financialData) ? data.financialData[0] : data.financialData;
    if (fund?.per > 25) risks.push('높은 밸류에이션');
    
    opinions.push(risks.length > 0 ? risks.join(', ') : '특별한 리스크 없음');
    
    return opinions.join('');
  }
}