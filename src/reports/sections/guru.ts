/**
 * 투자 대가 분석 섹션
 */

import { AnalysisResult } from '../../types/index.js';

export class GuruAnalysisSection {
  static generate(data: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('## 4. 투자 대가 관점 분석');
    lines.push('');
    lines.push('세계적인 투자 대가들의 투자 철학과 방법론을 적용한 종합 분석입니다.');
    lines.push('');
    
    const valuations = data.valuations;
    
    if (!valuations) {
      lines.push('투자 대가 분석 데이터 없음');
      return lines.join('\n');
    }
    
    // 워런 버핏 분석
    if (valuations.buffett) {
      lines.push('### 🎩 워런 버핏 - 가치투자의 대가');
      lines.push(this.generateBuffettAnalysis(valuations.buffett));
      lines.push('');
    }
    
    // 피터 린치 분석
    if (valuations.lynch) {
      lines.push('### 📈 피터 린치 - 성장주 투자의 달인');
      lines.push(this.generateLynchAnalysis(valuations.lynch));
      lines.push('');
    }
    
    // 벤저민 그레이엄 분석
    if (valuations.graham) {
      lines.push('### 📚 벤저민 그레이엄 - 가치투자의 아버지');
      lines.push(this.generateGrahamAnalysis(valuations.graham));
      lines.push('');
    }
    
    // 조엘 그린블라트 분석
    if (valuations.greenblatt) {
      lines.push('### 🎯 조엘 그린블라트 - 매직 포뮬러');
      lines.push(this.generateGreenblattAnalysis(valuations.greenblatt));
      lines.push('');
    }
    
    // 필립 피셔 분석
    if (valuations.fisher) {
      lines.push('### 🔍 필립 피셔 - 성장주 투자');
      lines.push(this.generateFisherAnalysis(valuations.fisher));
      lines.push('');
    }
    
    // 존 템플턴 분석
    if (valuations.templeton) {
      lines.push('### 🌏 존 템플턴 - 역발상 투자');
      lines.push(this.generateTempletonAnalysis(valuations.templeton));
      lines.push('');
    }
    
    // 종합 요약
    lines.push('### 📊 투자 대가 종합 평가');
    lines.push(this.generateGuruSummary(valuations));
    
    return lines.join('\n');
  }
  
