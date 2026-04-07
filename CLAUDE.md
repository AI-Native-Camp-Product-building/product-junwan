# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

**AdInsight** — 내부 브랜드 기획자를 위한 글로벌 마케팅 퍼포먼스 통합 대시보드.
8개국(레진KR, 봄툰KR, US, DE, FR, TH, TW, ES) 광고 성과 데이터를 Google Sheets에서 Supabase로 동기화하고, 시각화 + AI 인사이트를 제공한다.

## Commands

```bash
npm run dev          # http://localhost:1004 (Turbopack)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
```

테스트 프레임워크는 아직 설정되지 않음.

## Tech Stack

| 항목        | 선택                             | 비고                                                |
| ----------- | -------------------------------- | --------------------------------------------------- |
| 프레임워크  | Next.js 16.2.2 (App Router)      | Turbopack, `node_modules/next/dist/docs/` 참조 필수 |
| UI          | shadcn/ui (base-ui)              | `@base-ui/react` 1.3.0 — Radix가 아님               |
| 차트        | Recharts 3.8 (via shadcn charts) | Area, Bar, Radial                                   |
| 스타일      | Tailwind CSS v4                  | shadcn 테마 시스템                                  |
| DB          | Supabase (PostgreSQL)            | anon client + service_role admin client             |
| 데이터 소스 | Google Sheets API v4             | `googleapis`, Service Account 인증                  |
| 테이블      | @tanstack/react-table 8          | 정렬/필터 지원                                      |
| 폰트        | Pretendard Variable              | CDN `<link>` in layout.tsx                          |
| 언어        | TypeScript strict                |                                                     |

## Architecture

### Data Flow

```
Google Sheets (8개)
  → sheets-client.ts (API read)
  → sheets-parser.ts (header mapping + row normalization)
  → sheets-sync.ts (batch upsert, 500행 단위)
  → Supabase ad_raw 테이블
  → ad_normalized 뷰 (매핑 테이블 JOIN + 월 포맷 정규화)
  → dashboard-queries.ts (필터링 + 집계)
  → 프론트엔드 컴포넌트
```

### Supabase Schema

**테이블:**

- `sheet_source` — 8개 시트 메타 (sheet_id, tab_name, header_row, currency)
- `ad_raw` — 시트 원본 데이터 (immutable, upsert on `sheet_source_id + sheet_row_number`)
- `medium_map`, `goal_map`, `creative_type_map` — 차원 값 정규화 룩업
- `sheet_sync_log` — 동기화 실행 이력 (status, row counts, duration)

**뷰:**

- `ad_normalized` — 프론트엔드가 쿼리하는 유일한 인터페이스. ad_raw + 3개 매핑 JOIN
- `sheet_sync_latest` — 시트별 최신 동기화 상태

**RLS:** 전 테이블 public read, service_role만 write.

### API Routes

| 경로                | 메서드 | 용도                            | 인증                            |
| ------------------- | ------ | ------------------------------- | ------------------------------- |
| `/api/dashboard`    | GET    | 필터링된 대시보드 데이터        | 없음 (CDN 5분 캐시)             |
| `/api/filters`      | GET    | 필터 옵션 (국가/월/매체/목표)   | 없음 (CDN 1시간 캐시)           |
| `/api/sync`         | POST   | Google Sheets → Supabase 동기화 | Bearer `SYNC_API_SECRET`        |
| `/api/sync-trigger` | POST   | 프론트엔드용 동기화 프록시      | 없음 (서버사이드에서 직접 호출) |
| `/api/sync-status`  | GET    | 시트별 동기화 상태              | 없음                            |
| `/api/auth`         | POST   | 로그인 (현재 더미)              | 없음                            |
| `/api/export`       | POST   | 데이터 내보내기                 | 없음                            |

### Key Lib Modules

| 모듈                   | 역할                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| `sheets-client.ts`     | Google Sheets API 클라이언트. Service Account JWT 인증. SERVER ONLY            |
| `sheets-parser.ts`     | 시트 헤더 매핑 (`HEADER_PATTERNS`) + 행 파싱. 17개 필드, 한국어 헤더 변형 처리 |
| `sheets-sync.ts`       | 동기화 오케스트레이터. `syncAllSheets()`, 시트별 에러 격리, 배치 upsert        |
| `dashboard-queries.ts` | `ad_normalized` 뷰 쿼리. `fetchDashboardData()`, `fetchFilterOptions()`        |
| `supabase.ts`          | anon client (public read)                                                      |
| `supabase-admin.ts`    | service_role client (write). SERVER ONLY                                       |
| `format.ts`            | KRW 통화, 퍼센트, 숫자 포맷터                                                  |

### Types

