/**
 * 통합 데이터 수집 서비스
 */

import { PythonExecutor } from './python-executor.js';
import { MarketDataService } from './market-data.js';
import { FinancialDataService } from './financial-data.js';
import { SupplyDemandService } from './supply-demand.js';
import { AnalysisResult } from '../types/index.js';

export class DataFetcher {
  /**
   * 모든 데이터를 수집하여 통합 결과 반환
   */
  static async fetchAll(ticker: string, companyName: string): Promise<AnalysisResult> {
    console.log(`[DataFetcher] ${companyName}(${ticker}) 데이터 수집 시작...`);
    
    try {
      // 병렬로 데이터 수집
      const [marketData, financialData, supplyDemand, technicalIndicators] = await Promise.all([
        MarketDataService.fetch(ticker),
        FinancialDataService.fetch(ticker),
        SupplyDemandService.fetch(ticker),
        MarketDataService.fetchTechnicalIndicators(ticker),
      ]);

      // 성장 지표 계산
      const growthMetrics = this.calculateGrowthMetrics(financialData);
      
      // 효율성 지표 계산
      const efficiencyMetrics = this.calculateEfficiencyMetrics(financialData);
      
      // 리스크 지표 계산
      const riskMetrics = this.calculateRiskMetrics(technicalIndicators, marketData);

      const result: AnalysisResult = {
        ticker,
        companyName,
        analysisDate: new Date().toISOString(),
        marketData,
        financialData,
        technicalIndicators,
        supplyDemand,
        growthMetrics,
        efficiencyMetrics,
        riskMetrics,
        valuations: {},
      };

      console.log(`[DataFetcher] 데이터 수집 완료`);
      return result;
    } catch (error: any) {
      console.error(`[DataFetcher] 데이터 수집 실패:`, error);
      throw new Error(`데이터 수집 실패: ${error.message}`);
    }
  }

  /**
   * 간단한 요약 데이터만 수집
   */
  static async fetchSummary(ticker: string, companyName: string): Promise<any> {
    const marketData = await MarketDataService.fetchBasic(ticker);
    const financialData = await FinancialDataService.fetchCurrent(ticker);
    
    return {
      ticker,
      companyName,
      currentPrice: marketData.currentPrice,
      per: financialData.per,
      pbr: financialData.pbr,
      marketCap: marketData.marketCap,
      yearReturn: marketData.yearReturn,
    };
  }
  
  /**
   * 성장 지표 계산
   */
  private static calculateGrowthMetrics(financialData: any): any {
    if (Array.isArray(financialData) && financialData.length >= 2) {
      const current = financialData[0];
      const previous = financialData[1];
      const threeyearsAgo = financialData[Math.min(2, financialData.length - 1)];
      
      // EPS 성장률
      const epsGrowth1y = previous.eps > 0 ? 
        ((current.eps - previous.eps) / previous.eps) * 100 : 0;
      
      // 3년 CAGR
      const epsGrowth3yCagr = threeyearsAgo.eps > 0 && current.eps > 0 ?
        (Math.pow(current.eps / threeyearsAgo.eps, 1/3) - 1) * 100 : null;
      
      // 매출/이익 성장률 (EPS 기반 추정)
      const revenueGrowthEst = epsGrowth1y * 0.8; // 보수적 추정
      const profitGrowthEst = epsGrowth1y * 1.1; // EPS 성장률과 유사
      
      return {
        epsGrowth1y: Math.round(epsGrowth1y * 100) / 100,
        epsGrowth3yCagr: epsGrowth3yCagr ? Math.round(epsGrowth3yCagr * 100) / 100 : null,
        revenueGrowthEst: Math.round(revenueGrowthEst * 100) / 100,
        profitGrowthEst: Math.round(profitGrowthEst * 100) / 100,
      };
    }
    
    // 기본값
    return {
      epsGrowth1y: 0,
      epsGrowth3yCagr: null,
      revenueGrowthEst: 10,
      profitGrowthEst: 12,
    };
  }
  
  /**
   * 효율성 지표 계산
   */
  private static calculateEfficiencyMetrics(financialData: any): any {
    const current = Array.isArray(financialData) ? financialData[0] : financialData;
    
    // ROE 계산
    const roe = current.bps > 0 ? (current.eps / current.bps) * 100 : 10;
    
    // ROA 추정 (ROE의 60-70%)
    const roa = roe * 0.65;
    
    // 영업이익률 추정 (ROE 기반)
    const operatingMarginEst = Math.min(roe * 0.8, 25);
    
    // 순이익률 추정
    const profitMarginEst = Math.min(roe * 0.5, 15);
    
    return {
      roe: Math.round(roe * 100) / 100,
      roa: Math.round(roa * 100) / 100,
      operatingMarginEst: Math.round(operatingMarginEst * 100) / 100,
      profitMarginEst: Math.round(profitMarginEst * 100) / 100,
    };
  }
  
  /**
   * 리스크 지표 계산
   */
  private static calculateRiskMetrics(technicalIndicators: any, marketData: any): any {
    if (!technicalIndicators) {
      return {
        dailyVolatility: 2,
        annualVolatility: 30,
        sharpeRatio: 0.5,
        beta: 1.0,
        maxDrawdown: -15,
        var95: -5,
        cvar95: -7,
      };
    }
    
    return {
      dailyVolatility: technicalIndicators.volatilityDaily || 2,
      annualVolatility: technicalIndicators.volatilityAnnual || 30,
      sharpeRatio: technicalIndicators.sharpeRatio || 0.5,
      beta: technicalIndicators.beta || 1.0,
      maxDrawdown: technicalIndicators.maxDrawdown || -15,
      var95: technicalIndicators.volatilityDaily ? technicalIndicators.volatilityDaily * -1.65 : -5,
      cvar95: technicalIndicators.volatilityDaily ? technicalIndicators.volatilityDaily * -2.06 : -7,
    };
  }
}