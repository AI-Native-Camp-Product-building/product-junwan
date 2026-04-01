# AdInsight Dashboard - Component Specification

> Author: Frontend Developer Agent
> Date: 2026-04-01
> Status: Design Phase (pre-implementation)

---

## 1. Overview

The `/dashboard` route is the authenticated application view where brand planners analyze marketing ad performance data across 8 countries. It replaces the landing page demo with real Supabase-backed data and adds full interactivity (filtering, sorting, drill-down).

### Design Principles

- **Dark mode only** (consistent with landing page `html.dark` class)
- **Glassmorphism** cards: `bg-card/80 backdrop-blur-xl border border-border/50`
- **No sidebar** for v1 -- full-width content area with top navigation
- **Container queries** (`@container`) for responsive card and chart layouts, matching the reference example
- **All monetary values normalized to KRW** for cross-country comparison

---

## 2. Data Types

### 2.1 Normalized Row (from Supabase / API)

```ts
// src/types/dashboard.ts

export interface AdRow {
  id: string;
  country: string;          // "KR_레진" | "KR_봄툰" | "US" | "DE" | "FR" | "TH" | "TW" | "ES"
  month: string;            // "2026-01" (normalized)
  date: string;             // "2026-01-15" ISO date
  medium: string;           // Normalized: "Meta" | "YouTube" | "Google GDN" | "X(Twitter)" | "Pinterest" | "TikTok" | "Snapchat"
  goal: string;             // Normalized: "결제" | "첫결제" | "가입" | "가입&결제"
  creativeType: string;     // 소재종류 (normalized)
  creativeName: string;     // 소재 (작품명)
  adSpend: number;          // KRW (원화 환산 완료)
  adSpendLocal: number;     // 원래 통화 금액
  currency: string;         // 원래 통화 코드
  impressions: number;
  clicks: number;
  ctr: number;              // percentage
  signups: number;
  signupCpa: number;        // KRW
  conversions: number;      // 결제전환
  revenue: number;          // KRW (원화 환산 완료)
  roas: number;             // percentage
}
```

### 2.2 Filter State

```ts
export interface DashboardFilters {
  countries: string[];      // multi-select, empty = all
  months: string[];         // multi-select date range
  mediums: string[];        // multi-select, empty = all
  goals: string[];          // multi-select, empty = all
}
```

### 2.3 KPI Summary

```ts
export interface KpiSummary {
  adSpend: number;
  revenue: number;
  roas: number;
  signups: number;
  adSpendChange: number;    // MoM % change
  revenueChange: number;
  roasChange: number;
  signupsChange: number;
}
```

### 2.4 Chart Data Shapes

```ts
// Area chart: ROAS trend over time
export interface RoasTrendPoint {
  month: string;            // x-axis
  [country: string]: number | string;  // dynamic keys per country for multi-line
}

// Bar chart: spend by medium
export interface MediumSpendPoint {
  medium: string;           // x-axis category
  adSpend: number;
  revenue: number;
  roas: number;
}
```

---

## 3. Component Tree

```
/dashboard/page.tsx                    [Server Component]
├── DashboardNav                       [Server Component]
├── DashboardShell                     [Client Component - "use client"]
│   ├── FilterBar                      [Client Component - child]
│   │   ├── CountryMultiSelect
│   │   ├── MonthRangePicker
│   │   ├── MediumMultiSelect
│   │   └── GoalMultiSelect
│   ├── KpiCards                       [Client Component - child]
│   │   ├── KpiCard (광고비)
│   │   ├── KpiCard (결제금액)
│   │   ├── KpiCard (ROAS)
│   │   └── KpiCard (회원가입)
│   ├── ChartSection                   [Client Component - child]
│   │   ├── RoasAreaChart
│   │   └── MediumBarChart
│   └── DashboardDataTable             [Client Component - child]
└── Footer                             [Server Component - reused]
```

---

## 4. Component Specifications

### 4.1 `/dashboard/page.tsx` (Server Component)

**Responsibility**: Route entry point. Renders the page shell with server-fetched initial data.

**Data fetching**: Calls Supabase server-side to get:
- Available filter options (distinct countries, months, mediums, goals)
- Default data set (latest month, all countries)

**Layout**:
```
<main className="min-h-screen bg-background">
  <DashboardNav />
  <div className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-6">
    <DashboardShell initialData={data} filterOptions={options} />
  </div>
  <Footer />
</main>
```

