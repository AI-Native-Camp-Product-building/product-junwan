# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

**AdInsight** — 내부 브랜드 기획자를 위한 글로벌 마케팅 퍼포먼스 통합 대시보드.
8개국(레진KR, 봄툰KR, US, DE, FR, TH, TW, ES) 광고 성과 데이터를 Google Sheets에서 Supabase로 동기화하고, 시각화 + AI 쿼리 + 인사이트를 제공한다.

## Commands

```bash
npm run dev          # http://localhost:1004 (Turbopack)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npx tsc --noEmit     # 타입 체크
npx vitest run       # 테스트 실행
```

프로덕션 배포: `npm run build && npx next start -p 1004`
Cloudflare Tunnel 경유 시 반드시 프로덕션 빌드 사용 (dev 서버 WebSocket 실패).

### Docker

```bash
docker compose up --build -d   # 빌드 + 실행
docker compose logs -f         # 로그 확인
docker compose down            # 중지
```

- 3-stage 빌드 (deps → build → runner), standalone output
- `.env.local` — 런타임 환경변수 (서버사이드)
- `.env` — `NEXT_PUBLIC_*` 빌드 타임 변수 (docker compose가 build args로 주입)
- 포트 1004, 비-root 유저 (nextjs:1001)
- `next.config.ts`에 `output: "standalone"` 설정 필수

## Tech Stack

| 항목        | 선택                             | 비고                                                |
| ----------- | -------------------------------- | --------------------------------------------------- |
| 프레임워크  | Next.js 16.2.2 (App Router)      | Turbopack, `node_modules/next/dist/docs/` 참조 필수 |
| UI          | shadcn/ui (base-ui)              | `@base-ui/react` 1.3.0 — Radix가 아님               |
| 차트        | Recharts 3.8 (via shadcn charts) | Area, Bar, Pie, Radial                              |
| 스타일      | Tailwind CSS v4                  | shadcn 테마 시스템                                  |
| DB          | Supabase (PostgreSQL)            | anon client + service_role admin client             |
| 데이터 소스 | Google Sheets API v4             | `googleapis`, Service Account 인증                  |
| 테이블      | @tanstack/react-table 8          | 정렬/필터/드래그 지원                               |
| 인증        | NextAuth.js v4                   | Google OAuth (@lezhin.com 전용)                     |
| AI          | Gemini API                       | gemini-3.1-flash-lite-preview                       |
| 테스트      | Vitest + @vitest/coverage-v8     | jsdom 환경                                          |
| 폰트        | Pretendard Variable              | CDN `<link>` in layout.tsx                          |
| 언어        | TypeScript strict                |                                                     |

## Architecture

### Two Data Paths

**홈 대시보드 (Overview)**: 클라이언트 집계

```
/api/dashboard → ad_normalized 뷰 raw rows → 프론트 mapRow() → 클라이언트 집계/시각화
```

**탐색 (Explore)**: 서버사이드 집계

```
/api/query → query-engine.ts → Supabase RPC dynamic_aggregate → 집계 결과만 반환
```

**AI 쿼리 (Ask API)**:

```
/api/ask → Gemini (자연어→QueryDefinition) → query-engine.ts → 집계 결과
```

### Data Flow (Sync Pipeline)

```
Google Sheets (8개)
  → sheets-client.ts (API read)
  → sheets-parser.ts (header mapping + row normalization)
  → sheets-sync.ts (DELETE + INSERT per sheet, 500행 batch)
  → Supabase ad_raw 테이블
  → ad_normalized 뷰 (매핑 테이블 JOIN + 월 포맷 정규화)
```

동기화는 DELETE + INSERT 방식 (upsert 아님) — 시트에서 삭제된 행이 DB에 남는 문제 방지.

### Supabase Schema

**테이블:**

- `sheet_source` — 8개 시트 메타 (sheet_id, tab_name, header_row, currency)
- `ad_raw` — 시트 원본 데이터 (DELETE + INSERT on sync)
- `medium_map`, `goal_map`, `creative_type_map` — 차원 값 정규화 룩업
- `sheet_sync_log` — 동기화 실행 이력
- `saved_queries` — 저장된 쿼리 프리셋 (Explore용)
- `user_feedback` — 사용자 피드백 (category, message, status, admin_memo)

