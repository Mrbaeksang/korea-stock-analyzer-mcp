# Korea Stock Analyzer MCP Server

[English](#english) | [한국어](#korean)

---

<a name="english"></a>
## 🇺🇸 English

A comprehensive Korean stock market analysis tool using strategies from 6 legendary investors.

### 🎯 Two Ways to Use

1. **Local MCP Server** (Claude Desktop)
   - Real-time KOSPI/KOSDAQ data via pykrx
   - Python-based accurate Korean market data
   
2. **HTTP API Endpoint** (Kakao PlayMCP, Web Services)
   - Vercel serverless deployment
   - Real-time data via Yahoo Finance API
   - Available directly in KakaoTalk

### Features

- 📊 **Real-time Stock & Financial Analysis** - PER, PBR, ROE, EPS
- 📈 **Technical Indicators** - RSI, MACD, Bollinger Bands, Moving Averages
- 💰 **DCF Valuation** - Fair value calculation
- 📰 **News & Sentiment Analysis** - Latest news monitoring
- 🏢 **Institutional/Foreign Flow** - Smart money tracking
- 🔍 **Peer Comparison** - Industry competitor analysis
- 🎯 **6 Investment Master Strategies** - Proven investment methodologies

### Quick Start

Choose your preferred installation method:

#### Option 1: NPX (Simplest)
```bash
npx @mrbaeksang/korea-stock-analyzer-mcp
```

#### Option 2: Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "korea-stock-analyzer": {
      "command": "npx",
      "args": ["-y", "@mrbaeksang/korea-stock-analyzer-mcp"]
    }
  }
}
```

#### Option 3: Remote MCP (Serverless)
```json
{
  "mcpServers": {
    "korea-stock-analyzer": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://korea-stock-analyzer-mcp.vercel.app/api/mcp"]
    }
  }
}
```

### Available Tools

1. **get_financial_data** - PER, PBR, EPS, ROE, dividend yield
2. **get_technical_indicators** - MA, RSI, MACD, 52-week high/low
3. **calculate_dcf** - Intrinsic value calculation
4. **search_news** - Latest news and sentiment
5. **get_supply_demand** - Institutional/foreign investor analysis
6. **compare_peers** - Industry peer comparison
7. **analyze_equity** - Complete analysis with all strategies

### Example Usage

```
"Analyze Samsung Electronics stock"
"Calculate DCF for SK Hynix"
"Compare NAVER with Kakao"
```

### Investment Strategies

- 🎩 **Warren Buffett** - Owner Earnings, ROE focus
- 📊 **Peter Lynch** - PEGY Ratio analysis
- 💼 **Benjamin Graham** - Graham Number valuation
- 🎯 **Joel Greenblatt** - Magic Formula ranking
- 🔍 **Philip Fisher** - 15-Point growth checklist
- 🌍 **John Templeton** - Maximum pessimism approach

---

<a name="korean"></a>
## 🇰🇷 한국어

한국 주식 시장 전문 분석 도구입니다. 워런 버핏, 피터 린치 등 6명의 전설적인 투자자들의 전략을 활용합니다.

### 🎯 두 가지 사용 방식

1. **로컬 MCP 서버** (Claude Desktop)
   - pykrx를 통한 실시간 KOSPI/KOSDAQ 데이터
   - Python 기반 정확한 한국 시장 데이터
   
2. **HTTP API 엔드포인트** (Kakao PlayMCP, 웹 서비스)
   - Vercel 서버리스 배포
   - Yahoo Finance API를 통한 실시간 데이터
   - 카카오톡에서 바로 사용 가능

### 주요 기능

- 📊 **실시간 주가 및 재무제표 분석** - PER, PBR, ROE, EPS
- 📈 **기술적 지표 계산** - RSI, MACD, 볼린저밴드, 이동평균선
- 💰 **DCF 밸류에이션** - 적정주가 계산
- 📰 **뉴스 및 감성 분석** - 최신 뉴스 모니터링
- 🏢 **외국인/기관 수급 동향** - 스마트머니 추적
- 🔍 **동종업계 비교 분석** - 경쟁사 대비 평가
- 🎯 **6명의 투자 대가 전략** - 검증된 투자 방법론

### 설치 방법

#### 🚀 방법 1: NPX 실행 (가장 간단)

```bash
# 즉시 실행 - 설치 불필요
npx @mrbaeksang/korea-stock-analyzer-mcp
```

#### 📦 방법 2: NPM 글로벌 설치

```bash
# 글로벌 설치
npm install -g @mrbaeksang/korea-stock-analyzer-mcp

