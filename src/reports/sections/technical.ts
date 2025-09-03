/**
 * 기술적 분석 섹션
 */

import { AnalysisResult } from '../../types/index.js';

export class TechnicalAnalysisSection {
  static generate(data: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('## 3. 기술적 분석');
    lines.push('');
    
    const tech = data.technicalIndicators;
    const market = data.marketData;
    
    if (!tech || !market) {
      lines.push('기술적 분석 데이터 없음');
      return lines.join('\n');
    }
    
    // 가격 포지션
    lines.push('### 📊 가격 분석');
    lines.push(this.generatePriceAnalysis(market));
    lines.push('');
    
    // 이동평균 분석
    lines.push('### 📈 이동평균 분석');
    lines.push(this.generateMovingAverageAnalysis(tech, market));
    lines.push('');
    
    // 모멘텀 지표
    lines.push('### ⚡ 모멘텀 지표');
    lines.push(this.generateMomentumAnalysis(tech));
    lines.push('');
    
    // 볼린저 밴드
    lines.push('### 📉 볼린저 밴드');
    lines.push(this.generateBollingerAnalysis(tech, market));
    lines.push('');
    
    // 거래량 분석
    lines.push('### 📊 거래량 분석');
    lines.push(this.generateVolumeAnalysis(market));
    lines.push('');
    
    // 종합 기술적 판단
    lines.push('### 🎯 기술적 종합 판단');
    lines.push(this.generateTechnicalSummary(tech, market));
    
    return lines.join('\n');
  }
  
  private static generatePriceAnalysis(market: any): string {
    const lines: string[] = [];
    
    const pricePosition = ((market.currentPrice - market.low52w) / 
                          (market.high52w - market.low52w)) * 100;
    
    lines.push('| 구분 | 가격 | 비고 |');
    lines.push('|------|------|------|');
    lines.push(`| 현재가 | ₩${market.currentPrice.toLocaleString()} | - |`);
    lines.push(`| 52주 최고가 | ₩${market.high52w.toLocaleString()} | ${((market.currentPrice/market.high52w - 1) * 100).toFixed(1)}% |`);
    lines.push(`| 52주 최저가 | ₩${market.low52w.toLocaleString()} | +${((market.currentPrice/market.low52w - 1) * 100).toFixed(1)}% |`);
    lines.push(`| 52주 포지션 | ${pricePosition.toFixed(1)}% | ${this.getPricePositionComment(pricePosition)} |`);
    
    return lines.join('\n');
  }
  
  private static getPricePositionComment(position: number): string {
    if (position > 80) return '52주 고점 부근';
    if (position > 60) return '상단 구간';
    if (position > 40) return '중립 구간';
    if (position > 20) return '하단 구간';
    return '52주 저점 부근';
  }
  