**Why server component**: Initial data fetch happens on the server, avoiding client-side loading spinners on first paint. The shell then takes over for interactive filtering.

---

### 4.2 `DashboardNav`

**File**: `src/components/dashboard/dashboard-nav.tsx`
**Type**: Server Component
**Responsibility**: Top navigation bar for the dashboard view.

**Differences from landing Nav**:
- Shows "AdInsight" brand on left (same as landing)
- Shows breadcrumb: "Dashboard" text
- Right side: future user avatar / settings icon placeholder

**shadcn components**: None (pure HTML/Tailwind)

**Layout**:
```
fixed top-0 z-50 w-full
flex items-center justify-between
px-6 py-3
bg-background/80 backdrop-blur-xl border-b border-border/50
```

**Props**: None

---

### 4.3 `DashboardShell`

**File**: `src/components/dashboard/dashboard-shell.tsx`
**Type**: Client Component (`"use client"`)
**Responsibility**: Owns filter state, fetches data on filter change, distributes data to children.

**Props**:
```ts
interface DashboardShellProps {
  initialData: AdRow[];
  filterOptions: {
    countries: string[];
    months: string[];
    mediums: string[];
    goals: string[];
  };
}
```

**State management**:
- `filters: DashboardFilters` -- controlled by FilterBar
- `data: AdRow[]` -- fetched from `/api/dashboard?country=...&month=...`
- `isLoading: boolean` -- shown as skeleton states in children
- Derived values computed with `useMemo`:
  - `kpiSummary: KpiSummary`
  - `roasTrendData: RoasTrendPoint[]`
  - `mediumSpendData: MediumSpendPoint[]`
  - `tableData: AdRow[]` (grouped/aggregated)

**Data fetching pattern**:
- On filter change, call `fetch('/api/dashboard', { params })` via `useTransition` or `useSWR`
- Debounce filter changes by 300ms to avoid excessive API calls
- Show skeleton loading state during fetch

**Layout**:
```
<div className="flex flex-col gap-6">
  <FilterBar ... />
  <KpiCards ... />
  <ChartSection ... />
  <DashboardDataTable ... />
</div>
```

---

### 4.4 `FilterBar`

**File**: `src/components/dashboard/filter-bar.tsx`
**Type**: Client Component (child of DashboardShell)
**Responsibility**: Four filter controls in a horizontal bar.

**Props**:
```ts
interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  options: {
    countries: string[];
    months: string[];
    mediums: string[];
    goals: string[];
  };
}
```

**shadcn components**:
- `Select` for each filter (or custom multi-select popover built with `Popover` + `Command`)
- `Badge` to show selected filter count

**Layout**:
```
<div className="flex flex-wrap items-center gap-3">
  <CountryMultiSelect />   // width: 180px
  <MonthRangePicker />     // width: 200px  
  <MediumMultiSelect />    // width: 160px
  <GoalMultiSelect />      // width: 140px
  <ResetButton />          // text button, right-aligned
</div>
```

**Responsive**: On mobile (`< md`), stack vertically with `flex-col` and full-width selects.

**Multi-select behavior**: Since shadcn `Select` is single-select, each multi-select filter should be implemented as a `Popover` containing a checkbox list. Display format: "국가 (3)" showing count of selected items, or "전체" when none selected (meaning all).

**Filter options from data scan**:

| Filter | Options |
|--------|---------|
| Country | 레진 KR, 봄툰 KR, US, DE, FR, TH, TW, ES |
| Month | 2026-01 through 2026-04 (dynamic from data) |
| Medium | Meta, YouTube, Google GDN, X(Twitter), Pinterest, TikTok, Snapchat |
| Goal | 결제, 첫결제, 가입, 가입&결제 |

---

### 4.5 `KpiCards`

**File**: `src/components/dashboard/kpi-cards.tsx`
**Type**: Client Component (child of DashboardShell)
**Responsibility**: Four summary metric cards with MoM change indicators.

**Props**:
```ts
interface KpiCardsProps {
  summary: KpiSummary;
  isLoading: boolean;
}
```

**shadcn components**:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardFooter`
- `Badge` (for change rate indicator)

**Layout** (matches reference `section-cards.tsx`):
```
<div className="grid grid-cols-1 gap-4 px-4 lg:px-6
  @xl/main:grid-cols-2 @5xl/main:grid-cols-4
  *:data-[slot=card]:shadow-xs">