**뷰:**

- `ad_normalized` — 프론트엔드가 쿼리하는 유일한 인터페이스
- `sheet_sync_latest` — 시트별 최신 동기화 상태

**RPC:**

- `dynamic_aggregate` — 화이트리스트 기반 동적 집계 (SQL injection 방지)

**RLS:** 전 테이블 public read, service_role만 write.

### API Routes

| 경로                 | 메서드                | 용도                               | 인증                        |
| -------------------- | --------------------- | ---------------------------------- | --------------------------- |
| `/api/dashboard`     | GET                   | 홈 대시보드 raw 데이터             | 없음 (CDN 5분 캐시)         |
| `/api/filters`       | GET                   | 필터 옵션 (국가/월/매체/목표)      | 없음 (CDN 1시간 캐시)       |
| `/api/query`         | POST                  | Explore 서버사이드 집계            | 없음                        |
| `/api/ai-query`      | POST                  | 자연어 → QueryDefinition (Gemini)  | 없음                        |
| `/api/ask`           | POST                  | 자연어 → 집계 결과 한방 (공개 API) | ASK_API_KEY (선택)          |
| `/api/saved-queries` | GET/POST/DELETE       | 쿼리 프리셋 CRUD                   | 없음 (write=service_role)   |
| `/api/sync`          | POST                  | Google Sheets → Supabase 동기화    | Bearer `SYNC_API_SECRET`    |
| `/api/sync-trigger`  | POST                  | 프론트엔드용 동기화 프록시         | 없음                        |
| `/api/sync-status`   | GET                   | 시트별 동기화 상태                 | 없음                        |
| `/api/feedback`      | GET/POST/PATCH/DELETE | 피드백 CRUD                        | 로그인 (PATCH/DELETE=admin) |
| `/api/auth/[...]`    | \*                    | NextAuth.js Google OAuth           | Google OAuth                |
| `/api/export`        | POST                  | 데이터 내보내기                    | 없음                        |

### Key Lib Modules

| 모듈                   | 역할                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| `query-engine.ts`      | QueryDefinition → RPC 실행. 비교 모드(기간/항목) 처리. SERVER ONLY  |
| `dashboard-queries.ts` | 홈 대시보드 raw 데이터 fetch + mapRow(). 봄툰 광고비 분기 포함      |
| `explore-link.ts`      | 대시보드 차트 → Explore 페이지 연동 URL 빌더                        |
| `sheets-sync.ts`       | 동기화 오케스트레이터. DELETE + INSERT, 시트별 에러 격리            |
| `sheets-parser.ts`     | 시트 헤더 매핑 (`HEADER_PATTERNS`) + 행 파싱. 한국어 헤더 변형 처리 |
| `supabase-admin.ts`    | service_role client (write). SERVER ONLY                            |
| `format.ts`            | KRW 통화, 퍼센트, 숫자 포맷터 — 모든 포맷은 여기서만 import         |
| `admin.ts`             | `isAdmin(email)` — NEXT_PUBLIC_ADMIN_EMAIL 환경변수 비교            |
| `feedback-copy.ts`     | 피드백 마크다운 포맷 + 클립보드 복사 (execCommand fallback 포함)    |

### Types

- `src/types/dashboard.ts` — AdRow, DashboardFilters, KpiSummary, DateMode 등
- `src/types/query.ts` — QueryDefinition, DimensionKey, MetricKey, SavedQuery 등
- `src/types/sync.ts` — AdRawInsert, ColumnMapping, SheetSource 등
- `src/types/feedback.ts` — UserFeedback, FeedbackCategory, FeedbackStatus, FEEDBACK_CATEGORIES
- `src/config/query-schema.ts` — 차원/지표 메타데이터 (라벨, SQL식, 포맷 함수)

### Page Structure

