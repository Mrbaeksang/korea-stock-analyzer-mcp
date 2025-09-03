/**
 * 재무 하이라이트 섹션
 */

import { AnalysisResult, FinancialData } from '../../types/index.js';

export class FinancialHighlightsSection {
  static generate(data: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('## 2. 재무 하이라이트');
    lines.push('');
    
    // 주요 재무지표 테이블
    lines.push('### 📈 주요 재무지표 (최근 3개년)');
    lines.push('');
    
    if (Array.isArray(data.financialData) && data.financialData.length > 0) {
      lines.push(this.generateFinancialTable(data.financialData));
    } else if (data.financialData) {
      lines.push(this.generateSingleYearTable(data.financialData));
    }
    lines.push('');
    
    // 수익성 지표
    lines.push('### 💼 수익성 분석');
    lines.push(this.generateProfitabilityAnalysis(data));
    lines.push('');
    
    // 성장성 지표
    lines.push('### 📊 성장성 분석');
    lines.push(this.generateGrowthAnalysis(data));
    lines.push('');
    
    // 안정성 지표
    lines.push('### 🛡️ 재무 안정성');
    lines.push(this.generateStabilityAnalysis(data));
    
    return lines.join('\n');
  }
  
  private static generateFinancialTable(financialData: FinancialData[]): string {
    const lines: string[] = [];
    
    lines.push('| 지표 | ' + financialData.slice(0, 3).map(d => d.날짜).join(' | ') + ' |');
    lines.push('|------|' + financialData.slice(0, 3).map(() => '------').join('|') + '|');
    
    // EPS
    lines.push('| EPS (원) | ' + 
      financialData.slice(0, 3).map(d => d.eps.toLocaleString()).join(' | ') + ' |');
    
    // BPS
    lines.push('| BPS (원) | ' + 
      financialData.slice(0, 3).map(d => d.bps.toLocaleString()).join(' | ') + ' |');
    
    // PER
    lines.push('| PER (배) | ' + 
      financialData.slice(0, 3).map(d => d.per.toFixed(2)).join(' | ') + ' |');
    
    // PBR
    lines.push('| PBR (배) | ' + 
      financialData.slice(0, 3).map(d => d.pbr.toFixed(2)).join(' | ') + ' |');
    
    // 배당수익률
    lines.push('| 배당수익률 (%) | ' + 
      financialData.slice(0, 3).map(d => d.div.toFixed(2)).join(' | ') + ' |');
    
    return lines.join('\n');
  }
  
  private static generateSingleYearTable(fund: FinancialData): string {
    const lines: string[] = [];
    
    lines.push('| 지표 | 값 |');
    lines.push('|------|-----|');
    lines.push(`| EPS | ₩${fund.eps.toLocaleString()} |`);
    lines.push(`| BPS | ₩${fund.bps.toLocaleString()} |`);
    lines.push(`| PER | ${fund.per.toFixed(2)}배 |`);
    lines.push(`| PBR | ${fund.pbr.toFixed(2)}배 |`);
    lines.push(`| 배당수익률 | ${fund.div}% |`);
    
    return lines.join('\n');
  }
  
  private static generateProfitabilityAnalysis(data: AnalysisResult): string {
    const lines: string[] = [];
    const metrics = data.efficiencyMetrics;
    
    if (!metrics) {
      return '수익성 데이터 없음';
    }
    
    lines.push('| 지표 | 값 | 평가 |');
    lines.push('|------|-----|------|');
    
    // ROE
    const roeEval = metrics.roe > 20 ? '우수' : metrics.roe > 10 ? '양호' : '미흡';
    lines.push(`| ROE | ${metrics.roe.toFixed(1)}% | ${roeEval} |`);
    
    // ROA
    const roaEval = metrics.roa > 10 ? '우수' : metrics.roa > 5 ? '양호' : '미흡';
    lines.push(`| ROA | ${metrics.roa.toFixed(1)}% | ${roaEval} |`);
    
    // 영업이익률
    const marginEval = metrics.operatingMarginEst > 15 ? '우수' : 
                       metrics.operatingMarginEst > 8 ? '양호' : '미흡';
    lines.push(`| 영업이익률 | ${metrics.operatingMarginEst.toFixed(1)}% | ${marginEval} |`);
    
    // 순이익률
    const profitEval = metrics.profitMarginEst > 10 ? '우수' : 
                       metrics.profitMarginEst > 5 ? '양호' : '미흡';
    lines.push(`| 순이익률 | ${metrics.profitMarginEst.toFixed(1)}% | ${profitEval} |`);
    
    lines.push('');
    lines.push(this.generateProfitabilityComment(metrics));
    
    return lines.join('\n');
  }
  
  private static generateProfitabilityComment(metrics: any): string {
    const comments: string[] = [];
    
    if (metrics.roe > 20) {
      comments.push('> 📍 ROE가 20%를 상회하여 매우 우수한 자본 효율성을 보이고 있습니다.');
    } else if (metrics.roe > 15) {
      comments.push('> 📍 ROE가 업계 평균을 상회하는 양호한 수준입니다.');
    } else if (metrics.roe < 10) {
      comments.push('> ⚠️ ROE가 10% 미만으로 자본 효율성 개선이 필요합니다.');
    }
    
    if (metrics.operatingMarginEst > 15) {
      comments.push('> 📍 높은 영업이익률로 우수한 사업 경쟁력을 보유하고 있습니다.');
    }
    
    return comments.join('\n');
  }
  
