// 레이트 리미팅 설정
const requestCounts = new Map();
const RATE_LIMIT = 60; // 분당 60회 (카카오 PlayMCP 테스트용 충분)
const WINDOW_MS = 60000; // 1분 윈도우
const CLEANUP_INTERVAL = 300000; // 5분마다 메모리 정리

function checkRateLimit(ip) {
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

export default async function handler(req, res) {
  // 레이트 리미팅 체크 (Vercel은 x-real-ip 제공)
  const clientIp = req.headers['x-real-ip'] || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   'unknown';
  
  const rateLimit = checkRateLimit(clientIp);
  
  // Rate limit 헤더 추가 (표준 헤더)
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', rateLimit.resetTime);
  
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetTime * 1000 - Date.now()) / 1000));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: Math.ceil((rateLimit.resetTime * 1000 - Date.now()) / 1000)
    });
  }
  
  // CORS 설정 (카카오 PlayMCP 접근 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청: 도구 목록 및 서버 정보 반환
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
          description: '한국 주식 종목 종합 분석 (빠른/요약/전체 보고서)',
          inputSchema: {
            type: 'object',
            properties: {
              ticker: { type: 'string', description: '종목 코드 (예: 005930)' },
              company_name: { type: 'string', description: '회사명 (예: 삼성전자)' },
              report_type: { 
                type: 'string', 
                enum: ['quick', 'summary', 'full'],
                description: '보고서 유형'
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
              ticker: { type: 'string' },
              years: { type: 'number', default: 3 }
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
              ticker: { type: 'string' }
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
              ticker: { type: 'string' },
              growth_rate: { type: 'number', default: 10 },
              discount_rate: { type: 'number', default: 10 }
            },
            required: ['ticker']
          }
        },
        {
          name: 'search_news',
          description: '종목 관련 최신 뉴스 검색',
          inputSchema: {
            type: 'object',
            properties: {
              company_name: { type: 'string' },
              limit: { type: 'number', default: 5 }
            },
            required: ['company_name']
          }
        },
        {
          name: 'get_supply_demand',
          description: '수급 데이터 조회 (외국인, 기관, 개인)',
          inputSchema: {
            type: 'object',
            properties: {
              ticker: { type: 'string' },
              days: { type: 'number', default: 20 }
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
              ticker: { type: 'string' },
              peer_tickers: { 
                type: 'array',
                items: { type: 'string' },
                description: '비교할 종목들 (미입력시 자동 탐지)'
              }
            },
            required: ['ticker']
          }
        }
      ]
    }
    });
  }

  // POST 요청: MCP 명령 실행 (JSON-RPC 2.0)
  if (req.method === 'POST') {
    const { jsonrpc, method, params, id } = req.body;
    
    try {
      // MCP 표준 메서드 처리
      if (method === 'initialize') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            protocolVersion: '1.0',
            serverInfo: {
              name: 'Korean Stock Analyzer MCP',
              version: '1.1.1'
            },
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
            }
          }
        });
      }
      
      // tools/list 메서드
      if (method === 'tools/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            tools: [
              {
                name: 'analyze_equity',
                description: '한국 주식 종목 종합 분석 (빠른/요약/전체 보고서)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string', description: '종목 코드 (예: 005930)' },
                    company_name: { type: 'string', description: '회사명 (예: 삼성전자)' },
                    report_type: { type: 'string', enum: ['quick', 'summary', 'full'], description: '보고서 유형' }
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
                    ticker: { type: 'string', description: '종목 코드' },
                    years: { type: 'number', default: 3, description: '조회 기간(년)' }
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
                    ticker: { type: 'string', description: '종목 코드' }
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
                    ticker: { type: 'string', description: '종목 코드' },
                    growth_rate: { type: 'number', default: 10, description: '예상 성장률(%)' },
                    discount_rate: { type: 'number', default: 10, description: '할인율(%)' }
                  },
                  required: ['ticker']
                }
              },
              {
                name: 'search_news',
                description: '종목 관련 최신 뉴스 검색',
                inputSchema: {
                  type: 'object',
                  properties: {
                    company_name: { type: 'string', description: '회사명' },
                    limit: { type: 'number', default: 5, description: '뉴스 개수' }
                  },
                  required: ['company_name']
                }
              },
              {
                name: 'get_supply_demand',
                description: '수급 데이터 조회 (외국인, 기관, 개인)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: { type: 'string', description: '종목 코드' },
                    days: { type: 'number', default: 20, description: '조회 기간(일)' }
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
                    ticker: { type: 'string', description: '종목 코드' },
                    peer_tickers: { 
                      type: 'array',
                      items: { type: 'string' },
                      description: '비교할 종목들 (미입력시 자동 탐지)'
                    }
                  },
                  required: ['ticker']
                }
              }
            ]
          }
        });
      }
      
      // tools/call 메서드  
      if (method === 'tools/call') {
        const { name: toolName, arguments: toolArgs } = params;
        
        // 동적 import로 stock-data 모듈 로드
        const { getFinancialData, STOCK_NAMES } = await import('./stock-data.js');
        
        // get_financial_data 도구 처리
        if (toolName === 'get_financial_data') {
          const data = await getFinancialData(toolArgs.ticker);
          
          if (!data) {
            return res.status(200).json({
              jsonrpc: '2.0',
              id: id || 1,
              result: {
                content: [{
                  type: 'text',
                  text: `종목 코드 ${toolArgs.ticker}의 데이터를 조회할 수 없습니다. 올바른 종목 코드인지 확인해주세요.`
                }]
              }
            });
          }
          
          return res.status(200).json({
            jsonrpc: '2.0',
            id: id || 1,
            result: {
              content: [{
                type: 'text',
                text: `# 📊 ${STOCK_NAMES[toolArgs.ticker] || toolArgs.ticker} 재무제표 데이터

## 최근 3년 재무 지표
- **현재가**: ₩${data.currentPrice?.toLocaleString() || 'N/A'}
- **PER**: ${data.per}배
- **PBR**: ${data.pbr}배  
- **EPS**: ₩${data.eps}
- **BPS**: ₩${data.bps}
- **배당수익률**: ${data.dividendYield}
- **ROE**: ${data.roe}
- **시가총액**: ${data.marketCap ? (data.marketCap/1000000000000).toFixed(1) + '조원' : 'N/A'}
- **거래량**: ${data.volume?.toLocaleString() || 'N/A'}

💡 Yahoo Finance API 기반 실시간 데이터
더 정확한 분석은 로컬 MCP 서버를 사용하세요.`
                }]
              }
            }
          });
        }
        
        // analyze_equity 도구 처리
        if (toolName === 'analyze_equity') {
          const data = await getFinancialData(toolArgs.ticker);
          const companyName = toolArgs.company_name || STOCK_NAMES[toolArgs.ticker] || toolArgs.ticker;
          
          return res.status(200).json({
            jsonrpc: '2.0',
            id: id || 1,
            result: {
              content: [{
                type: 'text',
                text: `# 📊 ${companyName} 종합 분석 리포트

## 1. 기본 정보
- **종목코드**: ${toolArgs.ticker}
- **현재가**: ₩${data?.currentPrice?.toLocaleString() || 'N/A'}
- **시가총액**: ${data?.marketCap ? (data.marketCap/1000000000000).toFixed(1) + '조원' : 'N/A'}

## 2. 투자 지표
- **PER**: ${data?.per || 'N/A'}배 (동종업계 평균: 12배)
- **PBR**: ${data?.pbr || 'N/A'}배 (동종업계 평균: 1.5배)
- **ROE**: ${data?.roe || 'N/A'} (양호: 10% 이상)
- **배당수익률**: ${data?.dividendYield || 'N/A'}

## 3. 투자 전략 분석
### 🎩 워런 버핏 관점
- ROE ${data?.roe || 'N/A'} → ${parseFloat(data?.roe) > 15 ? '✅ 우수' : '⚠️ 보통'}
- 안정적 수익성 평가 필요

### 📊 피터 린치 관점  
- PER ${data?.per || 'N/A'}배 → ${parseFloat(data?.per) < 15 ? '✅ 저평가' : '⚠️ 적정'}
- 성장률 대비 밸류에이션 검토 필요

## 4. 투자 의견
${parseFloat(data?.per) < 20 && parseFloat(data?.roe) > 10 ? 
'**매수 고려** - 저평가 구간, 수익성 양호' : 
'**중립/관망** - 추가 분석 필요'}

💡 실시간 Yahoo Finance 데이터 기반
더 정확한 분석은 로컬 MCP 서버를 사용하세요.`
                }]
              }
            }
          });
        }
        
        // 기타 도구들 처리
        const responses = {
          'get_technical_indicators': `기술적 지표는 로컬 MCP 서버에서 제공됩니다.`,
          'calculate_dcf': `DCF 계산은 로컬 MCP 서버에서 제공됩니다.`,
          'search_news': `뉴스 검색은 로컬 MCP 서버에서 제공됩니다.`,
          'get_supply_demand': `수급 데이터는 로컬 MCP 서버에서 제공됩니다.`,
          'compare_peers': `동종업계 비교는 로컬 MCP 서버에서 제공됩니다.`
        };
        
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            content: [{
              type: 'text',
              text: responses[toolName] || `${toolName} 도구는 로컬 MCP 서버에서 제공됩니다.\n\n설치 방법:\nnpx @mrbaeksang/korea-stock-analyzer-mcp`
            }]
          }
        });
      }
      
      // 알 수 없는 메서드
      return res.status(200).json({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: -32601,
          message: 'Method not found',
          data: { method }
        }
      });
      
    } catch (error) {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}