# 실행
korea-stock-analyzer
```

#### 🤖 방법 3: Claude Desktop 설정

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "korea-stock-analyzer": {
      "command": "npx",
      "args": ["-y", "@mrbaeksang/korea-stock-analyzer-mcp"]
    }
  }
}
```

#### 🛠️ 방법 4: Claude Code (자동 설정)

```bash
claude mcp add korea-stock -- npx -y @mrbaeksang/korea-stock-analyzer-mcp
```

#### 🌐 방법 5: Remote MCP URL (서버리스)

```json
{
  "mcpServers": {
    "korea-stock-analyzer": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://korea-stock-analyzer-mcp.vercel.app/api/mcp"
      ]
    }
  }
}
```

#### 💬 방법 6: 카카오 PlayMCP 🆕

카카오톡 AI 채팅에서 바로 사용! [PlayMCP](https://playmcp.kakao.com)에서 "한국주식 AI 분석가"를 검색하세요.

#### 🔧 방법 7: Smithery 자동 설치

```bash
npx -y @smithery/cli install korea-stock-analyzer --client claude
```

### 사용 가능한 도구

1. **get_financial_data** - PER, PBR, EPS, ROE, 배당수익률 조회
2. **get_technical_indicators** - 이동평균, RSI, MACD, 52주 최고/최저
3. **calculate_dcf** - DCF 기반 적정가치 계산
4. **search_news** - 최신 뉴스 및 감성 분석
5. **get_supply_demand** - 기관/외국인 수급 분석
6. **compare_peers** - 동종업계 비교 분석
7. **analyze_equity** - 모든 전략을 활용한 종합 분석

### 사용 예시

```
"삼성전자 주식 분석해줘"
"SK하이닉스 DCF 계산해줘"
"네이버와 카카오 비교해줘"
"현대차 수급 분석 보여줘"
"LG화학 기술적 지표 확인"
```

### 투자 전략

- 🎩 **워런 버핏** - 오너 어닝스, 높은 ROE 중심
- 📊 **피터 린치** - PEGY 비율 분석
- 💼 **벤저민 그레이엄** - 그레이엄 수치 기반 평가
- 🎯 **조엘 그린블라트** - 매직 포뮬러 순위
- 🔍 **필립 피셔** - 15가지 성장성 체크리스트
- 🌍 **존 템플턴** - 최대 비관 시점 투자

### 소스코드에서 빌드

```bash
# 저장소 복제
git clone https://github.com/Mrbaeksang/korea-stock-analyzer-mcp.git
cd korea-stock-analyzer-mcp

# 의존성 설치
npm install

# 빌드
npm run build

# 실행
npm start
```

### 요구사항

- Node.js 18 이상
- Python 3.9 이상 (자동 처리됨)
- Claude Desktop (MCP 통합용)

### Python 의존성

서버가 자동으로 필요한 Python 패키지를 설치합니다:
- `pykrx` - 한국 주식 시장 데이터
- `pandas` - 데이터 처리
- `numpy` - 수치 계산

### 개발

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm test
```

### 프로젝트 구조

```
├── src/
│   ├── server.ts           # 메인 MCP 서버
│   ├── services/           # 핵심 서비스
│   │   ├── financial-data.ts  # 재무 데이터
│   │   ├── market-data.ts     # 시장 데이터
│   │   ├── supply-demand.ts   # 수급 분석
│   │   └── python-executor.ts # Python 실행
│   └── analyzers/          # 투자 전략
│       ├── buffett.ts      # 버핏 전략
│       ├── lynch.ts        # 린치 전략
│       ├── graham.ts       # 그레이엄 전략
│       ├── greenblatt.ts   # 그린블라트 전략
│       ├── fisher.ts       # 피셔 전략
│       └── templeton.ts    # 템플턴 전략
```

### 기여하기

기여를 환영합니다! Pull Request를 보내주세요.

### 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

### 감사의 말

- [pykrx](https://github.com/sharebook-kr/pykrx) - 한국 주식 시장 데이터
- [Anthropic](https://anthropic.com) - Model Context Protocol
- 전설적인 투자자들의 투자 전략

### 지원

- 🐛 [이슈 리포트](https://github.com/Mrbaeksang/korea-stock-analyzer-mcp/issues)
- 💬 [토론](https://github.com/Mrbaeksang/korea-stock-analyzer-mcp/discussions)
- ⭐ 유용하다면 스타를 눌러주세요!

### 면책 조항

이 도구는 교육 및 연구 목적으로만 사용하세요. 투자 조언이 아닙니다. 투자 결정 전 반드시 본인의 판단으로 결정하세요.

---

Made with ❤️ for Korean stock investors using Claude Desktop