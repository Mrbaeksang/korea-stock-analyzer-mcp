/**
 * 재무 데이터 수집 서비스
 */

import { PythonExecutor } from './python-executor.js';
import { FinancialData, GrowthMetrics, EfficiencyMetrics } from '../types/index.js';

export class FinancialDataService {
  /**
   * 재무 데이터 수집 (과거 5년)
   */
  static async fetch(ticker: string): Promise<FinancialData[]> {
    const pythonCode = `
from pykrx import stock
from datetime import datetime, timedelta
import json

ticker = '${ticker}'
end_date = datetime.now()
fundamentals_history = []

# 5년간 데이터 수집
for i in range(5):
    found_data = False
    # 각 연도별로 여러 날짜 시도
    for days_offset in [0, 7, 30, 60, 90]:
        year_date = (end_date - timedelta(days=365*i + days_offset)).strftime('%Y%m%d')
        try:
            fund = stock.get_market_fundamental_by_ticker(year_date)
            if ticker in fund.index:
                row = fund.loc[ticker]
                if row['PER'] != 0 or row['EPS'] != 0:
                    fundamentals_history.append({
                        'year': end_date.year - i,
                        'per': float(row['PER']),
                        'pbr': float(row['PBR']),
                        'eps': int(row['EPS']),
                        'bps': int(row['BPS']),
                        'div': float(row['DIV'])
                    })
                    found_data = True
                    break
        except:
            continue
    
    # 데이터가 없으면 기본값
    if not found_data and i == 0:
        fundamentals_history.append({
            'year': end_date.year,
            'per': 15.0,
            'pbr': 1.0,
            'eps': 2000,
            'bps': 30000,
            'div': 2.0
        })

print(json.dumps(fundamentals_history, ensure_ascii=False))
`;

    return await PythonExecutor.execute(pythonCode);
  }

  /**
   * 현재 재무 데이터만 수집
   */
  static async fetchCurrent(ticker: string): Promise<FinancialData> {
    const history = await this.fetch(ticker);
    return history[0] || {
      year: new Date().getFullYear(),
      per: 15,
      pbr: 1,
      eps: 0,
      bps: 0,
      div: 0,
    };
  }

  /**
   * 성장성 지표 계산
   */
  static calculateGrowthMetrics(financialHistory: FinancialData[]): GrowthMetrics {
    if (financialHistory.length < 2) {
      return {
        epsGrowth1y: 0,
        epsGrowth3yCagr: 0,
        revenueGrowthEst: 0,
        earningsMomentum: 'Neutral',
      };
    }

    const current = financialHistory[0];
    const oneYearAgo = financialHistory[1];
    
    const epsGrowth1y = oneYearAgo.eps !== 0
      ? ((current.eps - oneYearAgo.eps) / Math.abs(oneYearAgo.eps)) * 100
      : 0;

    let epsGrowth3yCagr = 0;
    if (financialHistory.length >= 3) {
      const threeYearsAgo = financialHistory[2];
      if (threeYearsAgo.eps > 0 && current.eps > 0) {
        epsGrowth3yCagr = (Math.pow(current.eps / threeYearsAgo.eps, 1/3) - 1) * 100;
      }
    }

    return {
      epsGrowth1y: Math.round(epsGrowth1y * 100) / 100,
      epsGrowth3yCagr: Math.round(epsGrowth3yCagr * 100) / 100,
      revenueGrowthEst: Math.round(epsGrowth1y * 0.8 * 100) / 100,
      earningsMomentum: epsGrowth1y > 0 ? 'Positive' : epsGrowth1y < 0 ? 'Negative' : 'Neutral',
    };
  }

  /**
   * 효율성 지표 계산
   */
  static calculateEfficiencyMetrics(financialData: FinancialData): EfficiencyMetrics {
    const roe = financialData.bps > 0
      ? (financialData.eps / financialData.bps) * 100
      : 0;

    return {
      roe: Math.round(roe * 100) / 100,
      roaEst: Math.round(roe * 0.6 * 100) / 100,
      profitMarginEst: Math.round(roe * 0.4 * 100) / 100,
      assetTurnoverEst: 1.2,
    };
  }
}