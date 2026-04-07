# Phase 1: MVP 대시보드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마케팅 기획자가 30초 내에 전체 성과를 파악하고 3클릭 내에 원인 분석에 도달할 수 있는 MVP 대시보드를 완성한다.

**Architecture:** 사이드바를 홈/플랫폼별/매체별 3메뉴로 재구성하고, 각 뷰는 DashboardShell을 재사용하되 1차 필터(플랫폼 또는 매체)를 페이지 내 Select로 적용한다. 날짜 선택기를 주별/월별/커스텀 3모드로 교체하고, 추이 차트를 4탭(광고비/가입/결제/ROAS)으로 확장한다. 인사이트 패널은 전기대비 변화를 자동 감지하여 표시한다.

**Tech Stack:** Next.js 16 (App Router), shadcn/ui (@base-ui/react), Recharts, @tanstack/react-table, Supabase, react-day-picker, date-fns

**Spec:** `docs/superpowers/specs/2026-04-03-phase1-MVP대시보드-기획서.md`

---

## File Structure

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/components/ui/calendar.tsx` | react-day-picker 래핑 shadcn Calendar |
| `src/components/dashboard/date-range-picker.tsx` | 3모드 날짜 선택기 (주별/월별/커스텀) |
| `src/components/dashboard/trend-chart.tsx` | 4탭 추이 차트 (광고비/가입/결제/ROAS) |
| `src/components/dashboard/platform-view.tsx` | 플랫폼별 뷰 클라이언트 컴포넌트 |
| `src/components/dashboard/medium-view.tsx` | 매체별 뷰 클라이언트 컴포넌트 |
| `src/components/dashboard/insights-panel.tsx` | 인사이트 패널 컴포넌트 |
| `src/app/dashboard/platform/page.tsx` | 플랫폼별 페이지 |
| `src/app/dashboard/medium/page.tsx` | 매체별 페이지 |
| `src/app/api/sidebar-data/route.ts` | 사이드바 데이터 API |
| `src/lib/dashboard-insights.ts` | 인사이트 생성 로직 |
| `src/lib/csv-export.ts` | CSV 내보내기 유틸 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/types/dashboard.ts` | DateMode, DateRange, TrendPoint, Insight 타입 추가, DashboardFilters 확장 |
| `src/components/dashboard/dashboard-sidebar.tsx` | 홈/플랫폼별/매체별 3메뉴로 재구성 |
| `src/components/dashboard/filter-bar.tsx` | 월 Select를 DateRangePicker로 교체 |
| `src/components/dashboard/dashboard-shell.tsx` | 날짜 URL 동기화, 4탭 trend 데이터, 인사이트 통합 |
| `src/components/dashboard/chart-section.tsx` | TrendChart로 교체 |
| `src/components/dashboard/dashboard-data-table.tsx` | CSV export, 히트맵 토글 |
| `src/lib/dashboard-queries.ts` | startDate/endDate 필터 추가 |
| `src/app/api/dashboard/route.ts` | startDate/endDate 파라미터 파싱/검증 |

---

## 의존성 그래프 & 실행 순서

```
Task 1: 타입 확장 (모든 Task의 기반)
  ↓
  ├→ Task 2: API 날짜 범위 필터 (독립)
  ├→ Task 3: Sidebar 데이터 API (독립)
  ├→ Task 4: 사이드바 재구성 (독립)
  ├→ Task 5: 인사이트 로직 (독립)
  │
  └→ Task 1 완료 후:
      ├→ Task 6: 날짜 선택기 (Task 1 의존)
      ├→ Task 7: 추이 차트 4탭 (Task 1 의존)
      ├→ Task 8: 테이블 강화 (독립)
      │
      └→ Task 6,7 완료 후:
          ├→ Task 9: DashboardShell 통합 (Task 1,5,6,7 의존)
          ├→ Task 10: 플랫폼별 뷰 (Task 4,9 의존)
          ├→ Task 11: 매체별 뷰 (Task 4,9 의존)
          └→ Task 12: 통합 검증
```

**병렬 가능 그룹:**
- Group A: Task 2 + 3 + 4 + 5 (모두 독립)
- Group B: Task 6 + 7 + 8 (Task 1 완료 후)
- Group C: Task 10 + 11 (Task 9 완료 후)

---

## Task 1: 타입 확장

**Files:**
- Modify: `src/types/dashboard.ts`

이 Task가 모든 후속 Task의 기반이므로 반드시 먼저 실행한다.

- [ ] **Step 1: DashboardFilters에 날짜 범위 필드 추가**

