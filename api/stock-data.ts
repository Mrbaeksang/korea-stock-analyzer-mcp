import axios from 'axios';

// Python API 엔드포인트 호출
async function callPythonAPI(method: string, params: any): Promise<any> {
  try {
    // 전체 URL 사용
    const baseUrl = 'https://korea-stock-analyzer-mcp.vercel.app';
    
    const response = await axios.post(`${baseUrl}/api/stock_data`, {
      method,
      params
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30초 타임아웃
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Python API call failed for ${method}:`, error.message);
    throw error;
  }
}

// 시장 데이터 가져오기
export async function getMarketData(ticker: string): Promise<any> {
  try {
    const data = await callPythonAPI('getMarketData', { ticker });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error('getMarketData error:', error);
    return {
      ticker,
      error: 'Failed to fetch market data'
    };
  }
}

// 재무 데이터 가져오기
export async function getFinancialData(ticker: string, years: number = 1): Promise<any> {
  try {
    const data = await callPythonAPI('getFinancialData', { ticker, years });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // yearly 데이터가 있으면 그대로 반환
    if (data.yearly && data.yearly.length > 0) {
      return data;
    }
    
    // 단일 데이터인 경우 기존 형식으로 변환
    return {
      ticker,
      currentPrice: 0, // 시장 데이터에서 가져와야 함
      per: data.per?.toFixed(2) || 'N/A',
      pbr: data.pbr?.toFixed(2) || 'N/A',
      eps: data.eps?.toFixed(0) || 'N/A',
      roe: data.pbr && data.per ? ((data.pbr / data.per) * 100).toFixed(2) : 'N/A',
      bps: data.bps?.toFixed(0) || 'N/A',
      div: data.div?.toFixed(2) || 'N/A'
    };
  } catch (error) {
    console.error('getFinancialData error:', error);
    return {
      ticker,
      error: 'Failed to fetch financial data'
    };
  }
}

// 기술적 지표 가져오기
export async function getTechnicalIndicators(ticker: string, indicators?: string[]): Promise<any> {
  try {
    const data = await callPythonAPI('getTechnicalIndicators', { ticker });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return {
      RSI: data.rsi14,
      MACD: 0, // Python에서 계산 추가 필요
      MA20: data.ma20,
      MA50: data.ma60, // ma60을 ma50으로 사용
      BollingerBands: `Upper: ${data.bollingerUpper}, Lower: ${data.bollingerLower}`,
      Stochastic: 0 // Python에서 계산 추가 필요
    };
  } catch (error) {
    console.error('getTechnicalIndicators error:', error);
    return {
      ticker,
      error: 'Failed to fetch technical indicators'
    };
  }
}

// DCF 계산
export async function calculateDCF(ticker: string, growthRate?: number, discountRate?: number): Promise<any> {
  try {
    // 재무 데이터와 시장 데이터 가져오기
    const [financialData, marketData] = await Promise.all([
      callPythonAPI('getFinancialData', { ticker }),
      callPythonAPI('getMarketData', { ticker })
    ]);
    
    if (financialData.error || marketData.error) {
      throw new Error('Failed to fetch data for DCF calculation');
    }
    
    const currentPrice = marketData.currentPrice;
    const eps = financialData.eps || 0;
    
    // DCF 계산 (간단한 버전)
    const growth = (growthRate || 5) / 100;
    const discount = (discountRate || 10) / 100;
    
    // 5년간 예상 EPS의 현재가치
    let fairValue = 0;
    for (let i = 1; i <= 5; i++) {
      const futureEPS = eps * Math.pow(1 + growth, i);
      const presentValue = futureEPS / Math.pow(1 + discount, i);
      fairValue += presentValue;
    }
    
    // 터미널 가치 (간단한 영구성장모델)
    const terminalGrowth = 0.03; // 3% 영구성장
    const terminalValue = (eps * Math.pow(1 + growth, 5) * (1 + terminalGrowth)) / (discount - terminalGrowth);
    const terminalPV = terminalValue / Math.pow(1 + discount, 5);
    
    fairValue += terminalPV;
    
    // PER 배수 적용 (보수적으로 15배)
    fairValue = fairValue * 15;
    
    const upside = ((fairValue - currentPrice) / currentPrice) * 100;
    
    return {
      fairValue: Math.round(fairValue),
      currentPrice,
      upside: upside.toFixed(1),
      recommendation: upside > 20 ? '매수' : upside > 0 ? '보유' : '매도'
    };
  } catch (error) {
    console.error('calculateDCF error:', error);
    return {
      ticker,
      error: 'Failed to calculate DCF'
    };
  }
}

// 뉴스 검색 (실제 구현 필요)
export async function searchNews(ticker: string, days?: number): Promise<any[]> {
  // 네이버 뉴스 API나 크롤링 구현 필요
  // 임시로 빈 배열 반환
  return [
    {
      title: `${ticker} 관련 최신 뉴스`,
      date: new Date().toLocaleDateString('ko-KR'),
      summary: '뉴스 API 연동이 필요합니다.',
      sentiment: '중립'
    }
  ];
}

// 수급 데이터 가져오기
export async function getSupplyDemand(ticker: string, days?: number): Promise<any> {
  try {
    const data = await callPythonAPI('getSupplyDemand', { ticker });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // 억원 단위로 변환
    return {
      foreign: Math.round(data.recent.foreignNet / 100000000),
      institution: Math.round(data.recent.institutionNet / 100000000),
      individual: Math.round(data.recent.individualNet / 100000000),
      fiveDays: {
        foreign: Math.round(data.fiveDays.foreignNet / 100000000),
        institution: Math.round(data.fiveDays.institutionNet / 100000000),
        individual: Math.round(data.fiveDays.individualNet / 100000000)
      }
    };
  } catch (error) {
    console.error('getSupplyDemand error:', error);
    return {
      ticker,
      error: 'Failed to fetch supply/demand data'
    };
  }
}

// 동종업계 비교
export async function comparePeers(ticker: string, peerTickers?: string[]): Promise<any[]> {
  try {
    // peer 탐지 건너뛰고 본 종목만 반환 (타임아웃 방지)
    if (!peerTickers || peerTickers.length === 0) {
      // 본 종목 데이터만 빠르게 반환
      const financialData = await callPythonAPI('getFinancialData', { ticker });
      return [{
        ticker,
        name: ticker,
        per: financialData.per?.toFixed(2) || 'N/A',
        pbr: financialData.pbr?.toFixed(2) || 'N/A',
        eps: financialData.eps || 'N/A',
        roe: financialData.pbr && financialData.per 
          ? ((financialData.pbr / financialData.per) * 100).toFixed(2) 
          : 'N/A'
      }];
    }
    
    // peer가 제공된 경우만 비교
    const allTickers = [ticker, ...peerTickers].slice(0, 5); // 최대 5개까지
    
    // 모든 데이터를 병렬로 가져오기 (간소화)
    const promises = allTickers.map(async (t) => {
      try {
        // 재무 데이터만 가져오기 (시간 단축)
        const financialData = await callPythonAPI('getFinancialData', { ticker: t });
        
        return {
          ticker: t,
          name: t,
          per: financialData.per?.toFixed(2) || 'N/A',
          pbr: financialData.pbr?.toFixed(2) || 'N/A',
          eps: financialData.eps || 'N/A',
          roe: financialData.pbr && financialData.per 
            ? ((financialData.pbr / financialData.per) * 100).toFixed(2) 
            : 'N/A'
        };
      } catch (e) {
        console.error(`Failed to fetch data for ${t}:`, e);
        return {
          ticker: t,
          name: t,
          per: 'N/A',
          pbr: 'N/A',
          eps: 'N/A',
          roe: 'N/A'
        };
      }
    });
    
    const results = await Promise.all(promises);
    return results; // 모든 결과 반환
  } catch (error) {
    console.error('comparePeers error:', error);
    return [];
  }
}