  private static generateBuffettAnalysis(buffett: any): string {
    const lines: string[] = [];
    
    lines.push('**투자 철학**: 훌륭한 기업을 적정 가격에 매수하여 장기 보유');
    lines.push('');
    lines.push('| 평가 항목 | 값 | 평가 |');
    lines.push('|-----------|-----|------|');
    lines.push(`| ROE | ${buffett.roe?.toFixed(1)}% | ${buffett.roe > 15 ? '우수' : '보통'} |`);
    lines.push(`| 평균 PER | ${buffett.avgPer?.toFixed(1)}배 | ${buffett.avgPer < 15 ? '저평가' : '적정'} |`);
    lines.push(`| 품질 점수 | ${buffett.qualityScore}/100 | ${this.getQualityGrade(buffett.qualityScore)} |`);
    lines.push(`| 적정가 | ₩${buffett.fairValue?.toLocaleString()} | - |`);
    lines.push(`| 안전마진 | ${buffett.marginOfSafety?.toFixed(1)}% | ${buffett.marginOfSafety > 20 ? '충분' : '부족'} |`);
    lines.push('');
    lines.push(`**투자 의견**: ${buffett.recommendation}`);
    
    if (buffett.qualityScore >= 70 && buffett.marginOfSafety > 20) {
      lines.push('> ✅ 버핏이 선호하는 우량 기업이며, 현재 가격이 매력적입니다.');
    } else if (buffett.qualityScore >= 50) {
      lines.push('> ⚠️ 기업 품질은 양호하나 가격 메리트가 제한적입니다.');
    } else {
      lines.push('> ❌ 버핏의 투자 기준에 미달합니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateLynchAnalysis(lynch: any): string {
    const lines: string[] = [];
    
    lines.push('**투자 철학**: 적정 가격에 성장하는 기업 (GARP)');
    lines.push('');
    lines.push('| 평가 항목 | 값 | 평가 |');
    lines.push('|-----------|-----|------|');
    lines.push(`| 기업 분류 | ${lynch.category} | - |`);
    lines.push(`| 성장률 | ${lynch.growthRate?.toFixed(1)}% | ${lynch.growthRate > 15 ? '고성장' : '보통'} |`);
    lines.push(`| PEG 비율 | ${lynch.pegRatio?.toFixed(2)} | ${lynch.pegRatio < 1 ? '저평가' : lynch.pegRatio < 2 ? '적정' : '고평가'} |`);
    lines.push(`| 적정 PER | ${lynch.fairPer?.toFixed(1)}배 | - |`);
    lines.push(`| 목표가 | ₩${lynch.fairValue?.toLocaleString()} | - |`);
    lines.push(`| 상승여력 | ${lynch.margin?.toFixed(1)}% | - |`);
    lines.push('');
    lines.push(`**투자 의견**: ${lynch.recommendation}`);
    
    if (lynch.pegRatio < 1 && lynch.growthRate > 15) {
      lines.push('> ✅ PEG가 1 미만으로 성장 대비 저평가 상태입니다.');
    } else if (lynch.pegRatio < 1.5) {
      lines.push('> ⚠️ 적정 수준이나 추가 상승 여력은 제한적입니다.');
    } else {
      lines.push('> ❌ 성장률 대비 밸류에이션이 높습니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateGrahamAnalysis(graham: any): string {
    const lines: string[] = [];
    
    lines.push('**투자 철학**: 철저한 안전마진을 통한 원금 보전');
    lines.push('');
    lines.push('| 평가 항목 | 값 | 평가 |');
    lines.push('|-----------|-----|------|');
    lines.push(`| 청산가치 | ₩${graham.liquidationValue?.toLocaleString()} | - |`);
    lines.push(`| 수익가치 | ₩${graham.earningsValue?.toLocaleString()} | - |`);
    lines.push(`| 그레이엄 수 | ₩${graham.grahamNumber?.toLocaleString()} | - |`);
    lines.push(`| 최종 적정가 | ₩${graham.fairValue?.toLocaleString()} | 보수적 |`);
    lines.push(`| 안전마진 | ${graham.marginOfSafety?.toFixed(1)}% | ${graham.marginOfSafety > 33 ? '충분' : '부족'} |`);
    lines.push(`| 방어적 기준 | ${graham.defensiveCriteriaMet} | ${this.getDefensiveGrade(graham.defensiveCriteriaMet)} |`);
    lines.push('');
    lines.push(`**투자 의견**: ${graham.recommendation}`);
    
    if (graham.marginOfSafety > 33) {
      lines.push('> ✅ 그레이엄이 요구하는 33% 이상의 안전마진을 확보하고 있습니다.');
    } else if (graham.marginOfSafety > 20) {
      lines.push('> ⚠️ 안전마진이 존재하나 그레이엄 기준에는 미달합니다.');
    } else {
      lines.push('> ❌ 안전마진이 부족하여 리스크가 높습니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateGreenblattAnalysis(greenblatt: any): string {
    const lines: string[] = [];
    
    lines.push('**투자 철학**: 좋은 기업을 싼 가격에 (매직 포뮬러)');
    lines.push('');
    lines.push('| 평가 항목 | 값 | 평가 |');
    lines.push('|-----------|-----|------|');
    lines.push(`| ROIC | ${greenblatt.roic?.toFixed(1)}% | ${greenblatt.roic > 25 ? '우수' : '보통'} |`);
    lines.push(`| 수익률 | ${greenblatt.earningsYield?.toFixed(1)}% | ${greenblatt.earningsYield > 10 ? '높음' : '보통'} |`);
    lines.push(`| 매직 스코어 | ${greenblatt.magicScore?.toFixed(1)} | ${greenblatt.magicScore > 30 ? '우수' : '보통'} |`);
    lines.push('');
    lines.push(`**투자 의견**: ${greenblatt.recommendation}`);
    
    return lines.join('\n');
  }
  
  private static generateFisherAnalysis(fisher: any): string {
    const lines: string[] = [];
    
    lines.push('**투자 철학**: 뛰어난 성장 기업에 장기 투자');
    lines.push('');
    lines.push('| 평가 항목 | 값 | 평가 |');
    lines.push('|-----------|-----|------|');
    lines.push(`| 피셔 포인트 | ${fisher.fisherPointsMet} | - |`);
    lines.push(`| 품질 점수 | ${fisher.qualityScore?.toFixed(0)}% | ${fisher.qualityScore > 75 ? '우수' : '보통'} |`);
    lines.push('');
    lines.push(`**투자 의견**: ${fisher.recommendation}`);
    
    return lines.join('\n');
  }
  
  private static generateTempletonAnalysis(templeton: any): string {
    const lines: string[] = [];
    
    lines.push('**투자 철학**: 최대 비관론 시점에 매수');
    lines.push('');
    lines.push('| 평가 항목 | 값 | 평가 |');
    lines.push('|-----------|-----|------|');
    lines.push(`| 52주 포지션 | ${templeton.pricePosition52w?.toFixed(1)}% | ${templeton.pricePosition52w < 30 ? '저점 근처' : '고점 근처'} |`);
    lines.push(`| 역발상 점수 | ${templeton.contrarianScore}% | ${templeton.contrarianScore > 50 ? '매수 기회' : '관망'} |`);
    lines.push('');
    lines.push(`**투자 의견**: ${templeton.recommendation}`);
    
    return lines.join('\n');
  }
  
  private static generateGuruSummary(valuations: any): string {
    const lines: string[] = [];
    
    // 투자 의견 집계
    const recommendations = [];
    if (valuations.buffett) recommendations.push(valuations.buffett.recommendation);
    if (valuations.lynch) recommendations.push(valuations.lynch.recommendation);
    if (valuations.graham) recommendations.push(valuations.graham.recommendation);
    if (valuations.greenblatt) recommendations.push(valuations.greenblatt.recommendation);
    if (valuations.fisher) recommendations.push(valuations.fisher.recommendation);
    if (valuations.templeton) recommendations.push(valuations.templeton.recommendation);
    
    const buyCount = recommendations.filter(r => r && r.toLowerCase().includes('buy')).length;
    const sellCount = recommendations.filter(r => r && r.toLowerCase().includes('sell')).length;
    const holdCount = recommendations.filter(r => r && r.toLowerCase().includes('hold')).length;
    
    lines.push('| 투자 대가 | 투자 의견 | 목표가 |');
    lines.push('|-----------|-----------|--------|');
    
    if (valuations.buffett) {
      lines.push(`| 워런 버핏 | ${valuations.buffett.recommendation} | ₩${valuations.buffett.fairValue?.toLocaleString()} |`);
    }
    if (valuations.lynch) {
      lines.push(`| 피터 린치 | ${valuations.lynch.recommendation} | ₩${valuations.lynch.fairValue?.toLocaleString()} |`);
    }
    if (valuations.graham) {
      lines.push(`| 벤저민 그레이엄 | ${valuations.graham.recommendation} | ₩${valuations.graham.fairValue?.toLocaleString()} |`);
    }
    
    lines.push('');
    lines.push('**종합 컨센서스:**');
    lines.push(`- 매수 의견: ${buyCount}명`);
    lines.push(`- 보유 의견: ${holdCount}명`);
    lines.push(`- 매도 의견: ${sellCount}명`);
    
    lines.push('');
    if (buyCount >= 4) {
      lines.push('> 🟢 **강력 매수**: 대부분의 투자 대가 기준으로 매력적인 투자 기회입니다.');
    } else if (buyCount >= 2) {
      lines.push('> 🟡 **약한 매수**: 일부 관점에서 투자 매력이 있으나 신중한 접근이 필요합니다.');
    } else if (sellCount >= 3) {
      lines.push('> 🔴 **매도 고려**: 현재 밸류에이션이 높아 조정 가능성에 유의하시기 바랍니다.');
    } else {
      lines.push('> ⚪ **중립/관망**: 투자 의견이 엇갈려 추가 모니터링이 필요합니다.');
    }
    
    return lines.join('\n');
  }
  
  private static getQualityGrade(score: number): string {
    if (score >= 80) return 'S급';
    if (score >= 70) return 'A급';
    if (score >= 60) return 'B급';
    if (score >= 50) return 'C급';
    return 'D급';
  }
  
  private static getDefensiveGrade(criteria: string): string {
    const [met] = criteria.split('/').map(Number);
    if (met >= 6) return '우수';
    if (met >= 4) return '양호';
    return '미흡';
  }
}