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

| 항목 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16.2.2 (App Router) | Turbopack, `node_modules/next/dist/docs/` 참조 필수 |
| UI | shadcn/ui (base-ui) | `@base-ui/react` 1.3.0 — Radix가 아님 |
| 차트 | Recharts 3.8 (via shadcn charts) | Area, Bar, Radial |
| 스타일 | Tailwind CSS v4 | shadcn 테마 시스템 |
| DB | Supabase (PostgreSQL) | anon client + service_role admin client |
| 데이터 소스 | Google Sheets API v4 | `googleapis`, Service Account 인증 |
| 테이블 | @tanstack/react-table 8 | 정렬/필터 지원 |
| 폰트 | Pretendard Variable | CDN `<link>` in layout.tsx |
| 언어 | TypeScript strict | |

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

| 경로 | 메서드 | 용도 | 인증 |
|------|--------|------|------|
| `/api/dashboard` | GET | 필터링된 대시보드 데이터 | 없음 (CDN 5분 캐시) |
| `/api/filters` | GET | 필터 옵션 (국가/월/매체/목표) | 없음 (CDN 1시간 캐시) |
| `/api/sync` | POST | Google Sheets → Supabase 동기화 | Bearer `SYNC_API_SECRET` |
| `/api/sync-trigger` | POST | 프론트엔드용 동기화 프록시 | 없음 (서버사이드에서 직접 호출) |
| `/api/sync-status` | GET | 시트별 동기화 상태 | 없음 |
| `/api/auth` | POST | 로그인 (현재 더미) | 없음 |
| `/api/export` | POST | 데이터 내보내기 | 없음 |

### Key Lib Modules

| 모듈 | 역할 |
|------|------|
| `sheets-client.ts` | Google Sheets API 클라이언트. Service Account JWT 인증. SERVER ONLY |
| `sheets-parser.ts` | 시트 헤더 매핑 (`HEADER_PATTERNS`) + 행 파싱. 17개 필드, 한국어 헤더 변형 처리 |
| `sheets-sync.ts` | 동기화 오케스트레이터. `syncAllSheets()`, 시트별 에러 격리, 배치 upsert |
| `dashboard-queries.ts` | `ad_normalized` 뷰 쿼리. `fetchDashboardData()`, `fetchFilterOptions()` |
| `supabase.ts` | anon client (public read) |
| `supabase-admin.ts` | service_role client (write). SERVER ONLY |
| `format.ts` | KRW 통화, 퍼센트, 숫자 포맷터 |

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