```

**Four cards**:

| Card | Label | Value Format | Change | Icon |
|------|-------|-------------|--------|------|
| 광고비 | "Total 광고비" | `formatCurrency(value)` e.g. "12.5억" | MoM % | TrendingUp/Down |
| 결제금액 | "Total 결제금액" | `formatCurrency(value)` e.g. "45.2억" | MoM % | TrendingUp/Down |
| ROAS | "평균 ROAS" | `formatPercentage(value)` e.g. "342.5%" | MoM pp change | TrendingUp/Down |
| 회원가입 | "Total 회원가입" | `formatNumber(value)` e.g. "8,420" | MoM % | TrendingUp/Down |

**Skeleton state**: When `isLoading`, show `Skeleton` components in place of values.

**Card glassmorphism**: Apply `bg-card/80 backdrop-blur-sm` to match landing page aesthetic. Use the gradient pattern from the reference: `from-primary/5 to-card`.

**Badge color logic**:
- Positive change: default outline badge with green-tinted icon
- Negative change: destructive-tinted badge
- ROAS and revenue: higher is better
- Ad spend: context-dependent (higher spend is neutral, not negative)

---

### 4.6 `ChartSection`

**File**: `src/components/dashboard/chart-section.tsx`
**Type**: Client Component (child of DashboardShell)
**Responsibility**: Container for the two main charts, side by side on desktop.

**Props**:
```ts
interface ChartSectionProps {
  roasTrendData: RoasTrendPoint[];
  mediumSpendData: MediumSpendPoint[];
  countries: string[];           // for chart legend / multi-line
  isLoading: boolean;
}
```

**Layout**:
```
<div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-7 lg:px-6">
  <div className="lg:col-span-4">
    <RoasAreaChart ... />
  </div>
  <div className="lg:col-span-3">
    <MediumBarChart ... />
  </div>
</div>
```

**Responsive**: Full width stacked on mobile; 4:3 ratio split on desktop.

---

### 4.7 `RoasAreaChart`

**File**: `src/components/dashboard/roas-area-chart.tsx`
**Type**: Client Component
**Responsibility**: Area chart showing ROAS trend over months, with optional per-country breakdown.

**Props**:
```ts
interface RoasAreaChartProps {
  data: RoasTrendPoint[];
  countries: string[];
  isLoading: boolean;
}
```

**shadcn components**:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`
- `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`
- `ToggleGroup` / `Select` for view mode toggle

**Recharts components**: `AreaChart`, `Area`, `CartesianGrid`, `XAxis`, `YAxis`

**Chart config**:
```ts
const chartConfig: ChartConfig = {
  // Dynamic: one entry per active country
  // Colors: cycle through --chart-1 to --chart-5
  "KR_레진": { label: "레진 KR", color: "var(--chart-1)" },
  "KR_봄툰": { label: "봄툰 KR", color: "var(--chart-2)" },
  "US":      { label: "US",      color: "var(--chart-3)" },
  // ... etc
}
```

**View modes** (via ToggleGroup in CardAction):
- **"전체"**: Single aggregated line showing overall ROAS
- **"국가별"**: Multi-line, one `<Area>` per selected country

**Gradient fill**: Each area gets a `<linearGradient>` from the country color at 0.8 opacity to 0.1 opacity, matching the reference pattern.

**Card structure** (matches reference):
```
Card > CardHeader (title + description + CardAction with ToggleGroup)
     > CardContent > ChartContainer (aspect-auto h-[300px])
```

**Tooltip**: `ChartTooltipContent` with `indicator="dot"`, showing all country values for the hovered month.

---

### 4.8 `MediumBarChart`

**File**: `src/components/dashboard/medium-bar-chart.tsx`
**Type**: Client Component
**Responsibility**: Horizontal or vertical bar chart showing ad spend and revenue per medium.

**Props**:
```ts
interface MediumBarChartProps {
  data: MediumSpendPoint[];
  isLoading: boolean;
}
```

**shadcn components**:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`
- `Tabs`, `TabsList`, `TabsTrigger` -- to switch between metrics (NOTE: Tabs component needs to be installed via shadcn CLI)

**Recharts components**: `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`

**Tab options**:
- "광고비" (default): Shows ad spend per medium
- "결제금액": Shows revenue per medium  
- "ROAS": Shows ROAS per medium

**Chart config**:
```ts
const chartConfig: ChartConfig = {
  adSpend:  { label: "광고비",   color: "var(--chart-1)" },
  revenue:  { label: "결제금액", color: "var(--chart-2)" },
  roas:     { label: "ROAS",     color: "var(--chart-3)" },
}
```

**Bar styling**: `radius={[4, 4, 0, 0]}` for rounded top corners. Single color bar, color changes based on active tab.

**Card structure**:
```
Card > CardHeader (title + Tabs as CardAction)
     > CardContent > ChartContainer (aspect-auto h-[300px])
