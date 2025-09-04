import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rate limiting 타입 정의
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// 레이트 리미팅 설정
const requestCounts = new Map<string, number[]>();
const RATE_LIMIT = 60; // 분당 60회
const WINDOW_MS = 60000; // 1분 윈도우
const CLEANUP_INTERVAL = 300000; // 5분마다 메모리 정리

function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  
  // 1분 지난 요청 제거
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

// 주기적 메모리 정리
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

// 실제 주식 데이터 함수들 (stock-data.js에서 구현)
import * as stockData from './stock-data.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  // 레이트 리미팅 체크
  const clientIp = (req.headers['x-real-ip'] as string) || 
                   (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   'unknown';
  
  const rateLimit = checkRateLimit(clientIp);
  
  // Rate limit 헤더 추가
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
  
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청: 도구 목록 반환
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
          tools: {
            "analyze_equity": {},
            "get_financial_data": {},
            "get_technical_indicators": {},
            "calculate_dcf": {},
            "search_news": {},
            "get_supply_demand": {},
            "compare_peers": {}
          }
        },
        tools: [
          {
            name: 'analyze_equity',
            description: '종목의 종합적인 투자 정보 분석',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: { type: 'string', description: '종목 코드 (예: 005930)' }
              },
              required: ['ticker']
            }
          },
          {
            name: 'get_financial_data',
            description: '기업의 재무제표 데이터 조회',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: { type: 'string', description: '종목 코드' },
                period: { type: 'string', description: '조회 기간', default: 'annual' }
              },
              required: ['ticker']
            }
          },
          {
            name: 'get_technical_indicators',
            description: '기술적 지표 계산',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: { type: 'string' },
                indicators: { type: 'array', items: { type: 'string' } }
              },
              required: ['ticker']
            }
          },
          {
            name: 'calculate_dcf',
            description: 'DCF 모델 기반 적정주가 계산',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: { type: 'string' },
                growth_rate: { type: 'number', default: 0.05 },
                discount_rate: { type: 'number', default: 0.1 }
              },
              required: ['ticker']
            }
          },
          {
            name: 'search_news',
            description: '종목 관련 뉴스 검색',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: { type: 'string' },
                days: { type: 'number', default: 7 }
              },
              required: ['ticker']
            }
          },
          {
            name: 'get_supply_demand',
            description: '수급 동향 분석',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: { type: 'string' },
                days: { type: 'number', default: 10 }
              },
              required: ['ticker']
            }
          },
          {
            name: 'compare_peers',
            description: '동종 업계 비교 분석',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: { type: 'string' },
                peer_tickers: { type: 'array', items: { type: 'string' } }
              },
              required: ['ticker']
            }
          }
        ]
      }
    });
  }

  // POST 요청: MCP 메서드 처리
  if (req.method === 'POST') {
    try {
      const { method, params, id } = req.body;
      
      // initialize 메서드 (필수)
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
      
      // ping 메서드 (헬스체크)
      if (method === 'ping') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {}
        });
      }
      
      // 도구 목록 요청
      if (method === 'tools/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            tools: [
              {
                name: 'analyze_equity',
                description: '종목의 종합적인 투자 정보 분석',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string', description: '종목 코드 (예: 005930)' }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'get_financial_data',
                description: '기업의 재무제표 데이터 조회',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    period: { type: 'string', default: 'annual' }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'get_technical_indicators',
                description: '기술적 지표 계산',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    indicators: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'calculate_dcf',
                description: 'DCF 모델 기반 적정주가 계산',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    growth_rate: { type: 'number', default: 0.05 },
                    discount_rate: { type: 'number', default: 0.1 }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'search_news',
                description: '종목 관련 뉴스 검색',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    days: { type: 'number', default: 7 }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'get_supply_demand',
                description: '수급 동향 분석',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    days: { type: 'number', default: 10 }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'compare_peers',
                description: '동종 업계 비교 분석',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string' },
                    peer_tickers: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['ticker']
                }
              }
            ]
          }
        });
      }
      
      // 도구 호출 처리
      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        
        let result: any;
        
        try {
          switch (name) {
            case 'analyze_equity': {
              const financialData = await stockData.getFinancialData(args.ticker);
              const technicalData = await stockData.getTechnicalIndicators(args.ticker, ['RSI', 'MACD']);
              const dcfData = await stockData.calculateDCF(args.ticker);
              const newsData = await stockData.searchNews(args.ticker);
              const supplyDemand = await stockData.getSupplyDemand(args.ticker);
              
              result = {
                content: [
                  {
                    type: 'text',
                    text: `📊 ${args.ticker} 종목 종합 분석

**현재 시세 정보**
- 현재가: ${financialData.currentPrice?.toLocaleString() || 'N/A'}원
- PER: ${financialData.per || 'N/A'}
- PBR: ${financialData.pbr || 'N/A'}
- ROE: ${financialData.roe || 'N/A'}%
- EPS: ${financialData.eps || 'N/A'}원

**기술적 지표**
- RSI: ${technicalData.RSI || 'N/A'} ${technicalData.RSI && technicalData.RSI < 30 ? '(과매도)' : technicalData.RSI && technicalData.RSI > 70 ? '(과매수)' : '(중립)'}
- MACD: ${technicalData.MACD || 'N/A'}

**DCF 밸류에이션**
- 적정주가: ${dcfData.fairValue?.toLocaleString() || 'N/A'}원
- 현재가 대비: ${dcfData.upside || 'N/A'}%

**수급 동향 (최근 10일)**
- 외국인: ${supplyDemand.foreign || 'N/A'}억원
- 기관: ${supplyDemand.institution || 'N/A'}억원

**최근 뉴스**
${newsData.slice(0, 3).map((n: any) => `- ${n.title}`).join('\n')}

**투자 포인트**
✅ ${financialData.per && parseFloat(financialData.per) < 10 ? 'PER이 낮아 저평가 상태' : 'PER 수준 적정'}
✅ ${technicalData.RSI && technicalData.RSI < 30 ? 'RSI 과매도 구간 진입' : 'RSI 수준 정상'}
✅ ${supplyDemand.foreign && supplyDemand.foreign > 0 ? '외국인 순매수 중' : '외국인 순매도 중'}`
                  }
                ]
              };
              break;
            }
            
            case 'get_financial_data': {
              const data = await stockData.getFinancialData(args.ticker);
              result = {
                content: [
                  {
                    type: 'text',
                    text: `📈 ${args.ticker} 재무 데이터

**주요 지표**
- 현재가: ${data.currentPrice?.toLocaleString() || 'N/A'}원
- PER: ${data.per || 'N/A'}
- PBR: ${data.pbr || 'N/A'}
- EPS: ${data.eps || 'N/A'}원
- ROE: ${data.roe || 'N/A'}%
- 부채비율: ${data.debtRatio || 'N/A'}%
- 매출액 성장률: ${data.revenueGrowth || 'N/A'}%
- 영업이익률: ${data.operatingMargin || 'N/A'}%`
                  }
                ]
              };
              break;
            }
            
            case 'get_technical_indicators': {
              const indicators = args.indicators || ['RSI', 'MACD', 'BollingerBands'];
              const data = await stockData.getTechnicalIndicators(args.ticker, indicators);
              result = {
                content: [
                  {
                    type: 'text',
                    text: `📉 ${args.ticker} 기술적 지표

**지표 분석**
- RSI: ${data.RSI || 'N/A'} ${data.RSI && data.RSI < 30 ? '(과매도)' : data.RSI && data.RSI > 70 ? '(과매수)' : '(중립)'}
- MACD: ${data.MACD || 'N/A'}
- Stochastic: ${data.Stochastic || 'N/A'}
- 볼린저 밴드: ${data.BollingerBands || 'N/A'}

**매매 신호**
${data.RSI && data.RSI < 30 ? '- RSI 과매도 → 매수 신호' : ''}
${data.RSI && data.RSI > 70 ? '- RSI 과매수 → 매도 신호' : ''}
${data.MACD && data.MACD > 0 ? '- MACD 상승 → 매수 신호' : ''}
${data.MACD && data.MACD < 0 ? '- MACD 하락 → 매도 신호' : ''}`
                  }
                ]
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
                content: [
                  {
                    type: 'text',
                    text: `💰 ${args.ticker} DCF 밸류에이션

**기본 가정**
- 성장률: ${(args.growth_rate || 0.05) * 100}%
- 할인율: ${(args.discount_rate || 0.1) * 100}%

**분석 결과**
- 적정주가: ${data.fairValue?.toLocaleString() || 'N/A'}원
- 현재가: ${data.currentPrice?.toLocaleString() || 'N/A'}원
- 상승 여력: ${data.upside || 'N/A'}%
- 평가: ${data.recommendation || 'N/A'}

**투자 판단**
${data.upside && data.upside > 20 ? '✅ 저평가 - 매수 추천' :
  data.upside && data.upside > 0 ? '⚠️ 적정 가치 - 중립' :
  '❌ 고평가 - 매도 고려'}`
                  }
                ]
              };
              break;
            }
            
            case 'search_news': {
              const news = await stockData.searchNews(args.ticker, args.days);
              result = {
                content: [
                  {
                    type: 'text',
                    text: `📰 ${args.ticker} 관련 뉴스 (최근 ${args.days || 7}일)

${news.slice(0, 10).map((item: any, i: number) => 
`**${i + 1}. ${item.title}**
- 일시: ${item.date}
- 요약: ${item.summary}
- 감성: ${item.sentiment}
`).join('\n')}`
                  }
                ]
              };
              break;
            }
            
            case 'get_supply_demand': {
              const data = await stockData.getSupplyDemand(args.ticker, args.days);
              result = {
                content: [
                  {
                    type: 'text',
                    text: `📊 ${args.ticker} 수급 동향 (최근 ${args.days || 10}일)

**순매수 금액**
- 외국인: ${data.foreign?.toLocaleString() || 'N/A'}억원
- 기관: ${data.institution?.toLocaleString() || 'N/A'}억원
- 개인: ${data.individual?.toLocaleString() || 'N/A'}억원

**수급 분석**
${data.foreign && data.foreign > 0 ? '✅ 외국인 매수세 우위' : '❌ 외국인 매도세'}
${data.institution && data.institution > 0 ? '✅ 기관 매수세' : '❌ 기관 매도세'}
${data.individual && data.individual < 0 ? '⚠️ 개인 투자자 매도' : '✅ 개인 투자자 매수'}

**투자 신호**
${(data.foreign && data.foreign > 0) && (data.institution && data.institution > 0) ? 
  '🔥 스마트머니 매수 - 강한 매수 신호' :
  (data.foreign && data.foreign > 0) || (data.institution && data.institution > 0) ?
  '📈 부분적 매수세 - 관망 추천' :
  '📉 매도 압력 - 신중한 접근 필요'}`
                  }
                ]
              };
              break;
            }
            
            case 'compare_peers': {
              const data = await stockData.comparePeers(args.ticker, args.peer_tickers);
              
              if (!data || data.length === 0) {
                result = {
                  content: [
                    {
                      type: 'text',
                      text: `🔍 동종업계 비교 분석

데이터를 가져오는 중 오류가 발생했습니다.
다시 시도해주세요.`
                    }
                  ]
                };
              } else {
                result = {
                  content: [
                    {
                      type: 'text',
                      text: `🔍 동종업계 비교 분석

${data.map((company: any) => `
**${company.name} (${company.ticker})**
- 현재가: ${company.currentPrice?.toLocaleString() || 'N/A'}원
- 시가총액: ${company.marketCap?.toLocaleString() || 'N/A'}억원
- PER: ${company.per || 'N/A'}
- PBR: ${company.pbr || 'N/A'}
- ROE: ${company.roe || 'N/A'}%
- 매출성장률: ${company.revenueGrowth || 'N/A'}%
`).join('\n')}

**상대 밸류에이션**
${data.length > 1 && data[0] && data[0].per && data[0].per !== 'N/A' ? 
  `- ${args.ticker}의 PER이 업계 평균 대비 ${
    parseFloat(data[0].per) < data.slice(1).reduce((acc: number, cur: any) => acc + (parseFloat(cur.per) || 0), 0) / (data.length - 1) ?
    '낮음 (저평가)' : '높음 (고평가)'
  }` : '- PER 비교 데이터 부족'}`
                    }
                  ]
                };
              }
              break;
            }
            
            default:
              result = {
                content: [
                  {
                    type: 'text',
                    text: `알 수 없는 도구: ${name}`
                  }
                ]
              };
          }
        } catch (error: any) {
          console.error(`Error executing ${name}:`, error);
          result = {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message || '도구 실행 중 오류가 발생했습니다.'}`
              }
            ]
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
  
  // 지원하지 않는 메서드
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET, POST, and OPTIONS methods are supported'
  });
}