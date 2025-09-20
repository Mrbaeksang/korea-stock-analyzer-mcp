import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as stockData from './stock-data.js';
import type {
  MarketSnapshot,
  FinancialSnapshot,
  TechnicalSnapshot,
  SupplyDemandSnapshot,
  TickerSearchResult,
  DCFValuation,
  PeerComparison,
} from './stock-data.js';

const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL = 300_000;
const HUNDRED_MILLION = 100_000_000;

const numberFormatter = new Intl.NumberFormat('ko-KR');
const decimalFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  const validRequests = userRequests.filter(time => now - time < WINDOW_MS);

  if (validRequests.length >= RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((validRequests[0] + WINDOW_MS) / 1000),
    };
  }

  validRequests.push(now);
  requestCounts.set(ip, validRequests);

  return {
    allowed: true,
    remaining: RATE_LIMIT - validRequests.length,
    resetTime: Math.ceil((now + WINDOW_MS) / 1000),
  };
}

const requestCounts = new Map<string, number[]>();
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

function formatNumber(value: number | null | undefined, fractionDigits?: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  if (fractionDigits !== undefined) {
    return value.toLocaleString('ko-KR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }
  return numberFormatter.format(value);
}

function formatWon(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `₩${numberFormatter.format(value)}`;
}

function formatHundredMillion(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${decimalFormatter.format(value)} 억원`;
}

function formatPercent(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(fractionDigits)}%`;
}

function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${numberFormatter.format(value)}`;
}

function formatShares(value: number | null | undefined): string {
  const formatted = formatNumber(value);
  return formatted === 'N/A' ? formatted : `${formatted}주`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'N/A';
  }
  if (value.includes('-')) {
    return value;
  }
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

function hasError(data: unknown): data is { error: string } {
  return typeof data === 'object' && data !== null && typeof (data as any).error === 'string';
}

function unwrap<T>(label: string, data: T | { error: string }): T {
  if (hasError(data)) {
    throw new Error(`${label}: ${data.error}`);
  }
  return data as T;
}

function ensureStringArg(args: any, key: string): string {
  const value = args?.[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} 파라미터가 필요합니다.`);
  }
  return value.trim();
}

function ensureNumberArg(args: any, key: string, defaultValue?: number): number {
  const value = args?.[key];
  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`${key} 파라미터가 필요합니다.`);
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`${key} 파라미터는 숫자여야 합니다.`);
  }
  return num;
}

type TickerSuggestion = TickerSearchResult['results'][number];

function formatFinancialMetrics(financial: FinancialSnapshot): string[] {
  const metrics = financial.metrics;
  return [
    `- PER: ${formatNumber(metrics.per)}`,
    `- PBR: ${formatNumber(metrics.pbr)}`,
    `- EPS: ${formatWon(metrics.eps)}`,
    `- BPS: ${formatWon(metrics.bps)}`,
    `- ROE: ${formatPercent(metrics.roe)}`,
    `- 배당수익률: ${formatPercent(metrics.dividendYield)}`,
    `- 주당배당금: ${formatWon(metrics.dividendPerShare)}`,
  ];
}

function formatFinancialYearly(financial: FinancialSnapshot): string[] {
  if (!financial.yearly || financial.yearly.length === 0) {
    return ['연도별 데이터가 없습니다.'];
  }

  return financial.yearly.map(item =>
    `- ${item.year}: PER ${formatNumber(item.per)}, PBR ${formatNumber(item.pbr)}, EPS ${formatWon(item.eps)}, 배당수익률 ${formatPercent(item.dividendYield)}`,
  );
}