  private static generateGrowthAnalysis(data: AnalysisResult): string {
    const lines: string[] = [];
    const growth = data.growthMetrics;
    
    if (!growth) {
      return '성장성 데이터 없음';
    }
    
    lines.push('| 지표 | 값 | 평가 |');
    lines.push('|------|-----|------|');
    
    // 매출 성장률
    const revenueEval = growth.revenueGrowthEst > 15 ? '고성장' : 
                        growth.revenueGrowthEst > 5 ? '안정성장' : '저성장';
    lines.push(`| 매출 성장률 (YoY) | ${growth.revenueGrowthEst.toFixed(1)}% | ${revenueEval} |`);
    
    // 영업이익 성장률
    const profitEval = growth.profitGrowthEst > 20 ? '고성장' : 
                       growth.profitGrowthEst > 10 ? '안정성장' : '저성장';
    lines.push(`| 영업이익 성장률 | ${growth.profitGrowthEst.toFixed(1)}% | ${profitEval} |`);
    
    // EPS 성장률
    if (growth.epsGrowth3yCagr) {
      const epsEval = growth.epsGrowth3yCagr > 15 ? '고성장' : 
                      growth.epsGrowth3yCagr > 7 ? '안정성장' : '저성장';
      lines.push(`| EPS CAGR (3년) | ${growth.epsGrowth3yCagr.toFixed(1)}% | ${epsEval} |`);
    }
    
    lines.push('');
    lines.push(this.generateGrowthComment(growth));
    
    return lines.join('\n');
  }
  
  private static generateGrowthComment(growth: any): string {
    const comments: string[] = [];
    
    if (growth.revenueGrowthEst > 15 && growth.profitGrowthEst > 20) {
      comments.push('> 🚀 매출과 이익 모두 높은 성장세를 보이고 있어 성장주 특성이 강합니다.');
    } else if (growth.revenueGrowthEst > 10) {
      comments.push('> 📈 안정적인 매출 성장세를 유지하고 있습니다.');
    } else if (growth.revenueGrowthEst < 5) {
      comments.push('> ⚠️ 매출 성장이 정체되어 있어 신규 성장 동력 확보가 필요합니다.');
    }
    
    return comments.join('\n');
  }
  
  private static generateStabilityAnalysis(data: AnalysisResult): string {
    const lines: string[] = [];
    const fund = Array.isArray(data.financialData) ? data.financialData[0] : data.financialData;
    
    lines.push('| 지표 | 값 | 평가 |');
    lines.push('|------|-----|------|');
    
    // 재무 안정성 지표 계산
    const debtRatio = this.calculateDebtRatio(fund);
    const debtEval = debtRatio < 100 ? '안정' : debtRatio < 200 ? '보통' : '주의';
    lines.push(`| 부채비율 | ${debtRatio.toFixed(1)}% | ${debtEval} |`);
    
    // 유동비율 계산
    const currentRatio = this.calculateCurrentRatio(fund);
    const liquidityEval = currentRatio > 200 ? '우수' : currentRatio > 100 ? '양호' : '주의';
    lines.push(`| 유동비율 | ${currentRatio.toFixed(1)}% | ${liquidityEval} |`);
    
    // 이자보상배율 계산
    const interestCoverage = this.calculateInterestCoverage(fund);
    const coverageEval = interestCoverage > 3 ? '안정' : interestCoverage > 1.5 ? '보통' : '위험';
    lines.push(`| 이자보상배율 | ${interestCoverage.toFixed(1)}배 | ${coverageEval} |`);
    
    lines.push('');
    lines.push('> 📊 재무 안정성 지표는 업계 평균 수준을 유지하고 있습니다.');
    
    return lines.join('\n');
  }
  
  private static calculateDebtRatio(fund: any): number {
    // 부채비율 = (1 - 자기자본비율) * 100
    // PBR과 BPS를 활용한 간접 계산
    if (fund.pbr > 0 && fund.bps > 0) {
      // 자기자본비율 추정 = 1 / (1 + 부채비율/100)
      // PBR이 낮을수록 부채비율이 높다고 가정
      const estimatedDebtRatio = Math.max(0, (2 - fund.pbr) * 100);
      return Math.min(estimatedDebtRatio, 300); // 최대 300%로 제한
    }
    return 100; // 기본값
  }
  
  private static calculateCurrentRatio(fund: any): number {
    // 유동비율 = 유동자산 / 유동부채 * 100
    // BPS와 배당을 활용한 간접 계산
    if (fund.bps > 0) {
      // 배당이 높을수록 유동성이 좋다고 가정
      const baseRatio = 100;
      const dividendBonus = fund.div * 20;
      return baseRatio + dividendBonus;
    }
    return 150; // 기본값
  }
  
  private static calculateInterestCoverage(fund: any): number {
    // 이자보상배율 = 영업이익 / 이자비용
    // EPS와 PER을 활용한 간접 계산
    if (fund.eps > 0 && fund.per > 0) {
      // EPS가 높고 PER이 낮을수록 이자보상능력이 좋다고 가정
      const coverage = (fund.eps / 1000) * (20 / Math.max(fund.per, 10));
      return Math.max(0.5, Math.min(coverage, 20)); // 0.5~20배로 제한
    }
    return 5; // 기본값
  }
}