  private static generateMovingAverageAnalysis(tech: any, market: any): string {
    const lines: string[] = [];
    const currentPrice = market.currentPrice;
    
    lines.push('| 이동평균 | 값 | 대비 | 신호 |');
    lines.push('|----------|-----|------|------|');
    
    // MA20
    const ma20Diff = ((currentPrice / tech.ma20 - 1) * 100);
    const ma20Signal = ma20Diff > 0 ? '상승' : '하락';
    lines.push(`| MA20 | ₩${tech.ma20.toLocaleString()} | ${ma20Diff.toFixed(1)}% | ${ma20Signal} |`);
    
    // MA60
    const ma60Diff = ((currentPrice / tech.ma60 - 1) * 100);
    const ma60Signal = ma60Diff > 0 ? '상승' : '하락';
    lines.push(`| MA60 | ₩${tech.ma60.toLocaleString()} | ${ma60Diff.toFixed(1)}% | ${ma60Signal} |`);
    
    // MA120
    const ma120Diff = ((currentPrice / tech.ma120 - 1) * 100);
    const ma120Signal = ma120Diff > 0 ? '상승' : '하락';
    lines.push(`| MA120 | ₩${tech.ma120.toLocaleString()} | ${ma120Diff.toFixed(1)}% | ${ma120Signal} |`);
    
    lines.push('');
    
    // 골든크로스/데드크로스 체크
    if (tech.ma20 > tech.ma60 && tech.ma60 > tech.ma120) {
      lines.push('> 📈 **정배열**: 단기·중기·장기 이동평균선이 모두 상승 정렬되어 있습니다.');
    } else if (tech.ma20 < tech.ma60 && tech.ma60 < tech.ma120) {
      lines.push('> 📉 **역배열**: 이동평균선이 역배열 상태로 조정 가능성에 유의하시기 바랍니다.');
    } else {
      lines.push('> 📊 **혼조세**: 이동평균선이 혼재되어 있어 방향성이 불분명합니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateMomentumAnalysis(tech: any): string {
    const lines: string[] = [];
    
    lines.push('| 지표 | 값 | 상태 | 해석 |');
    lines.push('|------|-----|------|------|');
    
    // RSI
    let rsiStatus = '중립';
    let rsiInterpretation = '중립 구간';
    if (tech.rsi > 70) {
      rsiStatus = '과매수';
      rsiInterpretation = '단기 조정 가능';
    } else if (tech.rsi < 30) {
      rsiStatus = '과매도';
      rsiInterpretation = '반등 가능';
    }
    lines.push(`| RSI(14) | ${tech.rsi.toFixed(1)} | ${rsiStatus} | ${rsiInterpretation} |`);
    
    // MACD
    const macdSignal = tech.macd > tech.macdSignal ? '매수' : '매도';
    const macdTrend = tech.macd > 0 ? '상승추세' : '하락추세';
    lines.push(`| MACD | ${tech.macd.toFixed(2)} | ${macdSignal} | ${macdTrend} |`);
    lines.push(`| Signal | ${tech.macdSignal.toFixed(2)} | - | - |`);
    
    // Stochastic
    let stochStatus = '중립';
    if (tech.stochasticK > 80) stochStatus = '과매수';
    else if (tech.stochasticK < 20) stochStatus = '과매도';
    lines.push(`| Stochastic %K | ${tech.stochasticK.toFixed(1)} | ${stochStatus} | - |`);
    lines.push(`| Stochastic %D | ${tech.stochasticD.toFixed(1)} | - | - |`);
    
    return lines.join('\n');
  }
  
  private static generateBollingerAnalysis(tech: any, market: any): string {
    const lines: string[] = [];
    const currentPrice = market.currentPrice;
    
    lines.push('| 구분 | 값 | 현재가 대비 |');
    lines.push('|------|-----|-------------|');
    lines.push(`| 상단 밴드 | ₩${tech.bollingerUpper.toLocaleString()} | ${((tech.bollingerUpper/currentPrice - 1) * 100).toFixed(1)}% |`);
    lines.push(`| 중심선 (MA20) | ₩${tech.bollingerMiddle.toLocaleString()} | ${((tech.bollingerMiddle/currentPrice - 1) * 100).toFixed(1)}% |`);
    lines.push(`| 하단 밴드 | ₩${tech.bollingerLower.toLocaleString()} | ${((tech.bollingerLower/currentPrice - 1) * 100).toFixed(1)}% |`);
    
    lines.push('');
    
    // 밴드 위치 판단
    const bandPosition = ((currentPrice - tech.bollingerLower) / 
                         (tech.bollingerUpper - tech.bollingerLower)) * 100;
    
    if (bandPosition > 100) {
      lines.push('> ⚠️ **밴드 상단 돌파**: 과열 구간으로 단기 조정 가능성이 있습니다.');
    } else if (bandPosition > 80) {
      lines.push('> 📈 **상단 밴드 접근**: 상승 모멘텀이 강한 상태입니다.');
    } else if (bandPosition < 0) {
      lines.push('> ⚠️ **밴드 하단 이탈**: 과매도 구간으로 반등 가능성이 있습니다.');
    } else if (bandPosition < 20) {
      lines.push('> 📉 **하단 밴드 접근**: 매수 타이밍을 고려해볼 수 있습니다.');
    } else {
      lines.push('> 📊 **밴드 중심 구간**: 안정적인 가격대에 위치하고 있습니다.');
    }
    
    return lines.join('\n');
  }
  
  private static generateVolumeAnalysis(market: any): string {
    const lines: string[] = [];
    
    const volumeRatio = (market.volume / market.volumeAvg20) * 100;
    
    lines.push('| 구분 | 값 | 비고 |');
    lines.push('|------|-----|------|');
    lines.push(`| 당일 거래량 | ${market.volume.toLocaleString()}주 | - |`);
    lines.push(`| 20일 평균 | ${market.volumeAvg20.toLocaleString()}주 | - |`);
    lines.push(`| 거래량 비율 | ${volumeRatio.toFixed(1)}% | ${this.getVolumeComment(volumeRatio)} |`);
    lines.push(`| 거래대금 | ₩${market.tradingValue.toLocaleString()} | - |`);
    
    return lines.join('\n');
  }
  
  private static getVolumeComment(ratio: number): string {
    if (ratio > 200) return '이상 급증';
    if (ratio > 150) return '거래 활발';
    if (ratio > 100) return '평균 상회';
    if (ratio > 50) return '거래 저조';
    return '거래 부진';
  }
  
  private static generateTechnicalSummary(tech: any, market: any): string {
    const lines: string[] = [];
    const signals = [];
    
    // 각 지표별 신호 수집
    if (tech.rsi < 30) signals.push('RSI 과매도 (매수)');
    else if (tech.rsi > 70) signals.push('RSI 과매수 (매도)');
    
    if (tech.macd > tech.macdSignal) signals.push('MACD 골든크로스 (매수)');
    else signals.push('MACD 데드크로스 (매도)');
    
    if (market.currentPrice > tech.ma20) signals.push('단기 이평선 상향 돌파 (매수)');
    else signals.push('단기 이평선 하향 이탈 (매도)');
    
    // 종합 판단
    const buySignals = signals.filter(s => s.includes('매수')).length;
    const sellSignals = signals.filter(s => s.includes('매도')).length;
    
    lines.push('**기술적 신호 요약:**');
    signals.forEach(signal => lines.push(`- ${signal}`));
    
    lines.push('');
    lines.push('**종합 판단:**');
    
    if (buySignals > sellSignals + 1) {
      lines.push('> 🟢 **매수 우위**: 기술적 지표들이 매수 신호를 나타내고 있습니다.');
    } else if (sellSignals > buySignals + 1) {
      lines.push('> 🔴 **매도 우위**: 기술적 지표들이 조정 가능성을 시사하고 있습니다.');
    } else {
      lines.push('> 🟡 **중립/관망**: 기술적 신호가 혼재되어 있어 추세 확인이 필요합니다.');
    }
    
    return lines.join('\n');
  }
}