function formatTechnicalSection(technical: TechnicalSnapshot): string[] {
  return [
    `- 현재가: ${formatWon(technical.price)} (기준일 ${formatDate(technical.asOf)})`,
    `- 이동평균: MA5 ${formatWon(technical.movingAverages.ma5)}, MA20 ${formatWon(technical.movingAverages.ma20)}, MA60 ${formatWon(technical.movingAverages.ma60)}`,
    `- RSI(14): ${formatNumber(technical.rsi14, 2)}`,
    `- MACD: Line ${formatNumber(technical.macd.line, 2)}, Signal ${formatNumber(technical.macd.signal, 2)}, Histogram ${formatNumber(technical.macd.histogram, 2)}`,
    `- 볼린저밴드: 상단 ${formatWon(technical.bollinger.upper)}, 중심 ${formatWon(technical.bollinger.middle)}, 하단 ${formatWon(technical.bollinger.lower)}`,
    `- Stochastic(14,3): %K ${formatNumber(technical.stochastic.k, 2)}, %D ${formatNumber(technical.stochastic.d, 2)}`,
    `- 20일 변동성: ${formatPercent(technical.volatility)}`,
  ];
}

function formatSupplySummary(supply: SupplyDemandSnapshot): string[] {
  const summary = supply.netAmountByInvestor;
  return [
    `- 기간: ${formatDate(supply.period.from)} ~ ${formatDate(supply.period.to)}`,
    `- 외국인 순매수: ${formatHundredMillion(summary.foreign)}`,
    `- 기관 순매수: ${formatHundredMillion(summary.institution)}`,
    `- 개인 순매수: ${formatHundredMillion(summary.individual)}`,
  ];
}

function formatSupplyRecent(supply: SupplyDemandSnapshot): string[] {
  if (!supply.recent || supply.recent.length === 0) {
    return ['최근 수급 데이터를 찾지 못했습니다.'];
  }
  return supply.recent.map(item =>
    `- ${item.date}: 외국인 ${formatHundredMillion(item.foreign)}, 기관 ${formatHundredMillion(item.institution)}, 개인 ${formatHundredMillion(item.individual)}`,
  );
}

function formatPriceHistory(market: MarketSnapshot, days = 5): string[] {
  const history = market.history.slice(-days);
  if (history.length === 0) {
    return ['가격 히스토리가 부족합니다.'];
  }
  return history.map(item => `- ${item.date}: ${formatWon(item.close)} / 거래량 ${formatShares(item.volume)} `);
}

function formatDcfSection(dcf: DCFValuation): string[] {
  return [
    `- 성장률 가정: ${formatPercent(dcf.assumptions.growthRate)}`,
    `- 할인율 가정: ${formatPercent(dcf.assumptions.discountRate)}`,
    `- 터미널 성장률: ${formatPercent(dcf.assumptions.terminalGrowth)}`,
    `- 내재가치: ${formatWon(dcf.intrinsicValue)}`,
    `- 적정 주가: ${formatWon(dcf.fairValue)}`,
    `- 현재가: ${formatWon(dcf.currentPrice)}`,
    `- 상승여력: ${formatPercent(dcf.upsidePercent)}`,
    `- 판단: ${dcf.recommendation ?? 'N/A'}`,
  ];
}

function formatPeersSection(peers: PeerComparison): string[] {
  if (!peers.peers || peers.peers.length === 0) {
    return ['비교 가능한 동종 종목이 없습니다.'];
  }
  const rows = peers.peers.map(peer => {
    const price = formatWon(peer.price);
    const cap = peer.marketCap !== null && peer.marketCap !== undefined
      ? formatHundredMillion(peer.marketCap / HUNDRED_MILLION)
      : '시가총액 N/A';
    return `- ${peer.ticker} ${peer.name}: ${price}, ${cap}`;
  });
  return [
    `기준일: ${formatDate(peers.asOf)}`,
    `기준 종목 시총: ${peers.base.marketCap ? formatHundredMillion(peers.base.marketCap / HUNDRED_MILLION) : 'N/A'}`,
    ...rows,
  ];
}

