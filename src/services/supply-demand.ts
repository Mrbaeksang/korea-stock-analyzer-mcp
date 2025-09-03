/**
 * 수급 데이터 수집 서비스
 */

import { PythonExecutor } from './python-executor.js';
import { SupplyDemandData } from '../types/index.js';

export class SupplyDemandService {
  /**
   * 수급 데이터 수집 (5일, 20일, 60일)
   */
  static async fetch(ticker: string): Promise<SupplyDemandData | null> {
    const pythonCode = `
from pykrx import stock
from datetime import datetime, timedelta
import json

ticker = '${ticker}'
end_date = datetime.now()

# 최근 거래일 찾기
for i in range(7):
    check_date = (end_date - timedelta(days=i)).strftime('%Y%m%d')
    test_df = stock.get_market_ohlcv_by_date(check_date, check_date, ticker)
    if not test_df.empty:
        end_str = check_date
        end_date = datetime.strptime(end_str, '%Y%m%d')
        break

try:
    # get_market_trading_value_by_investor 사용 (실제 작동하는 API)
    # 60일 수급 (거래일 기준)
    start_60d = (end_date - timedelta(days=90)).strftime('%Y%m%d')
    net_60d = stock.get_market_trading_value_by_investor(
        start_60d, 
        end_str, 
        ticker
    )
    
    # 20일 수급 (거래일 기준)
    start_20d = (end_date - timedelta(days=30)).strftime('%Y%m%d')
    net_20d = stock.get_market_trading_value_by_investor(
        start_20d, 
        end_str, 
        ticker
    )
    
    # 5일 수급 (거래일 기준)
    start_5d = (end_date - timedelta(days=10)).strftime('%Y%m%d')
    net_5d = stock.get_market_trading_value_by_investor(
        start_5d, 
        end_str, 
        ticker
    )
    
    result = {}
    
    # 60일 수급 집계 (거래 금액 기준, 컬럼 인덱스 사용)
    if not net_60d.empty:
        # 컬럼 인덱스로 접근 (0: 매도, 1: 매수, 2: 순매수)
        foreign_60d = 0
        institution_60d = 0
        individual_60d = 0
        
        for investor_type in net_60d.index:
            investor_str = str(investor_type)
            # 컬럼 인덱스 2가 순매수
            net_value = net_60d.iloc[net_60d.index.get_loc(investor_type), 2]
            
            if '외국인' in investor_str or 'foreign' in investor_str.lower():
                foreign_60d += net_value
            elif '기관' in investor_str or 'institution' in investor_str.lower():
                institution_60d += net_value
            elif '개인' in investor_str or 'individual' in investor_str.lower():
                individual_60d += net_value
        
        result['foreign60d'] = int(foreign_60d)
        result['institution60d'] = int(institution_60d)
        result['individual60d'] = int(individual_60d)
    else:
        result['foreign60d'] = 0
        result['institution60d'] = 0
        result['individual60d'] = 0
    
    # 20일 수급 집계
    if not net_20d.empty:
        foreign_20d = 0
        institution_20d = 0
        individual_20d = 0
        
        for investor_type in net_20d.index:
            investor_str = str(investor_type)
            # 컬럼 인덱스 2가 순매수
            net_value = net_20d.iloc[net_20d.index.get_loc(investor_type), 2]
            
            if '외국인' in investor_str or 'foreign' in investor_str.lower():
                foreign_20d += net_value
            elif '기관' in investor_str or 'institution' in investor_str.lower():
                institution_20d += net_value
            elif '개인' in investor_str or 'individual' in investor_str.lower():
                individual_20d += net_value
        
        result['foreign20d'] = int(foreign_20d)
        result['institution20d'] = int(institution_20d)
        result['individual20d'] = int(individual_20d)
    else:
        result['foreign20d'] = 0
        result['institution20d'] = 0
        result['individual20d'] = 0
        
    # 5일 수급 집계
    if not net_5d.empty:
        foreign_5d = 0
        institution_5d = 0
        individual_5d = 0
        
        for investor_type in net_5d.index:
            investor_str = str(investor_type)
            # 컬럼 인덱스 2가 순매수
            net_value = net_5d.iloc[net_5d.index.get_loc(investor_type), 2]
            
            if '외국인' in investor_str or 'foreign' in investor_str.lower():
                foreign_5d += net_value
            elif '기관' in investor_str or 'institution' in investor_str.lower():
                institution_5d += net_value
            elif '개인' in investor_str or 'individual' in investor_str.lower():
                individual_5d += net_value
        
        result['foreign5d'] = int(foreign_5d)
        result['institution5d'] = int(institution_5d)
        result['individual5d'] = int(individual_5d)
    else:
        result['foreign5d'] = 0
        result['institution5d'] = 0
        result['individual5d'] = 0
    
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    print(json.dumps({
        'foreign5d': 0, 'foreign20d': 0, 'foreign60d': 0,
        'institution5d': 0, 'institution20d': 0, 'institution60d': 0,
        'individual5d': 0, 'individual20d': 0, 'individual60d': 0
    }, ensure_ascii=False))
`;

    try {
      return await PythonExecutor.execute(pythonCode);
    } catch (error) {
      console.error('수급 데이터 수집 실패:', error);
      return null;
    }
  }

  /**
   * 수급 트렌드 분석
   */
  static analyzeSupplyDemandTrend(data: SupplyDemandData): string {
    const foreignTrend = data.foreign5d > 0 && data.foreign20d > 0 ? 'accumulating' : 
                        data.foreign5d < 0 && data.foreign20d < 0 ? 'selling' : 'neutral';
    
    const institutionTrend = data.institution5d > 0 && data.institution20d > 0 ? 'accumulating' :
                            data.institution5d < 0 && data.institution20d < 0 ? 'selling' : 'neutral';
    
    if (foreignTrend === 'accumulating' && institutionTrend === 'accumulating') {
      return 'strong_buy_signal';
    } else if (foreignTrend === 'selling' && institutionTrend === 'selling') {
      return 'strong_sell_signal';
    } else {
      return 'neutral';
    }
  }
}