```

---

### 4.9 `DashboardDataTable`

**File**: `src/components/dashboard/dashboard-data-table.tsx`
**Type**: Client Component
**Responsibility**: Detailed data table with sorting, pagination, and column visibility.

**Props**:
```ts
interface DashboardDataTableProps {
  data: AdRow[];
  isLoading: boolean;
}
```

**shadcn components**:
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Badge` (for country/medium tags)
- `Button` (pagination controls)
- `Select` (rows per page)
- `DropdownMenu` (column visibility toggle)

**Library**: `@tanstack/react-table` for sorting, pagination, column visibility, filtering.

**Columns**:

| Column | Key | Format | Sortable | Default Visible |
|--------|-----|--------|----------|-----------------|
| 국가 | `country` | Badge with country flag emoji | Yes | Yes |
| 월 | `month` | "2026-01" | Yes | Yes |
| 매체 | `medium` | Badge | Yes | Yes |
| 목표 | `goal` | Text | Yes | No (hidden by default) |
| 소재종류 | `creativeType` | Text | Yes | No |
| 광고비 | `adSpend` | Currency (KRW) | Yes | Yes |
| 노출수 | `impressions` | Number | Yes | No |
| 클릭 | `clicks` | Number | Yes | No |
| CTR | `ctr` | Percentage | Yes | No |
| 회원가입 | `signups` | Number | Yes | Yes |
| 가입CPA | `signupCpa` | Currency | Yes | No |
| 결제전환 | `conversions` | Number | Yes | No |
| 결제금액 | `revenue` | Currency (KRW) | Yes | Yes |
| ROAS | `roas` | Percentage | Yes | Yes |

**Default sort**: ROAS descending.

**Pagination**: 20 rows per page default, options: 10, 20, 50.

**Table toolbar**:
```
<div className="flex items-center justify-between gap-4 px-4 lg:px-6">
  <Input placeholder="검색..." />           // global filter
  <DropdownMenu>                             // column visibility
    <Button variant="outline" size="sm">
      <IconLayoutColumns /> 컬럼
    </Button>
  </DropdownMenu>
</div>
```

**Table footer** (pagination):
```
<div className="flex items-center justify-between px-4 py-2">
  <span className="text-sm text-muted-foreground">
    총 {totalRows}건 중 {startRow}-{endRow}
  </span>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="icon" /> // prev
    <span>페이지 {current} / {total}</span>
    <Button variant="outline" size="icon" /> // next
  </div>
</div>
```

**Row aggregation mode**: The table can show either raw rows or aggregated rows (grouped by country + month + medium). A toggle in the toolbar switches between "상세" and "요약" views.

---

## 5. API Route Specification

### `GET /api/dashboard`

**File**: `src/app/api/dashboard/route.ts`
**Type**: Route Handler (server-side only)

**Query parameters**:
```
?countries=KR_레진,US
&months=2026-01,2026-02,2026-03
&mediums=Meta,TikTok
&goals=결제,가입
```

**Response**:
```ts
{
  data: AdRow[];
  meta: {
    totalRows: number;
    countries: string[];    // distinct values in result
    months: string[];
    mediums: string[];
    goals: string[];
  };
}
```

**Data source**: Supabase `ad_rows` table with server-side filtering via Supabase client.

---

## 6. New shadcn Components Required

The following components need to be installed before implementation:

| Component | Usage | Install Command |
|-----------|-------|-----------------|
| `Tabs` | MediumBarChart metric switching | `npx shadcn@latest add tabs` |
| `ToggleGroup` | RoasAreaChart view mode | `npx shadcn@latest add toggle-group` |
| `Popover` | Multi-select filter dropdowns | `npx shadcn@latest add popover` |
| `Command` | Searchable filter lists | `npx shadcn@latest add command` |
| `Checkbox` | Multi-select items | `npx shadcn@latest add checkbox` |
| `Input` | Table search | `npx shadcn@latest add input` |
| `Skeleton` | Loading states | `npx shadcn@latest add skeleton` |
| `Separator` | Visual dividers | `npx shadcn@latest add separator` |
| `DropdownMenu` | Column visibility | `npx shadcn@latest add dropdown-menu` |