async function buildSearchTickerText(companyName: string): Promise<string> {
  const payload = await stockData.searchTicker(companyName);
  if (hasError(payload)) {
    throw new Error(`종목 검색 실패: ${payload.error}`);
  }

  if (payload.count === 0) {
    return `🔍 "${companyName}" 검색 결과가 없습니다.`;
  }

  const rows = payload.results.map((item: TickerSuggestion) => {
    const cap = item.marketCap ? formatHundredMillion(item.marketCap / HUNDRED_MILLION) : '시가총액 N/A';
    const price = formatWon(item.price);
    return `**${item.name}** (${item.ticker})
- 시장: ${item.market}
- 현재가: ${price}
- ${cap}`;
  });

  return `🔍 "${companyName}" 검색 결과 (${payload.count}개)
기준일: ${formatDate(payload.asOf)}

${rows.join('\n\n')}`;
}

async function buildAnalyzeEquityText(
  ticker: string,
  reportType: 'quick' | 'summary' | 'full',
  growthRate?: number,
  discountRate?: number,
): Promise<string> {
  const normalizedReport = (['quick', 'summary', 'full'] as const).includes(reportType) ? reportType : 'quick';

  const [marketRaw, financialRaw] = await Promise.all([
    stockData.getMarketData(ticker),
    stockData.getFinancialData(ticker, normalizedReport === 'quick' ? 1 : 3),
  ]);

  const market = unwrap<MarketSnapshot>('시장 데이터', marketRaw);
  const financial = unwrap<FinancialSnapshot>('재무 데이터', financialRaw);

  let technical: TechnicalSnapshot | null = null;
  let supply: SupplyDemandSnapshot | null = null;

  if (normalizedReport !== 'quick') {
    const [technicalRaw, supplyRaw] = await Promise.all([
      stockData.getTechnicalIndicators(ticker),
      stockData.getSupplyDemand(ticker),
    ]);
    technical = unwrap<TechnicalSnapshot>('기술적 지표', technicalRaw);
    supply = unwrap<SupplyDemandSnapshot>('수급 데이터', supplyRaw);
  }

  let dcf: DCFValuation | null = null;
  try {
    const dcfRaw = await stockData.calculateDCF(ticker, growthRate, discountRate);
    if (!hasError(dcfRaw)) {
      dcf = dcfRaw as DCFValuation;
    }
  } catch (error) {
    console.warn('DCF 계산 실패', error);
  }

  const lines: string[] = [
    `# 📊 ${ticker} 투자 분석`,
    '',
    '## 가격 요약',
    `- 시장: ${market.market}`,
    `- 기준일: ${formatDate(market.asOf)}`,
    `- 현재가: ${formatWon(market.close)}`,
    `- 전일 대비: ${formatChange(market.change)} (${formatPercent(market.changePercent)})`,
    `- 거래량: ${formatShares(market.volume)}`,
    `- 시가총액: ${market.marketCap ? formatHundredMillion(market.marketCap / HUNDRED_MILLION) : 'N/A'}`,
    `- 52주 범위: ${formatWon(market.fiftyTwoWeek.low)} ~ ${formatWon(market.fiftyTwoWeek.high)}`,
    '',
    '## 재무 지표',
    ...formatFinancialMetrics(financial),
  ];

  if (normalizedReport !== 'quick' && financial.yearly?.length) {
    lines.push('', '## 연도별 지표', ...formatFinancialYearly(financial));
  }

  if (technical) {
    lines.push('', '## 기술적 지표', ...formatTechnicalSection(technical));
  }

  if (supply) {
    lines.push('', '## 수급 요약', ...formatSupplySummary(supply));
    if (normalizedReport === 'full') {
      lines.push('', '### 최근 5거래일 수급', ...formatSupplyRecent(supply));
    }
  }

  if (dcf) {
    lines.push('', '## DCF 밸류에이션', ...formatDcfSection(dcf));
  }

  if (normalizedReport === 'full') {
    lines.push('', '## 최근 5거래일 시세', ...formatPriceHistory(market));
  }

  lines.push('', `*데이터 기준일: ${formatDate(market.asOf)}*`);
  return lines.join('\n');
}