```
/                       → 랜딩 페이지
/login                  → Google SSO (@lezhin.com 전용)
/dashboard              → Overview (KPI + 차트 + 요약 테이블 + 상세 데이터)
/dashboard/explore      → Explore (Amplitude 스타일 쿼리 빌더 + AI 모드 + 비교)
/dashboard/platform     → 국가별 뷰 (DashboardShell + lockedFilters)
/dashboard/medium       → 매체별 뷰 (DashboardShell + lockedFilters)
/dashboard/analysis     → 분석 탭
/dashboard/feedback     → 피드백 (일반: 제출+히스토리, admin: 관리 테이블)
```

## Critical Data Rules

### 봄툰 KR 광고비 예외

봄툰 KR의 `ad_spend_krw` 컬럼에는 잘못된 데이터가 들어 있음. **반드시 `ad_spend_local` 사용.**

SQL (Explore/RPC):

```sql
CASE WHEN sheet_name = '봄툰 KR' THEN ad_spend_local
     ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END
```

JS (홈 대시보드 mapRow):

```ts
// dashboard-queries.ts → resolveAdSpendKrw()
sheetName === "봄툰 KR" ? ad_spend_local : ad_spend_krw || ad_spend_local;
```

### ROAS 직접 계산

시트의 `roas_raw` 값을 사용하지 않음. 일관성을 위해 직접 계산:

```
ROAS = revenue / adSpend × 100
```

### 결제금액은 항상 원화

모든 국가의 `revenue_local`은 실제로 원화. `revenue_krw`가 null이면 `revenue_local` fallback.

### CTR/ROAS 시트 저장 형식

시트에서 비율값(0.18)으로 저장됨 → 홈 대시보드 mapRow에서 ×100 처리.
Explore는 SQL에서 직접 계산하므로 이 문제 없음.

## shadcn Style Rules (필수 준수)