**NPM packages**:
```
npm install @tanstack/react-table @tabler/icons-react
```

---

## 7. File Structure (New Files)

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx                          # Server Component entry
│   └── api/
│       └── dashboard/
│           └── route.ts                      # API route handler
├── components/
│   └── dashboard/
│       ├── dashboard-nav.tsx                 # Top nav (Server)
│       ├── dashboard-shell.tsx               # Client shell with state
│       ├── filter-bar.tsx                    # Filter controls
│       ├── multi-select.tsx                  # Reusable multi-select (Popover+Command)
│       ├── kpi-cards.tsx                     # KPI summary cards
│       ├── chart-section.tsx                 # Chart layout container
│       ├── roas-area-chart.tsx               # ROAS trend area chart
│       ├── medium-bar-chart.tsx              # Medium comparison bar chart
│       └── dashboard-data-table.tsx          # Data table with @tanstack/react-table
├── types/
│   └── dashboard.ts                          # All TypeScript interfaces
└── lib/
    └── dashboard-utils.ts                    # KPI aggregation, chart data transforms
```

---

## 8. Data Flow Diagram

```
[Supabase ad_rows table]
        |
        v
[/api/dashboard route.ts]  <-- server-side Supabase query with filters
        |
        v (JSON response)
[DashboardShell]            <-- "use client", owns filter state
   |  useMemo() derives:
   |  ├── kpiSummary
   |  ├── roasTrendData  
   |  ├── mediumSpendData
   |  └── tableData
   |
   ├── FilterBar            <-- user changes filters -> triggers refetch
   ├── KpiCards(summary)
   ├── ChartSection
   │   ├── RoasAreaChart(roasTrendData)
   │   └── MediumBarChart(mediumSpendData)
   └── DashboardDataTable(tableData)
```

---

## 9. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `< 640px` (mobile) | Single column. Filters stack vertically. Charts full-width. Table horizontal scroll. |
| `640px - 1024px` (tablet) | KPI cards 2x2 grid. Charts stacked. Table with fewer default columns. |
| `> 1024px` (desktop) | KPI cards 4-across. Charts side-by-side (4:3). Full table. |
| `> 1536px` (2xl) | Max-width container `max-w-screen-2xl`. Generous padding. |

Use container queries (`@container`) for KPI cards and chart cards, matching the reference pattern of `@xl/main:grid-cols-2 @5xl/main:grid-cols-4`.

---

## 10. Performance Considerations

1. **Server-side initial data**: `page.tsx` fetches default data on the server so the dashboard renders with content on first paint (no loading spinner).

2. **Debounced filter changes**: 300ms debounce on filter state changes before triggering API fetch, preventing excessive requests during rapid filter adjustments.

3. **useMemo for derived data**: KPI aggregation and chart data transformations are memoized and only recompute when `data` changes.

4. **Virtual table rows**: If data exceeds 200 rows, consider `@tanstack/react-virtual` for row virtualization. For v1 with 8,000 rows across 8 countries, pagination at 20 rows/page is sufficient.

5. **Chart lazy loading**: Wrap `ChartSection` in `React.lazy()` with a `Suspense` boundary and skeleton fallback, since Recharts is a heavy dependency.

6. **Bundle splitting**: The `/dashboard` route is a separate page, so Next.js automatically code-splits it from the landing page.

---

## 11. Accessibility Notes

- All filter controls must have proper `aria-label` attributes (e.g., `aria-label="국가 선택"`)
- Table must use semantic `<table>` markup (shadcn Table already does this)
- Sort indicators need `aria-sort` attributes on column headers
- Chart areas need `role="img"` with `aria-label` describing the trend
- Keyboard navigation: filters accessible via Tab, table sortable via Enter on headers
- Color is never the sole indicator -- badges include text alongside color coding

---

## 12. Glassmorphism Token Reference

To maintain visual consistency with the landing page:

```
// Card base
bg-card/80 backdrop-blur-xl border border-border/50 shadow-xs

// Nav bar
bg-background/80 backdrop-blur-xl border-b border-border/50

// Filter dropdowns
bg-popover/95 backdrop-blur-lg border border-border/50

// Gradient on KPI cards (from reference)
from-primary/5 to-card
```

These use semantic color tokens that auto-switch between light/dark via the CSS variable system, following the project's shadcn style rules.