`src/types/dashboard.ts`의 `DashboardFilters` 인터페이스 끝에 추가:

```typescript
export type DateMode = "weekly" | "monthly" | "custom";

export interface DateRange {
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string;   // ISO "YYYY-MM-DD"
}
```

`DashboardFilters`를 수정:

```typescript
export interface DashboardFilters {
  countries: string[];
  months: string[];
  mediums: string[];
  goals: string[];
  dateMode: DateMode;
  dateRange: DateRange | null;
  startDate?: string;
  endDate?: string;
}
```

- [ ] **Step 2: TrendPoint 타입 추가**

```typescript
export interface TrendPoint {
  period: string;
  [countryOrTotal: string]: number | string;
}
```

- [ ] **Step 3: Insight 타입 추가**

```typescript
export interface Insight {
  type: "change" | "anomaly";
  severity: "positive" | "warning" | "danger";
  title: string;
  description: string;
  metric: string;
  country?: string;
  value: number;
  changePercent: number;
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/types/dashboard.ts
git commit -m "feat: extend dashboard types with DateRange, TrendPoint, Insight"
```

---

## Task 2: Dashboard API 날짜 범위 필터

**Files:**
- Modify: `src/lib/dashboard-queries.ts` — fetchAllRows에 date range 분기 추가
- Modify: `src/app/api/dashboard/route.ts` — startDate/endDate 파라미터 파싱/검증

- [ ] **Step 1: fetchAllRows에 날짜 범위 필터 추가**

`dashboard-queries.ts`의 `fetchAllRows` 함수에서, `months` 필터 블록을 수정:

```typescript
const useDateRange = Boolean(filters.startDate && filters.endDate);

// Date range takes precedence over months
if (useDateRange) {
  query = query.gte("ad_date", filters.startDate!).lte("ad_date", filters.endDate!);
} else if (filters.months.length > 0) {
  query = query.in("month", filters.months);
}
```

- [ ] **Step 2: API route에 startDate/endDate 파싱 추가**

`src/app/api/dashboard/route.ts`의 GET 핸들러에서 goals 파싱 다음에 추가:

```typescript
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const startDate = searchParams.get("startDate") ?? undefined;
const endDate = searchParams.get("endDate") ?? undefined;

if (startDate && !DATE_REGEX.test(startDate)) {
  return NextResponse.json(
    { error: "InvalidParams", message: `Invalid startDate format: '${startDate}'. Expected YYYY-MM-DD.` },
    { status: 400 },
  );
}
if (endDate && !DATE_REGEX.test(endDate)) {
  return NextResponse.json(
    { error: "InvalidParams", message: `Invalid endDate format: '${endDate}'. Expected YYYY-MM-DD.` },
    { status: 400 },
  );
}
if ((startDate && !endDate) || (!startDate && endDate)) {
  return NextResponse.json(
    { error: "InvalidParams", message: "Both startDate and endDate must be provided together." },
    { status: 400 },
  );
}
if (startDate && endDate && startDate > endDate) {
  return NextResponse.json(
    { error: "InvalidParams", message: "startDate must be before or equal to endDate." },
    { status: 400 },
  );
}

const filters: DashboardFilters = {
  countries, months, mediums, goals,
  dateMode: "monthly", dateRange: null,
  startDate, endDate,
};
```

- [ ] **Step 3: 검증**

```bash
curl "http://localhost:1004/api/dashboard?startDate=2026-01-01&endDate=2026-01-31" | python -c "import sys,json; d=json.load(sys.stdin); print(f'rows: {d[\"meta\"][\"totalRows\"]}')"
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/dashboard-queries.ts src/app/api/dashboard/route.ts
git commit -m "feat: add startDate/endDate filter to dashboard API"
```

---

## Task 3: Sidebar 데이터 API

**Files:**
- Create: `src/app/api/sidebar-data/route.ts`

- [ ] **Step 1: API route 작성**

```typescript
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const [platformsRes, mediumsRes] = await Promise.all([
      supabase.from("sheet_source").select("name, currency_local, country_code").eq("is_active", true).order("name"),
      supabase.from("medium_map").select("normalized").neq("normalized", "none"),
    ]);

    if (platformsRes.error) throw new Error(platformsRes.error.message);
    if (mediumsRes.error) throw new Error(mediumsRes.error.message);

    const platforms = [...new Map((platformsRes.data ?? []).map((r) => [r.name, { name: r.name, currency: r.currency_local, countryCode: r.country_code }])).values()];
    const mediums = [...new Set((mediumsRes.data ?? []).map((r) => String(r.normalized)).filter((v) => v && v !== "none"))].sort();

    return NextResponse.json({ platforms, mediums }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120" },
    });
  } catch (err) {
    return NextResponse.json({ error: "ServerError", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/sidebar-data/route.ts
git commit -m "feat: add sidebar-data API route"
```