- `space-y-*` / `space-x-*` 금지 → `flex gap-*` 또는 `grid gap-*`
- raw color (`bg-blue-500`) 금지 → semantic tokens (`bg-primary`, `text-muted-foreground`)
- `dark:` 수동 오버라이드 금지 → CSS 변수가 자동 처리
- 차트 컬러: `hsl(var(--chart-1))` ~ `hsl(var(--chart-5))`
- Card: full composition (`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`)
- Chart: `Card > CardHeader > CardContent > ChartContainer` 구조 필수
- `Button asChild` 불가 → `buttonVariants()` 사용 (base-ui 호환)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL          # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anon key (public read)
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role (write, SERVER ONLY)
SYNC_API_SECRET                   # /api/sync Bearer 토큰
GOOGLE_SERVICE_ACCOUNT_PATH       # (선택) SA JSON 경로, 기본: credentials/service-account.json
GEMINI_API_KEY                    # Gemini API (AI 쿼리)
NEXTAUTH_SECRET                   # NextAuth.js 암호화 키
NEXTAUTH_URL                      # 인증 콜백 URL (localhost or Cloudflare 도메인)
GOOGLE_CLIENT_ID                  # Google OAuth
GOOGLE_CLIENT_SECRET              # Google OAuth
ASK_API_KEY                       # (선택) /api/ask Bearer 토큰 — 미설정 시 공개
ADMIN_EMAIL                       # Admin 이메일 (pat@lezhin.com)
NEXT_PUBLIC_ADMIN_EMAIL           # 클라이언트용 Admin 이메일 (위와 동일값)
```

## Coding Rules (필수 준수)

### React / Next.js

- Server Components 기본 → `"use client"` 는 상호작용이 필요한 컴포넌트에만 사용
- **모든 hooks는 early return 위에 배치** — 조건부 return 아래에 useMemo/useEffect 금지 (React error #300)
- `useEffect`에서 파생 상태 계산 금지 → `useMemo` 사용
- `useEffect` 내 setState 루프 주의 → 의존성 배열에 객체/배열 직접 넣지 말 것
- 컴포넌트 props로 인라인 객체/배열 리터럴 전달 금지 → useMemo로 안정화
- `useSearchParams()` 사용 시 반드시 `<Suspense>` boundary로 감쌀 것

### TypeScript

- strict 모드 준수, `any` 사용 금지
- 타입은 `src/types/` 에 정의, 인라인 타입 최소화
- API 응답 타입은 반드시 명시

### Styling (shadcn + Tailwind v4)

- `space-y-*` / `space-x-*` 금지 → `flex gap-*` 또는 `grid gap-*`
- raw color (`bg-blue-500`) 금지 → semantic tokens (`bg-primary`, `text-muted-foreground`)
- `dark:` 수동 오버라이드 금지 → CSS 변수가 자동 처리

### Data

- 포맷 함수는 `src/lib/format.ts` 에서만 import (`formatKrw`, `formatPercent`, `formatNumber`)
- 인라인 포맷 함수 정의 금지 (중복 방지)
- 광고비 집계: 봄툰 KR은 `ad_spend_local` 사용 (Critical Data Rules 참조)
- ROAS는 직접 계산 (revenue / adSpend × 100), `roas_raw` 사용 금지
- 결제금액: `revenue_krw ?? revenue_local` (모든 국가 원화)
- 숫자 컬럼 정렬: `sortingFn: "basic"` 명시 (auto는 문자열 비교 위험)

### Performance

- `Promise.all()` 로 병렬 fetch 필수 → 직렬 체이닝 금지
- 서버사이드 집계 우선 → 클라이언트에 raw data 대량 전송 금지
- 큰 컴포넌트는 `next/dynamic` 으로 lazy load
- API Route에서 적절한 `Cache-Control` 헤더 설정

### 금지된 안티패턴

- `Button asChild` 사용 금지 → `buttonVariants()` 사용 (base-ui 호환)
- Popover 내 `pointer-events-none` 주의 → 이벤트 전파 차단 유발
- `navigator.clipboard` 단독 사용 금지 → fallback (execCommand) 포함
- Supabase `.in()` 필터에 빈 배열 전달 금지 → 조건 스킵 처리 필요
- Client Component에서 대량 데이터 fetch 후 클라이언트 집계 금지
- `useEffect` 안에서 setState로 파생 상태 계산 금지 → 무한 루프 위험

## Current Status (2026-04-13)

### 완료

- [x] 랜딩 페이지 + 대시보드 UI 전체 구현
- [x] Supabase 스키마 + Google Sheets 동기화 (8개 시트, 8000+ 행)
- [x] 홈 대시보드: KPI 카드, 추이 차트 (일/주/월봉), 매체별 Bar
- [x] P1 차트: 작품별 Top 10, 광고비 비중 도넛, 매체별/국가별 요약 테이블
- [x] Explore: Amplitude 스타일 문장형 쿼리 빌더 + 비교 모드 (기간/항목)
- [x] AI 모드: Gemini 자연어 → 쿼리 자동 생성
- [x] 쿼리 프리셋 저장/불러오기 (saved_queries 테이블)
- [x] 홈→탐색 연동: "탐색에서 자세히 보기" 링크 + URL 파라미터 자동 세팅
- [x] Google Workspace SSO (@lezhin.com)
- [x] 공개 API: POST /api/ask (자연어 → 집계 결과, rate limit 포함)
- [x] CI/CD: lint → typecheck → build → test + coverage
- [x] 봄툰 KR 광고비 분기, ROAS 직접 계산, 동기화 DELETE+INSERT
- [x] 피드백 시스템: 제출 폼 + admin 관리 테이블 + 마크다운 복사 (노션 붙여넣기)
- [x] Admin 역할 분기: ADMIN_EMAIL 환경변수 기반, 사이드바/헤더 조건부 표시
- [x] Docker: 3-stage 빌드, standalone output, docker-compose.yml
- [x] 탐색 차트 primary dim 드릴다운: 표는 전체 dim, 차트는 primary dim 1개로 시리즈화 + top-10 "기타" 묶음

### 알려진 이슈

- 홈 대시보드는 여전히 클라이언트 집계 (Phase 5에서 서버사이드 전환 예정)
- 상세 데이터 테이블 컬럼 드래그가 dev 서버에서 불안정 (프로덕션에서는 동작)
