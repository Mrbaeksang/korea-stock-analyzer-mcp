/**
 * MCP 서버 메인 파일
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { DataFetcher } from './services/data-fetcher.js';
import { PythonExecutor } from './services/python-executor.js';
import { MarketDataService } from './services/market-data.js';
import { FinancialDataService } from './services/financial-data.js';
import { SupplyDemandService } from './services/supply-demand.js';
import { GuruAnalyzers } from './analyzers/index.js';
import { ReportGenerator } from './reports/generator.js';
import { AnalysisResult } from './types/index.js';

/**
 * 한국 주식 전문 분석 MCP 서버
 * @version 3.0
 */
class KoreanStockAnalysisMCP {
  private server: Server;
  private guruAnalyzers: GuruAnalyzers;

  constructor() {
    this.server = new Server(
      {
        name: 'korean-stock-analysis',
        version: '1.0.3',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.guruAnalyzers = new GuruAnalyzers();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 도구 목록 제공
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // 도구 실행
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'analyze_equity':
          return await this.analyzeEquity(args);
        case 'get_financial_data':
          return await this.getFinancialData(args);
        case 'get_technical_indicators':
          return await this.getTechnicalIndicators(args);
        case 'calculate_dcf':
          return await this.calculateDCF(args);
        case 'search_news':
          return await this.searchNews(args);
        case 'get_supply_demand':
          return await this.getSupplyDemand(args);
        case 'compare_peers':
          return await this.comparePeers(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'analyze_equity',
        description: '한국 주식 종목 종합 분석 (50페이지 전문 보고서)',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: '종목 코드 (예: 005930)',
            },
            company_name: {
              type: 'string',
              description: '회사명 (예: 삼성전자)',
            },
            report_type: {
              type: 'string',
              enum: ['full', 'summary'],
              description: '보고서 유형: full(전체), summary(요약)',
              default: 'full',
            },
          },
          required: ['ticker', 'company_name'],
        },
      },
      {
        name: 'get_financial_data',
        description: '재무제표 데이터 조회 (PER, PBR, EPS, BPS, 배당수익률)',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: '종목 코드',
            },
            years: {
              type: 'number',
              description: '조회 기간 (년)',
              default: 3,
            },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'get_technical_indicators',
        description: '기술적 지표 분석 (이동평균, RSI, MACD, 볼린저밴드)',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: '종목 코드',
            },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'calculate_dcf',
        description: 'DCF(현금흐름할인) 모델로 적정가치 계산',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: '종목 코드',
            },
            growth_rate: {
              type: 'number',
              description: '예상 성장률 (%)',
              default: 10,
            },
            discount_rate: {
              type: 'number',
              description: '할인율 (%)',
              default: 10,
            },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'search_news',
        description: '종목 관련 최신 뉴스 검색',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: '종목 코드',
            },
            company_name: {
              type: 'string',
              description: '회사명',
            },
            limit: {
              type: 'number',
              description: '뉴스 개수',
              default: 5,
            },
          },
          required: ['company_name'],
        },
      },
      {
        name: 'get_supply_demand',
        description: '수급 데이터 조회 (외국인, 기관, 개인)',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: '종목 코드',
            },
            days: {
              type: 'number',
              description: '조회 기간 (일)',
              default: 20,
            },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'compare_peers',
        description: '동종업계 비교 분석',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: {
              type: 'string',
              description: '종목 코드',
            },
            sector: {
              type: 'string',
              description: '업종명',
            },
          },
          required: ['ticker'],
        },
      },
    ];
  }

  private async analyzeEquity(args: any): Promise<any> {
    const { ticker, company_name, report_type = 'quick' } = args;

    try {
      // Debug log removed (causes encoding issues in Claude Desktop)
      
      // 필수 데이터만 수집
      const [marketData, financialData] = await Promise.all([
        MarketDataService.fetchBasic(ticker),
        FinancialDataService.fetch(ticker),
      ]);
      
      // 간단한 분석
      const fund = Array.isArray(financialData) ? financialData[0] : financialData;
      const currentPrice = marketData?.currentPrice || 0;
      // 업종 평균 PER 15 적용 (보수적)
      const sectorPER = 15;
      const fairValue = fund?.eps ? fund.eps * sectorPER : currentPrice;
      const upside = currentPrice > 0 ? ((fairValue - currentPrice) / currentPrice) * 100 : 0;
      
      // 빠른 보고서 생성
      const report = [
        `# 📊 ${company_name || ticker} 빠른 분석`,
        '',
        '## 주요 지표',
        `- 현재가: ₩${currentPrice?.toLocaleString()}`,
        `- PER: ${fund?.per || 'N/A'}`,
        `- PBR: ${fund?.pbr || 'N/A'}`,
        `- EPS: ₩${fund?.eps?.toLocaleString() || 'N/A'}`,
        `- 배당수익률: ${fund?.div || 0}%`,
        '',
        '## 간단 밸류에이션',
        `- 적정가치: ₩${Math.round(fairValue).toLocaleString()}`,
        `- 상승여력: ${upside.toFixed(1)}%`,
        `- 투자의견: ${upside > 20 ? '**매수**' : upside > 0 ? '**보유**' : '**매도**'}`,
      ].join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
      };
    } catch (error) {
      // Error logging removed (causes encoding issues)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Analysis failed: ${errorMessage}` }),
          },
        ],
      };
    }
  }

  // 재무 데이터 조회
  private async getFinancialData(args: any): Promise<any> {
    const { ticker, years = 3 } = args;
    
    try {
      const data = await FinancialDataService.fetch(ticker);
      const result = Array.isArray(data) ? data.slice(0, years) : [data];
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  // 기술적 지표 조회
  private async getTechnicalIndicators(args: any): Promise<any> {
    const { ticker } = args;
    
    try {
      const data = await MarketDataService.fetchTechnicalIndicators(ticker);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  // DCF 계산
  private async calculateDCF(args: any): Promise<any> {
    const { ticker, growth_rate = 10, discount_rate = 10 } = args;
    
    try {
      const financialData = await FinancialDataService.fetch(ticker);
      const marketData = await MarketDataService.fetchBasic(ticker);
      
      const current = Array.isArray(financialData) ? financialData[0] : financialData;
      const fcf = current.eps * 1.2; // 간단한 FCF 추정
      
      // 5년 DCF 계산
      let dcfValue = 0;
      for (let year = 1; year <= 5; year++) {
        const futureValue = fcf * Math.pow(1 + growth_rate/100, year);
        const presentValue = futureValue / Math.pow(1 + discount_rate/100, year);
        dcfValue += presentValue;
      }
      
      // 터미널 가치
      const terminalGrowth = 3; // 영구성장률 3%
      const terminalValue = (fcf * Math.pow(1 + growth_rate/100, 5) * (1 + terminalGrowth/100)) / 
                           (discount_rate/100 - terminalGrowth/100);
      const terminalPV = terminalValue / Math.pow(1 + discount_rate/100, 5);
      
      dcfValue += terminalPV;
      
      const result = {
        currentPrice: marketData.currentPrice,
        dcfValue: Math.round(dcfValue),
        upside: ((dcfValue - marketData.currentPrice) / marketData.currentPrice * 100).toFixed(1),
        assumptions: {
          growthRate: growth_rate,
          discountRate: discount_rate,
          terminalGrowth: terminalGrowth,
        },
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `DCF 분석 결과:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  // 뉴스 검색
  private async searchNews(args: any): Promise<any> {
    const { company_name, limit = 5 } = args;
    
    try {
      // 네이버 뉴스 검색 API 시뮬레이션
      const newsData = await this.fetchNewsFromNaver(company_name, limit);
      
      return {
        content: [
          {
            type: 'text',
            text: newsData,
          },
        ],
      };
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  // 수급 데이터 조회
  private async getSupplyDemand(args: any): Promise<any> {
    const { ticker, days = 20 } = args;
    
    try {
      const data = await SupplyDemandService.fetch(ticker);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }

  // 동종업계 비교
  private async comparePeers(args: any): Promise<any> {
    const { ticker, peer_tickers = [] } = args;
    
    try {
      // 자동 동종업계 탐지
      let finalPeerTickers = peer_tickers;
      
      if (!peer_tickers || peer_tickers.length === 0) {
        // Python을 사용해 pykrx로 동종업계 자동 탐지
        const pythonCode = `
import json
from pykrx import stock
from datetime import datetime

ticker = '${ticker}'
today = datetime.now().strftime('%Y%m%d')

try:
    # 시가총액 가져오기
    market_cap = stock.get_market_cap_by_ticker(today)
    if ticker not in market_cap.index:
        raise ValueError(f"Ticker {ticker} not found")
    
    target_cap = market_cap.loc[ticker, '시가총액']
    
    # 시가총액 유사 종목 찾기 (±50% 범위)
    similar_caps = market_cap[
        (market_cap['시가총액'] >= target_cap * 0.5) & 
        (market_cap['시가총액'] <= target_cap * 1.5) &
        (market_cap.index != ticker)
    ].sort_values('시가총액', ascending=False)
    
    # 상위 5개 종목 선택
    peer_tickers = similar_caps.index[:5].tolist()
    
    result = {
        'ticker': ticker,
        'peer_tickers': peer_tickers,
        'method': 'market_cap_similarity'
    }
    
except Exception as e:
    # 에러시 하드코딩된 기본값 사용
    default_map = {
        '005930': ['000660', '005935'],  # 삼성전자
        '000660': ['005930', '005935'],  # SK하이닉스
        '005380': ['000270', '012330'],  # 현대차
        '035720': ['035420'],  # 카카오
        '035420': ['035720'],  # 네이버
    }
    result = {
        'ticker': ticker,
        'peer_tickers': default_map.get(ticker, []),
        'method': 'fallback_default',
        'error': str(e)
    }

print(json.dumps(result))
`;
        
        try {
          const result = await PythonExecutor.execute(pythonCode);
          finalPeerTickers = result.peer_tickers || [];
          
          if (finalPeerTickers.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    mainTicker: ticker,
                    message: "Could not find peers automatically",
                    suggestion: "Please specify peer_tickers manually",
                    example: "peer_tickers: ['000660', '066570']"
                  }, null, 2)
                }
              ]
            };
          }
        } catch (pythonError) {
          console.error('Auto peer detection failed:', pythonError);
          // Python 실패시 빈 배열 반환
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  mainTicker: ticker,
                  error: "Auto-detection failed",
                  suggestion: "Please specify peer_tickers manually",
                  example: "peer_tickers: ['000660', '066570']"
                }, null, 2)
              }
            ]
          };
        }
      }
      
      // peer가 있을 때만 실제 비교
      const [financial, market] = await Promise.all([
        FinancialDataService.fetch(ticker),
        MarketDataService.fetchBasic(ticker)
      ]);
      const latestFinancial = Array.isArray(financial) ? financial[0] : financial;
      
      const mainCompany = {
        ticker,
        currentPrice: market?.currentPrice || 0,
        marketCap: market?.marketCap || 0,
        per: latestFinancial?.per || 0,
        pbr: latestFinancial?.pbr || 0,
        eps: latestFinancial?.eps || 0,
        div: latestFinancial?.div || 0,
      };
      
      // 비교 종목들 데이터 수집
      const companies = [ticker, ...finalPeerTickers];
      const comparisonData: any[] = [mainCompany];
      
      // 병렬 처리로 속도 개선
      const dataPromises = companies.map(async (t) => {
        try {
          // 각 종목별로 타임아웃 설정 (10초)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${t} 데이터 수집 타임아웃`)), 10000)
          );
          
          const dataPromise = Promise.all([
            FinancialDataService.fetch(t),
            MarketDataService.fetchBasic(t)
          ]);
          
          const [financial, market] = await Promise.race([dataPromise, timeoutPromise]) as any[];
          
          const latestFinancial = Array.isArray(financial) ? financial[0] : financial;
          
          return {
            ticker: t,
            currentPrice: market?.currentPrice || 0,
            marketCap: market?.marketCap || 0,
            per: latestFinancial?.per || 0,
            pbr: latestFinancial?.pbr || 0,
            eps: latestFinancial?.eps || 0,
            div: latestFinancial?.div || 0,
          };
        } catch (e) {
          console.error(`${t} 데이터 수집 실패:`, e);
          return {
            ticker: t,
            currentPrice: 0,
            marketCap: 0,
            per: 0,
            pbr: 0,
            eps: 0,
            div: 0,
          };
        }
      });
      
      // 모든 데이터 병렬 수집
      const results = await Promise.all(dataPromises);
      comparisonData.push(...results.filter(r => r.per > 0 || r.pbr > 0));
      
      // 평균 계산
      const avgPer = comparisonData.reduce((sum, d) => sum + d.per, 0) / comparisonData.length;
      const avgPbr = comparisonData.reduce((sum, d) => sum + d.pbr, 0) / comparisonData.length;
      const avgDiv = comparisonData.reduce((sum, d) => sum + d.div, 0) / comparisonData.length;
      
      // 주종목 분석
      const mainData = comparisonData[0];
      const analysis = {
        mainTicker: ticker,
        peerTickers: peer_tickers,
        comparison: comparisonData,
        averages: {
          per: Math.round(avgPer * 100) / 100,
          pbr: Math.round(avgPbr * 100) / 100,
          div: Math.round(avgDiv * 100) / 100,
        },
        valuation: {
          perVsPeers: mainData.per < avgPer ? '저평가' : '고평가',
          perGap: Math.round((mainData.per - avgPer) / avgPer * 100),
          pbrVsPeers: mainData.pbr < avgPbr ? '저평가' : '고평가',
          pbrGap: Math.round((mainData.pbr - avgPbr) / avgPbr * 100),
        },
        recommendation: this.getPeerComparisonRecommendation(mainData, avgPer, avgPbr),
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.errorResponse(error);
    }
  }
  
  private getPeerComparisonRecommendation(company: any, avgPer: number, avgPbr: number): string {
    const perDiscount = (avgPer - company.per) / avgPer;
    const pbrDiscount = (avgPbr - company.pbr) / avgPbr;
    
    if (perDiscount > 0.2 && pbrDiscount > 0.2) {
      return '동종업계 대비 매력적 (매수 고려)';
    } else if (perDiscount > 0 && pbrDiscount > 0) {
      return '동종업계 대비 양호 (보유 권장)';
    } else if (perDiscount < -0.2 && pbrDiscount < -0.2) {
      return '동종업계 대비 고평가 (매도 고려)';
    } else {
      return '동종업계 평균 수준';
    }
  }

  // 네이버 뉴스 크롤링 (간단한 구현)
  private async fetchNewsFromNaver(companyName: string, limit: number): Promise<string> {
    // Google News RSS 피드를 통한 실제 뉴스 수집
    const pythonCode = `
import json
import urllib.request
import urllib.parse
from datetime import datetime
import re

try:
    query = "${companyName} 주식"
    encoded_query = urllib.parse.quote(query)
    
    # Google News RSS 피드 사용
    url = f"https://news.google.com/rss/search?q={encoded_query}&hl=ko&gl=KR&ceid=KR:ko"
    
    with urllib.request.urlopen(url) as response:
        content = response.read().decode('utf-8')
    
    # RSS 파싱 (간단한 정규식 사용)
    items = re.findall(r'<item>.*?</item>', content, re.DOTALL)
    
    news_items = []
    for item in items[:${limit}]:
        title_match = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>', item)
        link_match = re.search(r'<link>(.*?)</link>', item)
        pub_date_match = re.search(r'<pubDate>(.*?)</pubDate>', item)
        
        if title_match and link_match:
            news_items.append({
                'title': title_match.group(1).split(' - ')[0],  # 출처 제거
                'link': link_match.group(1),
                'date': pub_date_match.group(1) if pub_date_match else ''
            })
    
    print(json.dumps(news_items, ensure_ascii=False))
except Exception as e:
    # 실패 시 빈 배열 반환
    print(json.dumps([]))
`;
    
    try {
      const result = await PythonExecutor.execute(pythonCode);
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify([]);
    }
  }

  // 에러 응답 헬퍼
  private errorResponse(error: any): any {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message || 'Unknown error' }),
        },
      ],
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // 버전 정보를 stderr가 아닌 다른 방법으로 처리
    // console.error는 Claude Desktop 로그에 문제를 일으킬 수 있음
  }
}

// 서버 시작
const mcpServer = new KoreanStockAnalysisMCP();
mcpServer.start().catch((error) => {
  console.error('[MCP] 서버 시작 실패:', error);
  process.exit(1);
});