---

## Task 4: 사이드바 재구성

**Files:**
- Modify: `src/components/dashboard/dashboard-sidebar.tsx`

- [ ] **Step 1: navMain을 홈/플랫폼별/매체별로 교체**

기존 navMain + navSecondary를 제거하고 3개 메뉴로 교체. 아이콘: `IconHome`, `IconBuildingStore`, `IconSpeakerphone`. navSecondary(Settings) 제거. SyncStatus는 유지.

Active 판정: `/dashboard`는 exact match, `/dashboard/platform`과 `/dashboard/medium`은 startsWith.

- [ ] **Step 2: 커밋**

```bash
git add src/components/dashboard/dashboard-sidebar.tsx
git commit -m "feat: restructure sidebar to 홈/플랫폼별/매체별"
```

---

## Task 5: 인사이트 생성 로직

**Files:**
- Create: `src/lib/dashboard-insights.ts`

- [ ] **Step 1: 인사이트 모듈 작성**

국가별로 current/previous 기간 집계 후:
1. Top 3 changes — 절대 변화율이 가장 큰 지표 3개
2. Anomaly alerts — CPA +30%, ROAS -30%, 가입 -50% 임계값 초과

`generateDashboardInsights(currentData: AdRow[], previousData: AdRow[]): Insight[]` 함수 export.

- [ ] **Step 2: 커밋**

```bash
git add src/lib/dashboard-insights.ts
git commit -m "feat: add dashboard insights generation logic"
```

---

## Task 6: 날짜 선택기

**Files:**
- Create: `src/components/ui/calendar.tsx`
- Create: `src/components/dashboard/date-range-picker.tsx`
- Modify: `src/components/dashboard/filter-bar.tsx`

**Dependencies:** `npm install react-day-picker date-fns`

- [ ] **Step 1: 의존성 설치**

```bash
npm install react-day-picker date-fns
```

- [ ] **Step 2: Calendar UI 컴포넌트 작성**

react-day-picker를 shadcn 스타일로 래핑한 `src/components/ui/calendar.tsx` 작성.

- [ ] **Step 3: DateRangePicker 컴포넌트 작성**

3모드 (주별/월별/커스텀) segment control + 각 모드별 UI:
- 주별: ◀ ▶ 네비게이션 + 주차 레이블
- 월별: ◀ ▶ 네비게이션 + 월 레이블
- 커스텀: 시작일/종료일 Calendar 팝오버

Props: `mode`, `onModeChange`, `value: DateRange | null`, `onChange`

- [ ] **Step 4: FilterBar에서 월 Select를 DateRangePicker로 교체**

기존 월 멀티셀렉트 제거, DateRangePicker 배치.

- [ ] **Step 5: 커밋**

```bash
git add src/components/ui/calendar.tsx src/components/dashboard/date-range-picker.tsx src/components/dashboard/filter-bar.tsx package.json package-lock.json
git commit -m "feat: add 3-mode date range picker (weekly/monthly/custom)"
```

---

## Task 7: 추이 차트 4탭

**Files:**
- Create: `src/components/dashboard/trend-chart.tsx`
- Modify: `src/components/dashboard/chart-section.tsx`

- [ ] **Step 1: TrendChart 컴포넌트 작성**

shadcn Tabs 내부에 Recharts AreaChart. 4탭: 광고비/가입/결제/ROAS.
각 탭은 `TrendPoint[]` 데이터를 받아 국가별 멀티라인 또는 전체 합산 라인으로 렌더링.
전체/국가별 ToggleGroup 포함.

- [ ] **Step 2: ChartSection을 TrendChart 기반으로 수정**

기존 RoasAreaChart를 TrendChart로 교체. MediumBarChart는 유지.
ChartSection props를 `trendData: Record<MetricKey, TrendPoint[]>`로 변경.

- [ ] **Step 3: 커밋**

```bash
git add src/components/dashboard/trend-chart.tsx src/components/dashboard/chart-section.tsx
git commit -m "feat: add 4-tab trend chart (adSpend/signups/revenue/ROAS)"
```

---

## Task 8: 테이블 강화 (CSV + 히트맵)

