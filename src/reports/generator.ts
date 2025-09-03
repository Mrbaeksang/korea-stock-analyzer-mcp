/**
 * 보고서 생성 메인 클래스
 */

import { AnalysisResult } from '../types/index.js';
import { ExecutiveSummarySection } from './sections/executive.js';
import { FinancialHighlightsSection } from './sections/financial.js';
import { TechnicalAnalysisSection } from './sections/technical.js';
import { GuruAnalysisSection } from './sections/guru.js';
import { RiskAnalysisSection } from './sections/risk.js';
import { ScenarioAnalysisSection } from './sections/scenario.js';

export class ReportGenerator {
  /**
   * 전체 보고서 생성
   */
  static async generateFullReport(data: AnalysisResult): Promise<string> {
    const sections: string[] = [];
    
    // 헤더
    sections.push(this.generateHeader(data));
    
    // 각 섹션 생성
    sections.push(ExecutiveSummarySection.generate(data));
    sections.push(FinancialHighlightsSection.generate(data));
    sections.push(TechnicalAnalysisSection.generate(data));
    sections.push(GuruAnalysisSection.generate(data));
    sections.push(RiskAnalysisSection.generate(data));
    sections.push(ScenarioAnalysisSection.generate(data));
    
    // 푸터
    sections.push(this.generateFooter());
    
    return sections.join('\n\n');
  }

  /**
   * 요약 보고서 생성
   */
  static async generateSummaryReport(data: AnalysisResult): Promise<string> {
    const sections: string[] = [];
    
    sections.push(`# ${data.companyName} (${data.ticker}) - 투자 요약`);
    sections.push('');
    
    const upside = data.comprehensiveValuation?.upsideWeighted || 0;
    const rating = this.getRating(upside);
    
    sections.push(`## 투자 등급: ${rating}`);
    sections.push(`- 현재가: ₩${data.marketData?.currentPrice?.toLocaleString()}`);
    sections.push(`- 목표가: ₩${data.comprehensiveValuation?.weightedAverage?.toLocaleString()}`);
    sections.push(`- 상승여력: ${upside.toFixed(1)}%`);
    sections.push('');
    
    sections.push('## 핵심 지표');
    const fund = Array.isArray(data.financialData) ? data.financialData[0] : data.financialData;
    sections.push(`- PER: ${fund?.per}`);
    sections.push(`- PBR: ${fund?.pbr}`);
    sections.push(`- ROE: ${data.efficiencyMetrics?.roe}%`);
    sections.push(`- 배당수익률: ${fund?.div}%`);
    
    return sections.join('\n');
  }

  private static generateHeader(data: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('# 📊 전문 투자 분석 보고서');
    lines.push('');
    lines.push(`## ${data.companyName} (${data.ticker})`);
    lines.push('');
    lines.push('```');
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push(`│ 발행일: ${new Date().toLocaleDateString('ko-KR')}                                  │`);
    lines.push('│ 분석: 한국 주식 전문 분석 시스템 v3.0                      │');
    lines.push('│ 데이터: 한국거래소(KRX) via pykrx                          │');
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push('```');
    
    return lines.join('\n');
  }

  private static generateFooter(): string {
    const lines: string[] = [];
    
    lines.push('---');
    lines.push('');
    lines.push('## 📎 부록');
    lines.push('');
    lines.push('### 데이터 품질 및 한계');
    lines.push('- 데이터 출처: 한국거래소(KRX) via pykrx');
    lines.push('- 분석 일시: ' + new Date().toISOString());
    lines.push('- 일부 지표는 추정치 포함');
    lines.push('');
    lines.push('### 면책 조항');
    lines.push('> 본 보고서는 정보 제공 목적으로만 작성되었으며 투자 권유가 아닙니다.');
    lines.push('> 모든 투자 결정은 개인의 판단과 책임하에 이루어져야 합니다.');
    lines.push('');
    lines.push('---');
    lines.push('*한국 주식 전문 분석 시스템 v3.0*');
    
    return lines.join('\n');
  }

  private static getRating(upside: number): string {
    if (upside > 30) return '적극 매수';
    if (upside > 15) return '매수';
    if (upside > -10) return '보유';
    if (upside > -20) return '매도';
    return '적극 매도';
  }
}