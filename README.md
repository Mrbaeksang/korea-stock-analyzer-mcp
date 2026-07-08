# korea-stock-mcp

한국 상장사(KOSPI·KOSDAQ) 분석용 **원격 MCP 서버**. 보수적이고 데이터에 정직한 분석만 제공한다.

## 원칙

- **날조 제로** — 모든 수치는 실측 출처(DART 전자공시, KRX 시세)에서만 나온다. 데이터가 없으면 `null`과 사유를 반환한다. 기본값을 지어내지 않는다.
- **범위 제시** — 단일 "적정주가" 없음. 가정이 전부 명시된 3시나리오(비관/중립/낙관) 범위만 제시한다.
- **리스크 우선** — 매수/매도/비중 권고를 하지 않는다. 재무 적신호와 공시 경고를 먼저 보고한다.
- **검증 계층** — 시가총액 정합성 검사(주가×주식수 vs 보고 시총) 등 교차검증을 응답에 포함한다.

## 제공 도구

| 도구 | 설명 | 데이터 출처 |
|---|---|---|
| `search_company` | 종목명/코드로 상장사 검색 | KRX (FinanceDataReader) |
| `get_quote` | 시세, 시총, 52주 고저, 거래량 + 시총 정합성 검사 | KRX (FinanceDataReader) |
| `get_financials` | 실측 연간 재무제표 3~10개년 + 수익성·안정성·성장성·현금흐름 비율 | DART 사업보고서 |
| `get_valuation` | PER/PBR 멀티플 + 3시나리오 가치 범위 (가정 명시) | DART + KRX |
| `get_risk_flags` | 재무 적신호 6종 검사 + 최근 공시 위험 키워드 | DART |

## 연결 방법

claude.ai → 설정 → 커넥터 → 커스텀 커넥터 추가 → 서버 URL 입력:

```
https://<your-deployment>.up.railway.app/mcp
```

인증 없음(공개 데이터만 제공). Claude Desktop·기타 Streamable HTTP 지원 MCP 클라이언트 모두 사용 가능.

## 셀프 호스팅 (Railway)

1. 이 레포를 Railway에 연결 (Dockerfile 자동 감지)
2. 환경변수 설정:
   - `DART_API_KEY` — [opendart.fss.or.kr](https://opendart.fss.or.kr)에서 무료 발급 (필수)
   - `FASTMCP_HTTP_ALLOWED_HOSTS` — `["<서비스>.up.railway.app","healthcheck.railway.app"]`
3. Serverless(App Sleeping) 비활성 권장 — 콜드 스타트 시 커넥터 연결 실패 방지

로컬 실행:

```bash
uv sync
DART_API_KEY=<key> uv run uvicorn app.main:app --app-dir src --port 8000
```

테스트:

```bash
uv run pytest            # 단위·경계 테스트 (외부 API 호출 없음)
uv run pytest -m live -o addopts=""    # 실제 KRX/DART 호출 검증 (DART_API_KEY 필요)
```

## 데이터 출처와 한계

- **재무제표**: DART OpenAPI `fnlttSinglAcntAll` — 사업보고서 기준 연간 실적. 연결(CFS) 우선, 없으면 별도(OFS)로 폴백하며 응답에 어느 쪽인지 표시된다. 분기 데이터 미제공.
- **시세**: FinanceDataReader(KRX 일별 스냅샷). 실시간 아님 — 응답의 `as_of` 필드가 기준일이다.
- **FCF**: 영업활동현금흐름 − 유형자산 취득의 **근사치**. 무형자산·리스 투자 미포함.
- 수급(기관/외인)·뉴스는 로드맵에 있으나 현재 미제공.

## 면책

본 서버의 출력은 공시·시세 데이터의 산술 가공 결과이며 **투자 자문이 아니다**. 시나리오 값은 명시된 가정의 계산 결과일 뿐 목표 주가가 아니다. 투자 판단과 책임은 이용자에게 있다.

## 라이선스

MIT. 검증 로직 일부는 [ai-berkshire](https://github.com/xbtlin/ai-berkshire) (MIT, Copyright (c) 2026 xbtlin)의 패턴을 차용했다.