**Files:**
- Create: `src/lib/csv-export.ts`
- Modify: `src/components/dashboard/dashboard-data-table.tsx`

- [ ] **Step 1: CSV export 유틸 작성**

UTF-8 BOM 포함, 18컬럼 한국어 헤더, 현재 필터 데이터만 내보내기.

- [ ] **Step 2: 테이블에 CSV 버튼 + 히트맵 토글 추가**

툴바에 `IconDownload` CSV 버튼 + `IconFlame` 히트맵 토글.
히트맵: 열별 독립 min-max 정규화, `hsl(var(--chart-1))` 20% opacity 스케일.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/csv-export.ts src/components/dashboard/dashboard-data-table.tsx
git commit -m "feat: add CSV export and heatmap toggle to data table"
```

---

## Task 9: DashboardShell 통합

**Files:**
- Modify: `src/components/dashboard/dashboard-shell.tsx`

이 Task는 Task 1, 5, 6, 7의 결과물을 DashboardShell에 통합한다.

- [ ] **Step 1: 날짜 URL 동기화 업데이트**

`readFiltersFromUrl`과 `syncFiltersToUrl`에 `mode`, `start`, `end` 파라미터 추가.
fetch 호출에서 `startDate`/`endDate`를 `/api/dashboard`에 전달.

- [ ] **Step 2: 4탭 trend 데이터 계산 추가**

`computeTrendData(data, metric)` 함수로 4개 TrendPoint[] 배열 계산.
ChartSection에 `trendData` prop 전달.

- [ ] **Step 3: 인사이트 패널 통합**

데이터를 current/previous 기간으로 분할, InsightsPanel 렌더링.

- [ ] **Step 4: 커밋**

```bash
git add src/components/dashboard/dashboard-shell.tsx
git commit -m "feat: integrate date picker, trend chart, and insights into shell"
```

---

## Task 10: 플랫폼별 뷰

**Files:**
- Create: `src/app/dashboard/platform/page.tsx`
- Create: `src/components/dashboard/platform-view.tsx`

- [ ] **Step 1: PlatformView 클라이언트 컴포넌트 작성**

상단 플랫폼 Select → 선택 시 DashboardShell에 `key={platform}` + 필터 고정 전달.
URL 동기화: `?platform=레진 KR`.

- [ ] **Step 2: 서버 컴포넌트 페이지 작성**

`fetchDashboardData` + `fetchFilterOptions` 호출 → PlatformView에 전달.

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/platform/page.tsx src/components/dashboard/platform-view.tsx
git commit -m "feat: add platform view page with select filter"
```

---

## Task 11: 매체별 뷰

**Files:**
- Create: `src/app/dashboard/medium/page.tsx`
- Create: `src/components/dashboard/medium-view.tsx`

- [ ] **Step 1: MediumView 클라이언트 컴포넌트 작성**

Task 10과 동일 패턴, `medium` 필터 기준.

- [ ] **Step 2: 서버 컴포넌트 페이지 작성**

- [ ] **Step 3: 커밋**

```bash
git add src/app/dashboard/medium/page.tsx src/components/dashboard/medium-view.tsx
git commit -m "feat: add medium view page with select filter"
```

---

## Task 12: 통합 검증

- [ ] **Step 1: 빌드 확인**

```bash
npm run build
```

Expected: TypeScript 에러 0, 빌드 성공

- [ ] **Step 2: 사이드바 검증**

`/dashboard` — 홈 하이라이트, 3개 메뉴 표시

- [ ] **Step 3: 날짜 선택기 검증**

주별/월별/커스텀 3모드 전환, URL 동기화, 데이터 갱신

- [ ] **Step 4: 추이 차트 검증**

4탭 클릭 → 차트 데이터 변경, 전체/국가별 토글

- [ ] **Step 5: 플랫폼별 뷰 검증**

`/dashboard/platform` → Select에서 "레진 KR" 선택 → 해당 데이터만 표시

- [ ] **Step 6: 매체별 뷰 검증**

`/dashboard/medium` → Select에서 "Meta" 선택 → 해당 매체 크로스 플랫폼 비교

- [ ] **Step 7: 테이블 검증**

CSV 다운로드 → Excel에서 한국어 정상, 히트맵 토글 ON/OFF

- [ ] **Step 8: 인사이트 패널 검증**

홈 하단에 Top3 변화 + 이상치 알림 표시

- [ ] **Step 9: 최종 커밋**

```bash
git add -A
git commit -m "feat: Phase 1 MVP dashboard complete"
```
