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
      name: 'Korean Stock Analyzer MCP',
      version: '1.1.1',
      description: '한국 주식 시장 전문 분석 도구',
      author: 'Mrbaeksang',
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
    });
  }

  // POST 요청: MCP 명령 실행 (간단한 시뮬레이션)
  if (req.method === 'POST') {
    const { method, params } = req.body;
    
    try {
      // 실제 구현시에는 여기에 MCP 서버 실행 로직 추가
      // 현재는 데모 응답 반환
      
      // 예시: analyze_equity 요청 처리
      if (method === 'analyze_equity') {
        return res.status(200).json({
          content: [
            {
              type: 'text',
              text: `# 📊 ${params.company_name || params.ticker} 실시간 분석
              
## 주요 지표
- 종목코드: ${params.ticker}
- 분석 유형: ${params.report_type || 'quick'}

✅ 실제 서비스에서는 pykrx API를 통해 실시간 데이터를 제공합니다.
- 현재가, 거래량, 시가총액
- PER, PBR, EPS, BPS
- 배당수익률, ROE
- 외국인/기관 수급
- 동종업계 비교

자세한 사용법은 GitHub 참조:
https://github.com/Mrbaeksang/korea-stock-analyzer-mcp`
            }
          ]
        });
      }
      
      // 다른 도구들도 비슷하게 처리
      return res.status(200).json({
        content: [
          {
            type: 'text',
            text: `Method: ${method}\nParams: ${JSON.stringify(params, null, 2)}\n\n실제 데이터는 MCP 서버 설치 후 사용 가능합니다.`
          }
        ]
      });
      
    } catch (error) {
      return res.status(500).json({
        error: 'Execution failed',
        message: error.message
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}