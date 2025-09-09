import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as stockData from './stock-data.js';

// Rate limiting 설정
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60000;
const CLEANUP_INTERVAL = 300000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  const validRequests = userRequests.filter(time => now - time < WINDOW_MS);
  
  if (validRequests.length >= RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((validRequests[0] + WINDOW_MS) / 1000)
    };
  }
  
  validRequests.push(now);
  requestCounts.set(ip, validRequests);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT - validRequests.length,
    resetTime: Math.ceil((now + WINDOW_MS) / 1000)
  };
}

// 메모리 정리
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, requests] of requestCounts.entries()) {
      const valid = requests.filter(time => now - time < WINDOW_MS);
      if (valid.length === 0) {
        requestCounts.delete(ip);
      } else {
        requestCounts.set(ip, valid);
      }
    }
  }, CLEANUP_INTERVAL);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  // Rate limiting
  const clientIp = (req.headers['x-real-ip'] as string) || 
                   (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   'unknown';
  
  const rateLimit = checkRateLimit(clientIp);
  
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());
  
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime * 1000 - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({
      error: 'Too Many Requests',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter
    });
  }
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: 도구 정보 반환
  if (req.method === 'GET') {
    return res.status(200).json({
      jsonrpc: '2.0',
      id: req.query.id || '1',
      result: {
        name: 'Korean Stock Analyzer MCP',
        version: '1.1.1',
        description: '한국 주식 시장 전문 분석 도구',
        author: 'Mrbaeksang',
        capabilities: {
          tools: {}
        }
      }
    });
  }

  // POST: MCP 메서드 처리
  if (req.method === 'POST') {
    try {
      const { method, params, id } = req.body;
      
      // initialize 메서드
      if (method === 'initialize') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            protocolVersion: '1.0.0',
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: 'Korean Stock Analyzer MCP',
              version: '1.1.1'
            }
          }
        });
      }
      
      // ping 메서드
      if (method === 'ping') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {}
        });
      }
      
      // 도구 목록
      if (method === 'tools/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            tools: [
              {
                name: 'analyze_equity',
                description: '한국 주식 종목 종합 분석 (빠른 분석 / 요약 / 전체 보고서)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드 (예: 005930)'
                    },
                    company_name: {
                      type: 'string',
                      description: '회사명 (예: 삼성전자)'
                    },
                    report_type: {
                      type: 'string',
                      enum: ['quick', 'summary', 'full'],
                      description: '보고서 유형',
                      default: 'quick'
                    }
                  },
                  required: ['ticker', 'company_name']
                }
              },
              {
                name: 'get_financial_data',
                description: '재무제표 데이터 조회 (PER, PBR, EPS, BPS, 배당수익률)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드'
                    },
                    years: {
                      type: 'number',
                      description: '조회 기간 (년)',
                      default: 3
                    }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'get_technical_indicators',
                description: '기술적 지표 분석 (이동평균, RSI, MACD, 볼린저밴드)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드'
                    }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'calculate_dcf',
                description: 'DCF(현금흐름할인) 모델로 적정가치 계산',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드'
                    },
                    growth_rate: {
                      type: 'number',
                      description: '예상 성장률 (%)',
                      default: 10
                    },
                    discount_rate: {
                      type: 'number',
                      description: '할인율 (%)',
                      default: 10
                    }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'get_supply_demand',
                description: '수급 데이터 조회 (외국인, 기관, 개인)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드'
                    },
                    days: {
                      type: 'number',
                      description: '조회 기간 (일)',
                      default: 20
                    }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'compare_peers',
                description: '동종업계 비교 분석 (자동으로 유사 종목 탐지)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드'
                    },
                    peer_tickers: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: '비교할 종목 코드들 (선택사항, 미입력시 자동 탐지)'
                    }
                  },
                  required: ['ticker']
                }
              }
            ]
          }
        });
      }
      
      // 도구 호출
      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        let result: any;
        
        try {
          switch (name) {
            case 'analyze_equity': {
              const { ticker, company_name, report_type = 'quick' } = args;
              
              // 기본 데이터 수집
              const [financialData, marketData] = await Promise.all([
                stockData.getFinancialData(ticker),
                stockData.getMarketData(ticker)
              ]);
              
              if (!marketData || marketData.error) {
                throw new Error(`시장 데이터 조회 실패: ${marketData?.error || 'Unknown error'}`);
              }
              
              const currentPrice = marketData.currentPrice;
              
              if (report_type === 'quick') {
                // 빠른 분석
                const per = financialData?.per || 15;
                const eps = financialData?.eps || (currentPrice / 15);
                const fairValue = eps * per;
                const upside = currentPrice > 0 ? ((fairValue - currentPrice) / currentPrice) * 100 : 0;
                
                const report = [
                  `# 📊 ${company_name || ticker} 실시간 분석`,
                  '',
                  '## 주요 지표',
                  `- 현재가: ₩${currentPrice?.toLocaleString()}`,
                  `- 거래량: ${marketData.volume?.toLocaleString() || 'N/A'}`,
                  `- 시가총액: ${marketData.marketCap ? `₩${(marketData.marketCap / 100000000).toFixed(1)}억` : 'N/A'}`,
                  `- PER: ${financialData?.per || 'N/A'}`,
                  `- PBR: ${financialData?.pbr || 'N/A'}`,
                  `- EPS: ${financialData?.eps ? `₩${financialData.eps}` : 'N/A'}`,
                  `- BPS: ${financialData?.bps ? `₩${financialData.bps}` : 'N/A'}`,
                  `- 배당수익률: ${financialData?.div || 'N/A'}%`,
                  '',
                  '## 간단 밸류에이션',
                  `- 적정가치: ₩${Math.round(fairValue).toLocaleString()}`,
                  `- 상승여력: ${upside.toFixed(1)}%`,
                  `- 투자의견: ${upside > 20 ? '**매수**' : upside > 0 ? '**보유**' : '**매도**'}`,
                  '',
                  `*분석 시점: ${new Date().toLocaleDateString('ko-KR')}*`
                ].join('\n');
                
                result = {
                  content: [{
                    type: 'text',
                    text: report
                  }]
                };
              } else {
                // summary와 full은 추가 데이터 수집
                const [technicalData, supplyDemandData] = await Promise.all([
                  stockData.getTechnicalIndicators(ticker),
                  stockData.getSupplyDemand(ticker)
                ]);
                
                const sections = [
                  `# 📊 ${company_name || ticker} 투자 분석 보고서`,
                  '',
                  '## 1. 기업 개요',
                  `- 종목코드: ${ticker}`,
                  `- 시가총액: ${marketData.marketCap ? `₩${(marketData.marketCap / 100000000).toFixed(1)}억` : 'N/A'}`,
                  `- 현재가: ₩${currentPrice?.toLocaleString()}`,
                  '',
                  '## 2. 투자 지표',
                  '### 밸류에이션',
                  `- PER: ${financialData?.per || 'N/A'}`,
                  `- PBR: ${financialData?.pbr || 'N/A'}`,
                  `- EPS: ₩${financialData?.eps || 'N/A'}`,
                  `- 배당수익률: ${financialData?.div || 0}%`,
                  '',
                  '### 기술적 지표',
                  `- RSI: ${technicalData?.RSI || 'N/A'}`,
                  `- MA20: ₩${technicalData?.MA20?.toLocaleString() || 'N/A'}`,
                  '',
                  '## 3. 수급 분석',
                  `- 외국인: ${supplyDemandData?.foreign || 0}억원`,
                  `- 기관: ${supplyDemandData?.institution || 0}억원`,
                  '',
                  `*분석 일시: ${new Date().toLocaleString('ko-KR')}*`
                ].join('\n');
                
                result = {
                  content: [{
                    type: 'text',
                    text: sections
                  }]
                };
              }
              break;
            }
            
            case 'get_financial_data': {
              const { ticker, years = 1 } = args;
              const data = await stockData.getFinancialData(ticker, years);
              
              console.log('Financial data received:', JSON.stringify(data));
              
              let reportText = '';
              
              if (data.yearly && data.yearly.length > 0) {
                // 년도별 데이터가 있는 경우
                const reportLines = [
                  `📈 ${ticker} 재무 데이터 (${years}년 추이)`,
                  ''
                ];
                
                data.yearly.forEach((yearData: any) => {
                  reportLines.push(
                    `**${yearData.year}년**`,
                    `- PER: ${yearData.per?.toFixed(2) || 'N/A'}`,
                    `- PBR: ${yearData.pbr?.toFixed(2) || 'N/A'}`,
                    `- EPS: ${yearData.eps ? `${Math.round(yearData.eps).toLocaleString()}원` : 'N/A'}`,
                    `- BPS: ${yearData.bps ? `${Math.round(yearData.bps).toLocaleString()}원` : 'N/A'}`,
                    `- 배당수익률: ${yearData.div?.toFixed(2) || 'N/A'}%`,
                    ''
                  );
                });
                
                reportText = reportLines.join('\n');
              } else {
                // 단일 시점 데이터
                reportText = `📈 ${ticker} 재무 데이터

**주요 지표**
- PER: ${data.per || 'N/A'}
- PBR: ${data.pbr || 'N/A'}
- EPS: ${data.eps || 'N/A'}원
- BPS: ${data.bps || 'N/A'}원
- ROE: ${data.roe || 'N/A'}%
- 배당수익률: ${data.div || 'N/A'}%`;
              }
              
              result = {
                content: [{
                  type: 'text',
                  text: reportText
                }]
              };
              break;
            }
            
            case 'get_technical_indicators': {
              const data = await stockData.getTechnicalIndicators(args.ticker);
              result = {
                content: [{
                  type: 'text',
                  text: `📉 ${args.ticker} 기술적 지표

**지표 분석**
- RSI: ${data.RSI || 'N/A'} ${data.RSI && data.RSI < 30 ? '(과매도)' : data.RSI && data.RSI > 70 ? '(과매수)' : '(중립)'}
- MA20: ${data.MA20 || 'N/A'}
- MA50: ${data.MA50 || 'N/A'}
- 볼린저밴드: ${data.BollingerBands || 'N/A'}`
                }]
              };
              break;
            }
            
            case 'calculate_dcf': {
              const data = await stockData.calculateDCF(
                args.ticker,
                args.growth_rate,
                args.discount_rate
              );
              result = {
                content: [{
                  type: 'text',
                  text: `💰 ${args.ticker} DCF 밸류에이션

**기본 가정**
- 성장률: ${args.growth_rate || 10}%
- 할인율: ${args.discount_rate || 10}%

**분석 결과**
- 적정주가: ${data.fairValue?.toLocaleString() || 'N/A'}원
- 현재가: ${data.currentPrice?.toLocaleString() || 'N/A'}원
- 상승 여력: ${data.upside || 'N/A'}%
- 투자 판단: ${data.recommendation || 'N/A'}`
                }]
              };
              break;
            }
            
            case 'get_supply_demand': {
              const data = await stockData.getSupplyDemand(args.ticker, args.days);
              result = {
                content: [{
                  type: 'text',
                  text: `📊 ${args.ticker} 수급 동향 (최근 ${args.days || 20}일)

**순매수 금액**
- 외국인: ${data.foreign !== undefined ? data.foreign : 'N/A'}억원
- 기관: ${data.institution !== undefined ? data.institution : 'N/A'}억원
- 개인: ${data.individual !== undefined ? data.individual : 'N/A'}억원

**5일 수급**
- 외국인: ${data.fiveDays?.foreign !== undefined ? data.fiveDays.foreign : 'N/A'}억원
- 기관: ${data.fiveDays?.institution !== undefined ? data.fiveDays.institution : 'N/A'}억원
- 개인: ${data.fiveDays?.individual !== undefined ? data.fiveDays.individual : 'N/A'}억원`
                }]
              };
              break;
            }
            
            case 'compare_peers': {
              try {
                // 동종업계 자동 탐지 로직 추가
                if (!args.peer_tickers || args.peer_tickers.length === 0) {
                  // Python API 호출
                  const peersData = await fetch('https://korea-stock-analyzer-mcp.vercel.app/api/stock_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      method: 'searchPeers',
                      params: { ticker: args.ticker }
                    })
                  }).then(r => r.json());
                  
                  if (peersData.peers && peersData.peers.length > 0) {
                    // 동종업계 찾음
                    const peerTickers = peersData.peers.map((p: any) => p.ticker).slice(0, 4);
                    const data = await stockData.comparePeers(args.ticker, peerTickers);
                    
                    // 첫 번째 회사의 이름 사용 (메인 종목)
                    const mainCompanyName = data[0]?.name || args.ticker;
                    
                    result = {
                      content: [{
                        type: 'text',
                        text: `🔍 ${mainCompanyName} 동종업계 비교 분석

**시가총액 유사 기업들과 비교**
${data.map((company: any) => `
**${company.name || company.ticker}**
- 현재가: ${company.currentPrice?.toLocaleString() || 'N/A'}원
- 시가총액: ${company.marketCap ? `${(company.marketCap / 100000000).toFixed(1)}억` : 'N/A'}
- PER: ${company.per || 'N/A'}
- PBR: ${company.pbr || 'N/A'}
- ROE: ${company.roe || 'N/A'}%`).join('\n')}

📊 분석: 시가총액 기준 유사 기업들과 비교했습니다.`
                      }]
                    };
                  } else {
                    // 동종업계를 찾지 못한 경우 본 종목만 표시
                    const mainData = await stockData.comparePeers(args.ticker, []);
                    const mainCompanyName = mainData[0]?.name || args.ticker;
                    
                    result = {
                      content: [{
                        type: 'text',
                        text: `🔍 ${mainCompanyName} 기업 정보

${mainData.map((company: any) => `
**${company.name || company.ticker}**
- 현재가: ${company.currentPrice?.toLocaleString() || 'N/A'}원  
- 시가총액: ${company.marketCap ? `${(company.marketCap / 100000000).toFixed(1)}억` : 'N/A'}
- PER: ${company.per || 'N/A'}
- PBR: ${company.pbr || 'N/A'}
- ROE: ${company.roe || 'N/A'}%`).join('\n')}

💡 시가총액 기준 유사 기업을 자동으로 찾지 못했습니다.
관련 업종이나 비교하고 싶은 종목을 직접 지정해서 다시 시도해주세요.`
                      }]
                    };
                  }
                } else {
                  // peer_tickers가 제공된 경우
                  const data = await stockData.comparePeers(args.ticker, args.peer_tickers);
                  
                  result = {
                    content: [{
                      type: 'text',
                      text: `🔍 동종업계 비교 분석

${data.map((company: any) => `
**${company.name || company.ticker}**
- 현재가: ${company.currentPrice?.toLocaleString() || 'N/A'}원
- 시가총액: ${company.marketCap ? `${(company.marketCap / 100000000).toFixed(1)}억` : 'N/A'}
- PER: ${company.per || 'N/A'}
- PBR: ${company.pbr || 'N/A'}
- ROE: ${company.roe || 'N/A'}%`).join('\n')}`
                    }]
                  };
                }
              } catch (error: any) {
                // 에러 발생시 본 종목만 표시
                try {
                  const mainData = await stockData.comparePeers(args.ticker, []);
                  const mainCompanyName = mainData[0]?.name || args.ticker;
                  
                  result = {
                    content: [{
                      type: 'text',
                      text: `🔍 ${mainCompanyName} 기업 정보

${mainData.length > 0 ? mainData.map((company: any) => `
**${company.name || company.ticker}**
- 현재가: ${company.currentPrice?.toLocaleString() || 'N/A'}원
- 시가총액: ${company.marketCap ? `${(company.marketCap / 100000000).toFixed(1)}억` : 'N/A'}
- PER: ${company.per || 'N/A'}
- PBR: ${company.pbr || 'N/A'}
- ROE: ${company.roe || 'N/A'}%`).join('\n') : '데이터를 가져올 수 없습니다.'}

💡 동종업계 탐색에 실패했습니다.`
                    }]
                  };
                } catch (innerError) {
                  // 모든 것이 실패한 경우
                  result = {
                    content: [{
                      type: 'text',
                      text: `종목 ${args.ticker}의 정보를 가져올 수 없습니다.

종목 코드를 확인해주세요.
예: 005930 (삼성전자), 000660 (SK하이닉스)`
                    }]
                  };
                }
              }
              break;
            }
            
            default:
              result = {
                content: [{
                  type: 'text',
                  text: `알 수 없는 도구: ${name}`
                }]
              };
          }
        } catch (error: any) {
          console.error(`Error executing ${name}:`, error);
          result = {
            content: [{
              type: 'text',
              text: `Error: ${error.message || '도구 실행 중 오류가 발생했습니다.'}`
            }]
          };
        }
        
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result
        });
      }
      
      // 알 수 없는 메서드
      return res.status(400).json({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: -32601,
          message: 'Method not found',
          data: { method }
        }
      });
      
    } catch (error: any) {
      console.error('Request processing error:', error);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id || 1,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      });
    }
  }
  
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET, POST, and OPTIONS methods are supported'
  });
}