- `src/types/dashboard.ts` — 프론트엔드: AdRow, DashboardFilters, KpiSummary, FilterOptions 등
- `src/types/sync.ts` — DB/동기화: AdRawInsert, ColumnMapping, SheetSource, SyncRunResult 등

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
```

## Google Sheets Integration

**8개 시트** (credentials/sheets.json):
레진KR, 봄툰KR, US, DE, FR, TH, TW, ES

**서비스 계정:** `pat-n8n@gen-lang-client-0537880120.iam.gserviceaccount.com` — 각 시트에 뷰어로 공유 필요

**시트 구조 변형:**

- 16컬럼 (KR/DE/TH/TW/ES): 광고비 + 원화
- 17컬럼 US: 광고비(USD) + 광고비(KRW) + 결제금액(USD) + 결제금액(KRW)
- 17컬럼 FR: 광고비 + 원화 + 결제금액 + 결제금액 원화
- DE 특수: 광고비(유로) + 원화

**sheet_source 테이블:** 시트별 tab_name, header_row, currency_local이 등록됨. schema.sql 시드 참조.

## Coding Rules (필수 준수)

### React / Next.js

- Server Components 기본 → `"use client"` 는 상호작용이 필요한 컴포넌트에만 사용
- `useEffect`에서 파생 상태 계산 금지 → `useMemo` 사용
- `useEffect` 내 setState 루프 주의 → 의존성 배열에 객체/배열 직접 넣지 말 것 (JSON.stringify 비교 또는 useMemo로 안정화)
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
- 광고비 집계: 봄툰 KR은 `ad_spend_local` 사용 (원화 컬럼 오류)
  → `CASE WHEN sheet_name = '봄툰 KR' THEN ad_spend_local ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END`
- CTR/ROAS는 시트에서 비율값(0.18)으로 저장됨 → 프론트에서 ×100 필요

### Performance (vercel-react-best-practices)

- 큰 컴포넌트는 `dynamic(() => import(...))` 으로 lazy load → 초기 번들 최소화
- `Promise.all()` 로 병렬 fetch 필수 → 직렬 `.then().then()` 체이닝 금지
- 이미지: `next/image` 사용 필수, width/height 명시, priority는 above-the-fold만
- 컴포넌트 내 무거운 계산은 `useMemo` / `useCallback` 으로 메모이제이션
- 리스트 렌더링 시 안정적인 `key` 필수 (index 사용 금지)
- Server Components에서 데이터 fetch → Client Components에 props로 전달 (Client에서 fetch 최소화)
- `useEffect` 내에서 파생 상태 계산 금지 → 렌더링 중에 계산하거나 `useMemo` 사용
- 불필요한 re-render 방지: props에 인라인 객체/함수 전달 금지
- API Route에서 적절한 `Cache-Control` 헤더 설정 (정적 데이터는 s-maxage + stale-while-revalidate)
- 서버사이드 집계 우선 → 클라이언트에 raw data 대량 전송 금지

### 금지된 안티패턴

- `Button asChild` 사용 금지 → `buttonVariants()` 사용 (base-ui 호환)
- Popover 내 `pointer-events-none` 주의 → 이벤트 전파 차단 유발
- `navigator.clipboard` 단독 사용 금지 → fallback (execCommand) 포함
- Supabase `.in()` 필터에 빈 배열 전달 금지 → 조건 스킵 처리 필요
- `.then().then()` Promise 체이닝 금지 → `async/await` 또는 `Promise.all()` 사용
- Client Component에서 대량 데이터 fetch 후 클라이언트 집계 금지 → 서버/DB에서 집계
- `useEffect` 안에서 setState로 파생 상태 계산 금지 → 무한 루프 위험
- 동기적 `import()` 없는 큰 라이브러리 직접 import 금지 → `next/dynamic` 사용

### 정기 정리 절차

```bash
rm -rf .next dist          # 빌드 캐시 정리
npm prune                  # 미사용 패키지 정리
npx tsc --noEmit           # 타입 체크
npm run lint               # 린트
npm run build              # 빌드 검증
```

## Current Status (2026-04-03)

### 완료

- [x] 랜딩 페이지 + 대시보드 UI 전체 구현
- [x] Supabase 스키마 (ad_raw + 매핑 테이블 + ad_normalized 뷰)
- [x] Google Sheets 동기화 파이프라인 (8개 시트, 8,112행 동기화 완료)
- [x] 대시보드 필터링 (국가/월/매체/목표)
- [x] KPI 카드, ROAS 추이 차트, 매체별 Bar 차트
- [x] 동기화 상태 UI (SyncStatus 컴포넌트, 사이드바 배치)
- [x] 빈 데이터 상태 처리

### 다음 단계 (Phase 1: MVP 대시보드)

- [ ] 사이드바 메뉴 재구성 (홈/플랫폼별/매체별)
- [ ] 날짜 범위 프리셋 필터 (오늘/7일/30일/이번달/커스텀)
- [ ] 추이 차트 탭 전환 (광고비/가입/결제/ROAS)
- [ ] KPI 목표 게이지
- [ ] Google Workspace SSO (현재 더미 로그인)

### 알려진 이슈

- Dashboard API가 Supabase 기본 limit (1,000행) 적용됨 → 서버사이드 집계 또는 limit 조정 필요
- FR/ES 시트의 통화 기호가 FORMATTED_VALUE에서 보이나, 파이프라인은 UNFORMATTED_VALUE 사용하므로 영향 없을 것으로 추정
- 테스트 프레임워크 미설정