async function buildFinancialDataText(ticker: string, years: number): Promise<string> {
  const data = unwrap<FinancialSnapshot>('재무 데이터', await stockData.getFinancialData(ticker, years));
  const lines = [
    `📈 ${ticker} 재무 데이터 (${formatDate(data.asOf)} 기준)`,
    '',
    ...formatFinancialMetrics(data),
  ];

  if (years > 1 && data.yearly?.length) {
    lines.push('', `최근 ${years}년 추이`, ...formatFinancialYearly(data));
  }

  return lines.join('\n');
}

async function buildTechnicalIndicatorsText(ticker: string): Promise<string> {
  const data = unwrap<TechnicalSnapshot>('기술적 지표', await stockData.getTechnicalIndicators(ticker));
  const lines = [`📉 ${ticker} 기술적 지표`, '', ...formatTechnicalSection(data)];
  return lines.join('\n');
}

async function buildSupplyDemandText(ticker: string, days?: number): Promise<string> {
  const payload = await stockData.getSupplyDemand(ticker, days ?? 30);
  const data = unwrap<SupplyDemandSnapshot>('수급 데이터', payload);

  const lines = [
    `📊 ${ticker} 수급 현황`,
    '',
    ...formatSupplySummary(data),
    '',
    '### 최근 5거래일',
    ...formatSupplyRecent(data),
  ];
  return lines.join('\n');
}

async function buildDcfText(ticker: string, growthRate?: number, discountRate?: number): Promise<string> {
  const payload = await stockData.calculateDCF(ticker, growthRate, discountRate);
  const data = unwrap<DCFValuation>('DCF 계산', payload);
  const lines = [`💰 ${ticker} DCF 밸류에이션`, '', ...formatDcfSection(data)];
  return lines.join('\n');
}

async function buildPeersText(ticker: string): Promise<string> {
  const payload = await stockData.searchPeers(ticker);
  const data = unwrap<PeerComparison>('동종 종목 비교', payload);
  const lines = [`🤝 ${ticker} 유사 시총 종목`, '', ...formatPeersSection(data)];
  return lines.join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  const clientIp = (req.headers['x-real-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  const rateLimit = checkRateLimit(clientIp);

  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());

  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetTime * 1000 - Date.now()) / 1000));
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({
      error: 'Too Many Requests',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter,
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
          tools: {},
        },
      },
    });
  }

  if (req.method === 'POST') {
    try {
      const { method, params, id } = req.body;

      if (method === 'initialize') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            protocolVersion: '1.0.0',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'Korean Stock Analyzer MCP',
              version: '1.1.1',
            },
          },
        });
      }

      if (method === 'ping') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {},
        });
      }

      if (method === 'tools/list') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            tools: [
              {
                name: 'search_ticker',
                description: '종목명으로 종목코드를 검색합니다. 부분 일치와 시가총액 정보를 함께 제공합니다.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    company_name: {
                      type: 'string',
                      title: '회사명',
                      description: '검색할 회사명 (예: "삼성전자", "카카오")',
                    },
                  },
                  required: ['company_name'],
                },
              },
              {
                name: 'analyze_equity',
                description: '재무·기술·수급 데이터를 종합한 투자 분석 리포트를 생성합니다.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드 (예: 005930)',
                    },
                    report_type: {
                      type: 'string',
                      enum: ['quick', 'summary', 'full'],
                      description: 'quick=핵심 요약, summary=기술+수급 포함, full=DCF 및 히스토리 포함',
                      default: 'quick',
                    },
                    growth_rate: {
                      type: 'number',
                      description: 'DCF 성장률 가정 (%)',
                    },
                    discount_rate: {
                      type: 'number',
                      description: 'DCF 할인율 가정 (%)',
                    },
                  },
                  required: ['ticker'],
                },
              },
              {
                name: 'get_financial_data',
                description: 'PER, PBR, EPS, 배당 등 재무 지표와 연도별 추이를 조회합니다.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드',
                    },
                    years: {
                      type: 'number',
                      description: '연도별 데이터를 포함할 기간 (기본 1년)',
                      default: 1,
                    },
                  },
                  required: ['ticker'],
                },
              },
              {
                name: 'get_technical_indicators',
                description: 'RSI, 이동평균, MACD, 볼린저밴드 등 기술 지표를 제공합니다.',
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
                description: 'EPS 기반 간단 DCF 적정가 계산과 상승여력을 제공합니다.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드',
                    },
                    growth_rate: {
                      type: 'number',
                      description: '성장률 가정 (%)',
                      default: 10,
                    },
                    discount_rate: {
                      type: 'number',
                      description: '할인율 가정 (%)',
                      default: 10,
                    },
                  },
                  required: ['ticker'],
                },
              },
              {
                name: 'get_supply_demand',
                description: '외국인/기관/개인 순매수 금액과 최근 추이를 확인합니다.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    ticker: {
                      type: 'string',
                      description: '종목 코드',
                    },
                    days: {
                      type: 'number',
                      description: '누적 조회 기간 (기본 30일)',
                      default: 30,
                    },
                  },
                  required: ['ticker'],
                },
              },
              {
                name: 'compare_peers',
                description: '시가총액이 비슷한 동종 종목을 추천합니다.',
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
            ],
          },
        });
      }

      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        let text: string;

        try {
          switch (name) {
            case 'search_ticker': {
              const companyName = ensureStringArg(args, 'company_name');
              text = await buildSearchTickerText(companyName);
              break;
            }
            case 'analyze_equity': {
              const ticker = ensureStringArg(args, 'ticker');
              const reportType = (args?.report_type ?? 'quick') as 'quick' | 'summary' | 'full';
              const growthRate = args?.growth_rate !== undefined ? Number(args.growth_rate) : undefined;
              const discountRate = args?.discount_rate !== undefined ? Number(args.discount_rate) : undefined;
              text = await buildAnalyzeEquityText(ticker, reportType, growthRate, discountRate);
              break;
            }
            case 'get_financial_data': {
              const ticker = ensureStringArg(args, 'ticker');
              const years = args?.years ? Number(args.years) : 1;
              text = await buildFinancialDataText(ticker, years);
              break;
            }
            case 'get_technical_indicators': {
              const ticker = ensureStringArg(args, 'ticker');
              text = await buildTechnicalIndicatorsText(ticker);
              break;
            }
            case 'calculate_dcf': {
              const ticker = ensureStringArg(args, 'ticker');
              const growthRate = args?.growth_rate !== undefined ? Number(args.growth_rate) : undefined;
              const discountRate = args?.discount_rate !== undefined ? Number(args.discount_rate) : undefined;
              text = await buildDcfText(ticker, growthRate, discountRate);
              break;
            }
            case 'get_supply_demand': {
              const ticker = ensureStringArg(args, 'ticker');
              const days = args?.days ? Number(args.days) : undefined;
              text = await buildSupplyDemandText(ticker, days);
              break;
            }
            case 'compare_peers': {
              const ticker = ensureStringArg(args, 'ticker');
              text = await buildPeersText(ticker);
              break;
            }
            default:
              throw new Error(`알 수 없는 도구: ${name}`);
          }

          return res.status(200).json({
            jsonrpc: '2.0',
            id: id || 1,
            result: {
              content: [
                {
                  type: 'text',
                  text,
                },
              ],
            },
          });
        } catch (error) {
          console.error(`Error executing ${name}:`, error);
          const message = error instanceof Error ? error.message : '도구 실행 중 오류가 발생했습니다.';
          return res.status(200).json({
            jsonrpc: '2.0',
            id: id || 1,
            result: {
              content: [
                {
                  type: 'text',
                  text: `❌ ${message}`,
                },
              ],
            },
          });
        }
      }

      return res.status(400).json({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: -32601,
          message: 'Method not found',
          data: { method },
        },
      });
    } catch (error) {
      console.error('Request processing error:', error);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id || 1,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET, POST, and OPTIONS methods are supported',
  });
}
