# AdInsight Query Views — UX Specification

> ArchitectUX | 2026-04-02
> Target Users: Non-technical brand planners who currently use Google Sheets
> Design System: Glassmorphism dark theme, Cornflower Blue (#6495ED) accent

---

## 1. Navigation Pattern: Horizontal Tab Bar

### Decision: Tabs at the top of the dashboard content area

**Why tabs over alternatives:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Horizontal Tabs | Visible at a glance, 1-click switch, familiar from Sheets tabs | Limited horizontal space | **Selected** |
| Sidebar sub-nav | Always visible | Already have a sidebar; nesting creates depth | Rejected |
| Dropdown selector | Compact | Hides options, requires 2 clicks | Rejected |
| Card-based picker | Visual, explorable | Takes too much vertical space, adds a step | Rejected |

**Justification:** Brand planners already think in "tabs" — the Google Sheets summary file literally has 6 tabs. Mirroring this mental model means zero learning curve. The sidebar already handles top-level navigation (Overview, Countries, Media, Reports). The 6 query views live *within* the Overview page as a secondary navigation layer, not as separate routes.

### Tab Bar Layout

```
+------------------------------------------------------------------+
| [주간 로케일별] [주간 매체별] [주간 목표별] | [월간 로케일별] | [작품별 효율] [원본 마스터] |
|  ^^^^^^^^^^^                                                      |
|  active tab (cornflower underline)                                |
+------------------------------------------------------------------+
```

**Visual grouping:** A subtle vertical divider (1px `rgba(255,255,255,0.06)`) separates the three logical groups:
1. Weekly views (3 tabs)
2. Monthly view (1 tab)
3. Special views (2 tabs)

**Responsive behavior:**
- Desktop (1024px+): All 6 tabs visible in a single row
- Tablet (768px-1023px): Tabs scroll horizontally with fade indicators
- Mobile (<768px): Tabs become a scrollable pill bar, 2-3 visible at a time

### Tab Bar Wireframe (Desktop)

```
+------------------------------------------------------------------+
|                                                                    |
|  [icon] 로케일별   매체별   목표별  |  월간  |  작품별   마스터    |
|  ____________________________        ______    _______________     |
|  cornflower-500 underline (2px)                                   |
|                                                                    |
+------------------------------------------------------------------+
```

### Tab Active State

```css
/* Active tab */
border-bottom: 2px solid rgba(100, 149, 237, 0.9);
color: rgba(255, 255, 255, 0.95);
text-shadow: 0 0 12px rgba(100, 149, 237, 0.2);

/* Inactive tab */
border-bottom: 2px solid transparent;
color: rgba(255, 255, 255, 0.45);

/* Hover (inactive) */
color: rgba(255, 255, 255, 0.7);
background: rgba(255, 255, 255, 0.03);
border-radius: 8px 8px 0 0;
```

---

## 2. Week/Month Picker

### 2.1 Week Picker (for tabs 1-3, 5, 6)

The week picker replaces the current month multi-select when a weekly view is active. It uses a compact "stepper" pattern — a single row showing the current week with prev/next arrows and a dropdown for jumping.

#### Wireframe

```
+------------------------------------------------------------------+
|                                                                    |
|   [<]   3월 3주차 (03.16 ~ 03.22)   [>]   [v dropdown]           |
|          ^^^^^^^^^^^^^^^^^^^^^^^^^                                 |
|          Primary label, lg font                                    |
|          Subtext: "전주: 03.09 ~ 03.15"                            |
|                                                                    |
+------------------------------------------------------------------+
```

#### Interaction Details

**Stepper arrows `[<]` `[>]`:**
- Single click moves to previous/next week
- Long press (300ms) enters rapid-scroll mode (2 weeks/second)
- Right arrow is disabled if current week is the latest available
- Keyboard: Left/Right arrows when focused

**Dropdown `[v]`:**
- Opens a scrollable list of all available weeks
- Format per row: `3월 3주차 (03.16 ~ 03.22)`
- Current week highlighted with cornflower background
- Most recent week at top
- Grouped by month with sticky month headers (`2026년 3월`, `2026년 2월`, ...)
- Max height: 320px with scroll

**Auto-selection:**
- On initial load: select the most recent *complete* week (not the current partial week)
- Definition of "complete": Sunday through Saturday where Saturday <= today

**Comparison badge:**
- Automatically shows "vs 전주" below the week label
- No user configuration needed — comparison is always WoW for weekly views
- The comparison period is always `selectedWeek - 1`

#### Week Picker Data Structure

```typescript
interface WeekOption {
  /** ISO week key: "2026-W12" */
  key: string;
  /** Display label: "3월 3주차" */
  label: string;
  /** Date range display: "03.16 ~ 03.22" */
  dateRange: string;
  /** Start date (Monday or Sunday, depending on locale) */
  startDate: string;
  /** End date */
  endDate: string;
  /** Previous week key for comparison */
  prevWeekKey: string | null;
}
```

### 2.2 Month Picker (for tab 4: Monthly)

The month picker follows the same stepper pattern but with months.

#### Wireframe

```
+------------------------------------------------------------------+
|                                                                    |
|   [<]   2026년 3월   [>]   [v dropdown]                           |
|          Subtext: "전월: 2026년 2월"                               |
|                                                                    |
+------------------------------------------------------------------+
```

**Dropdown:** List of months, most recent first, grouped by year.

**Auto-selection:** Most recent complete month (where today > last day of month).

**Comparison:** Always MoM. Shown as "vs 전월" badge.

### 2.3 Unified Period Bar (replacing current FilterBar period controls)

When a query view tab is selected, the period picker replaces the "월" multi-select in the existing FilterBar. The remaining filters (country, medium, goal) remain available as secondary filters that apply *on top of* the view's aggregation.

```
+------------------------------------------------------------------+
| Tab Bar: [로케일별]  매체별  목표별  |  월간  |  작품별  마스터    |
+------------------------------------------------------------------+
| Period:  [<] 3월 3주차 (03.16~03.22) [>] [v]                      |
| Filters: [국가 v]  [매체 v]  [목표 v]  [x 초기화]  [링크복사]    |
| Summary: "전체 국가 / 3월 3주차 / 전체 매체 / 전체 목표"          |
+------------------------------------------------------------------+
```

---

## 3. View-Specific Layouts

### 3.1 주간_로케일별 (Weekly by Country)

**Purpose:** "How is each country performing this week vs last week?"

#### Main Data: Summary Table

| Column | Description | Sort | Width |
|--------|-------------|------|-------|
| 로케일 | Country name (e.g., 봄툰KR) | - | 120px |
| 광고비 | Ad spend this week (KRW formatted) | Desc (default) | 120px |
| 결제금액 | Revenue this week | - | 120px |
| ROAS | Revenue/Spend as % | - | 80px |
| 회원가입 | Signups this week | - | 80px |
| 결제전환 | Conversions this week | - | 80px |
| 가입CPA | Spend/Signups | - | 90px |
| 광고비 (전주) | Previous week spend | - | 110px |
| ROAS (전주) | Previous week ROAS | - | 90px |
| 광고비 증감% | WoW spend change | - | 90px |
| ROAS 변화 | WoW ROAS change (pp) | - | 90px |

**Total row:** Pinned at bottom, bold, with slightly elevated glass background.

**Comparison columns behavior:**
- Positive change: Cornflower blue text + upward arrow
- Negative change: `hsl(0, 62.8%, 30.6%)` (destructive) text + downward arrow
- Neutral (< 1%): Muted foreground, dash

#### Complementary Charts (above the table)

**Left (60% width): Country ROAS Bar Chart**
- Horizontal bar chart
- X-axis: ROAS %
- Y-axis: Country names
- Color: Cornflower gradient bars
- Previous week shown as ghost bars (rgba(100,149,237,0.15))

**Right (40% width): Spend Distribution Radial**
- Donut chart showing spend proportion per country
- Center text: Total spend formatted
- Segments: chart-1 through chart-5 colors

#### KPI Cards (top row, 4 cards)

Same as current KPI cards but computed for the selected week only, with WoW comparison instead of MoM.

```
+--------+--------+--------+--------+
| 광고비  | 결제금액 | ROAS   | 회원가입 |
| 24.5M  | 27.3M  | 111%   | 4,832  |
| -8.5%  | +3.2%  | +11pp  | -2.1%  |
+--------+--------+--------+--------+
```

### 3.2 주간_매체별 (Weekly by Medium)

**Purpose:** "Which ad channels are performing best this week?"

#### Main Data: Summary Table

| Column | Description | Sort |
|--------|-------------|------|
| 로케일 | Country | - |
| 매체 | Medium (Meta, YouTube, etc.) | - |
| 광고비 | Ad spend | Desc (default) |
| 결제금액 | Revenue | - |
| ROAS | Percentage | - |
| 회원가입 | Signups | - |
| 결제전환 | Conversions | - |
| 가입CPA | Cost per signup | - |

**Default sort:** Ad spend descending (matches the Sheets convention).

**Row grouping:** Rows are visually grouped by country. First row of each country group shows the country name; subsequent rows in the group show a subtle indent. A thin 1px divider (`rgba(255,255,255,0.04)`) separates country groups.

#### Complementary Charts

**Left (50%): Stacked Bar Chart — Spend by Medium per Country**
- X-axis: Country
- Y-axis: Spend (KRW)
- Stacks: One color per medium (chart-1 through chart-5)
- Legend below chart

**Right (50%): Medium ROAS Comparison**
- Grouped horizontal bars
- Each medium as a row, bars colored by country
- Quick visual: "YouTube does better in KR than US"

### 3.3 주간_목표별 (Weekly by Goal)

**Purpose:** "How does performance differ between conversion goals?"

#### Main Data: Summary Table

| Column | Description | Sort |
|--------|-------------|------|
| 로케일 | Country | - |
| 목표 | Goal (결제, 가입, 첫결제, 가입&결제) | - |
| 광고비 | Ad spend | Desc (default) |
| 결제금액 | Revenue | - |
| ROAS | Percentage | - |
| 회원가입 | Signups | - |
| 결제전환 | Conversions | - |
| 가입CPA | Cost per signup | - |

**Row grouping:** Same as medium view — grouped by country.

#### Complementary Charts

**Left (50%): Goal Distribution Pie/Donut**
- Segments: One per goal type
- Shows proportion of total spend allocated to each goal
- Center: Total spend

**Right (50%): Goal Performance Scatter**
- X-axis: Ad Spend
- Y-axis: ROAS
- Bubble size: Revenue
- Color: Goal type
- Enables quick identification of efficient vs. inefficient goals

### 3.4 월간_로케일별 (Monthly by Country)

**Purpose:** "How did each country perform this month vs last month?"

Identical layout to 주간_로케일별 (3.1) with these differences:
- Period picker shows months instead of weeks
- Comparison columns show MoM instead of WoW
- KPI cards show MoM change
- ROAS trend chart shows monthly progression (area chart with previous months visible)

#### Additional Chart: Monthly Trend Area Chart

- Full-width area chart below KPI cards
- X-axis: Last 6 months
- Y-axis: ROAS %
- One line per country with gradient fills
- Current month highlighted with a vertical marker line

### 3.5 작품별_효율 (Creative Performance)

**Purpose:** "Which creatives/titles are performing best?"

This view is unique — it has TWO sections stacked vertically.

#### Section A: ROAS Top Creatives (결제 campaigns)

Title bar: "**결제 캠페인 ROAS 상위 소재** (광고비 기준)"

| # | 로케일 | 작품명 | 광고비 | 결제금액 | ROAS | 결제전환 |
|---|--------|--------|--------|---------|------|---------|
| 1 | 봄툰KR | Title A | 5.2M | 8.1M | 156% | 342 |
| 2 | 레진KR | Title B | 3.8M | 5.2M | 137% | 215 |

- Filter: `goal` in ("결제", "첫결제", "가입&결제")
- Sort: ROAS descending (primary), ad spend descending (secondary)
- Show top 20 by default, "더 보기" button expands

#### Section B: CPA Top Creatives (가입 campaigns)

Title bar: "**가입 캠페인 CPA 소재 현황** (광고비 기준)"

| # | 로케일 | 작품명 | 광고비 | 회원가입 | 가입CPA |
|---|--------|--------|--------|---------|--------|
| 1 | 봄툰KR | Title C | 4.1M | 1,205 | 3,402 |
| 2 | US | Title D | 2.8M | 890 | 3,146 |

- Filter: `goal` in ("가입", "가입&결제")
- Sort: Ad spend descending
- Show top 20 by default

#### Complementary Chart

**Full width: Creative Efficiency Scatter Plot**
- Positioned between the two sections
- X-axis: Ad Spend (log scale for wide range)
- Y-axis: ROAS (Section A) or inverse CPA (Section B)
- Bubble: Each creative
- Color: Country
- Hover: Shows creative name, country, all metrics
- Interactive: Click bubble to highlight the table row

### 3.6 원본_마스터 (Raw Weekly Master)

**Purpose:** "Give me all the data for this week."

#### Main Data: Full Table

| Column | Description | Sort |
|--------|-------------|------|
| 로케일 | Country | - |
| 매체 | Medium | - |
| 광고비 (KRW) | Ad spend | Desc (default) |
| 결제금액 (KRW) | Revenue | - |
| ROAS | Percentage | - |
| 회원가입 | Signups | - |
| 결제전환 | Conversions | - |
| 가입CPA | Cost per signup | - |
| 노출 | Impressions | - |
| CTR | Click-through rate | - |
| 비고 | Notes/memo | - |

**Features unique to this view:**
- Column visibility toggle (already exists in current DataTable)
- CSV export button prominently placed in the view header
- No complementary charts — this is a data-first view
- Search bar for filtering rows by any text column
- Sortable on all numeric columns

#### Layout

```
+------------------------------------------------------------------+
| 원본 마스터                                    [CSV 내보내기] [컬럼]|
+------------------------------------------------------------------+
| [Search: 로케일, 매체, 비고 검색...]                               |
+------------------------------------------------------------------+
| Table with all columns                                            |
| ...                                                               |
| ...                                                               |
+------------------------------------------------------------------+
| 데이터 수집 현황: 8개국 수집 완료 | 마지막 동기화: 04.02 09:00     |
+------------------------------------------------------------------+
```

---

## 4. Drill-Down Behavior

### Pattern: Slide-In Detail Panel

When a user clicks a row (e.g., "봄툰KR" in the locale view), a detail panel slides in from the right side. This preserves the summary context while showing depth.

**Why panel over other options:**

| Option | Verdict | Reason |
|--------|---------|--------|
| Filter dashboard | Rejected | Loses summary context, confusing back navigation |
| Navigate to sub-view | Rejected | Full page load, breaks mental model of "exploring" |
| Modal/dialog | Rejected | Feels blocking, can't reference the table behind |
| **Slide-in panel** | **Selected** | Non-blocking, maintains context, standard pattern |

### Detail Panel Wireframe

```
+---------------------------+-------------------+
| Summary Table (dimmed)    | Detail Panel      |
|                           | ================= |
| [row 1]                   | 봄툰 KR           |
| [row 2] <-- clicked       | 3월 3주차 성과     |
| [row 3]                   |                   |
|                           | KPI Cards (2x2)   |
|                           | +------+------+   |
|                           | |광고비 |결제금액|  |
|                           | |14.5M |16.0M |   |
|                           | +------+------+   |
|                           | |ROAS  |회원가입|  |
|                           | |110%  |2,483 |   |
|                           | +------+------+   |
|                           |                   |
|                           | Weekly Trend Chart |
|                           | (last 4 weeks)    |
|                           |  __/\___/\__      |
|                           |                   |
|                           | Medium Breakdown   |
|                           | YouTube: 8.7M     |
|                           | Meta: 5.8M        |
|                           |                   |
|                           | [전체 보기 ->]     |
|                           |                   |
|                           |         [X close] |
+---------------------------+-------------------+
```

### Detail Panel Behavior

**Open:** 300ms slide-in from right, `cubic-bezier(0.16, 1, 0.3, 1)`. Background dims to 60% opacity.

**Close:** Click X, press Escape, or click outside the panel. 200ms slide-out.

**Width:** 400px on desktop, full width on mobile (bottom sheet pattern).

**Content varies by view:**

| Source View | Panel Shows |
|-------------|-------------|
| 로케일별 | Country deep-dive: KPIs, weekly trend (4 weeks), medium breakdown, top creatives |
| 매체별 | Medium deep-dive: KPIs for that country+medium, weekly trend, goal breakdown |
| 목표별 | Goal deep-dive: KPIs for that country+goal, weekly trend, medium breakdown |
| 작품별 | Creative deep-dive: Full metrics, weekly performance trend, compare to category avg |
| 마스터 | Same as 매체별 (country+medium combo detail) |

**"전체 보기" link:** Navigates to the full dashboard with filters pre-set to that entity. For example, clicking "전체 보기" on the 봄툰KR panel sets `countries=["봄툰KR"]` in the main filter and closes the panel.

### Drill-Down from Chart Elements

Charts also support drill-down:
- Click a bar/segment: Opens the same detail panel for that entity
- Hover: Shows tooltip with key metrics
- The chart click and table row click lead to the same panel

---

## 5. Component Specification

### 5.1 ViewTabBar

**Responsibility:** Renders the 6 view tabs with active state, handles view switching.

```typescript
interface ViewTabBarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

type ViewType =
  | "weekly-locale"
  | "weekly-medium"
  | "weekly-goal"
  | "monthly-locale"
  | "creative-efficiency"
  | "raw-master";

interface ViewTab {
  key: ViewType;
  label: string;
  shortLabel: string;      // For mobile
  icon: TablerIcon;
  periodType: "week" | "month" | "week";
  group: "weekly" | "monthly" | "special";
}
```

**shadcn components:** Build with `Tabs`, `TabsList`, `TabsTrigger` from shadcn.

**Glassmorphism tokens:**
```css
/* Tab bar container */
background: rgba(255, 255, 255, 0.02);
border-bottom: 1px solid rgba(255, 255, 255, 0.06);
backdrop-filter: blur(12px);

/* Active tab underline */
border-bottom-color: rgba(100, 149, 237, 0.9);
box-shadow: 0 2px 8px rgba(100, 149, 237, 0.15);

/* Tab divider between groups */
border-left: 1px solid rgba(255, 255, 255, 0.06);
margin-left: 8px;
padding-left: 8px;
```

**File:** `src/components/dashboard/view-tab-bar.tsx`

---

### 5.2 WeekPicker

**Responsibility:** Week selection with stepper navigation and dropdown.

```typescript
interface WeekPickerProps {
  /** All available weeks derived from data */
  weeks: WeekOption[];
  /** Currently selected week key, e.g. "2026-W12" */
  selectedWeek: string;
  /** Callback when week changes */
  onWeekChange: (weekKey: string) => void;
}

interface WeekOption {
  key: string;           // "2026-W12"
  label: string;         // "3월 3주차"
  dateRange: string;     // "03.16 ~ 03.22"
  startDate: string;     // "2026-03-16"
  endDate: string;       // "2026-03-22"
  month: string;         // "2026-03" for grouping
}
```

**shadcn components:** `Button` (prev/next arrows), `Popover` + custom scroll list (dropdown).

**Glassmorphism tokens:**
```css
/* Week display area */
.week-picker-display {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 8px 16px;
}

/* Arrow buttons */
.week-picker-arrow {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  transition: all 150ms ease;
}

.week-picker-arrow:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(100, 149, 237, 0.3);
}

/* Dropdown: active week */
.week-option-active {
  background: rgba(100, 149, 237, 0.12);
  color: rgba(100, 149, 237, 0.95);
}

/* Dropdown: month group header */
.week-month-header {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px 4px;
  position: sticky;
  top: 0;
  background: inherit;
}
```

**File:** `src/components/dashboard/week-picker.tsx`

---

### 5.3 MonthPicker

**Responsibility:** Month selection with stepper navigation (for monthly view).

```typescript
interface MonthPickerProps {
  months: MonthOption[];
  selectedMonth: string;       // "2026-03"
  onMonthChange: (month: string) => void;
}

interface MonthOption {
  key: string;                 // "2026-03"
  label: string;               // "2026년 3월"
  shortLabel: string;          // "3월"
}
```

**shadcn components:** `Button`, `Popover`.

**File:** `src/components/dashboard/month-picker.tsx`

---

### 5.4 ViewSummaryTable

**Responsibility:** Configurable data table that adapts columns and grouping based on active view.

```typescript
interface ViewSummaryTableProps {
  view: ViewType;
  data: ViewSummaryRow[];
  comparisonData?: ViewSummaryRow[];   // Previous period for WoW/MoM
  onRowClick: (row: ViewSummaryRow) => void;
  isLoading: boolean;
}

interface ViewSummaryRow {
  id: string;
  country: string;
  dimension?: string;           // Medium name, goal name, or creative name
  adSpend: number;
  revenue: number;
  roas: number;
  signups: number;
  conversions: number;
  signupCpa: number;
  // Comparison fields (computed)
  adSpendPrev?: number;
  roasPrev?: number;
  adSpendChange?: number;       // Percentage
  roasChange?: number;          // Percentage points
  // Extended fields for raw master
  impressions?: number;
  ctr?: number;
  notes?: string;
}

/** Column definition per view */
interface ViewColumnConfig {
  view: ViewType;
  columns: ColumnDef[];
  defaultSort: { column: string; direction: "asc" | "desc" };
  groupBy?: string;             // "country" for medium/goal views
  showComparison: boolean;
  showTotalRow: boolean;
}
```

**shadcn components:** `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `Badge`, `Skeleton` (loading state).

**Glassmorphism tokens:**
```css
/* Table container */
.view-table {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  overflow: hidden;
}

/* Table header */
.view-table thead {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* Table header cell */
.view-table th {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  text-transform: none;
  letter-spacing: 0;
  padding: 10px 12px;
}

/* Row hover */
.view-table tr:hover {
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
}

/* Clickable row indicator */
.view-table tr:hover td:first-child::before {
  content: "";
  position: absolute;
  left: 0;
  top: 25%;
  height: 50%;
  width: 2px;
  background: rgba(100, 149, 237, 0.6);
  border-radius: 1px;
}

/* Total row */
.view-table .total-row {
  background: rgba(255, 255, 255, 0.04);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-weight: 600;
}

/* Change indicators */
.change-positive {
  color: rgba(100, 149, 237, 0.9);     /* Cornflower for positive */
}

.change-negative {
  color: hsl(0, 62.8%, 50%);            /* Destructive red */
}

.change-neutral {
  color: rgba(255, 255, 255, 0.35);
}
```

**File:** `src/components/dashboard/view-summary-table.tsx`

---

### 5.5 DetailPanel

**Responsibility:** Slide-in panel showing drill-down detail for a selected row.

```typescript
interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entity: DrillDownEntity | null;
  view: ViewType;
}

interface DrillDownEntity {
  type: "country" | "medium" | "goal" | "creative";
  primaryKey: string;          // e.g., "봄툰KR"
  secondaryKey?: string;       // e.g., "YouTube" for medium view
  currentPeriodData: ViewSummaryRow;
  trendData: TrendPoint[];     // Last 4 weeks/months
  breakdownData: BreakdownItem[];
}

interface TrendPoint {
  period: string;              // Week or month label
  adSpend: number;
  revenue: number;
  roas: number;
  signups: number;
}

interface BreakdownItem {
  dimension: string;           // Medium name, goal name, etc.
  adSpend: number;
  revenue: number;
  roas: number;
}
```

**shadcn components:** `Sheet` (side panel), `SheetContent`, `SheetHeader`, `Card`, `CardContent`.

**Glassmorphism tokens:**
```css
/* Panel backdrop */
.detail-panel-overlay {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

/* Panel itself */
.detail-panel {
  background: rgba(10, 10, 10, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px);
  width: 400px;
}

/* Panel header */
.detail-panel-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 20px 24px;
}

/* Entity name */
.detail-panel-title {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

/* Period subtitle */
.detail-panel-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 4px;
}

/* Mini KPI cards inside panel */
.detail-kpi {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
}
```

**Animation:**
```css
/* Panel enter */
@keyframes panel-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0.8;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Panel exit */
@keyframes panel-slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0.8;
  }
}

.detail-panel[data-state="open"] {
  animation: panel-slide-in 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.detail-panel[data-state="closed"] {
  animation: panel-slide-out 200ms cubic-bezier(0.4, 0, 1, 1) forwards;
}
```

**File:** `src/components/dashboard/detail-panel.tsx`

---

### 5.6 CreativeEfficiencyView

**Responsibility:** Specialized layout for the creative performance view with two ranked sections.

```typescript
interface CreativeEfficiencyViewProps {
  roasTopCreatives: CreativeRow[];
  cpaTopCreatives: CreativeRow[];
  isLoading: boolean;
  onCreativeClick: (creative: CreativeRow) => void;
}

interface CreativeRow {
  rank: number;
  country: string;
  creativeName: string;
  adSpend: number;
  revenue?: number;
  roas?: number;
  conversions?: number;
  signups?: number;
  signupCpa?: number;
}
```

**shadcn components:** `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Table`, `Badge`, `Button`.

**File:** `src/components/dashboard/creative-efficiency-view.tsx`

---

### 5.7 QueryViewShell

**Responsibility:** Orchestrates the entire query view system. Manages view state, period state, and coordinates data fetching.

```typescript
interface QueryViewShellProps {
  initialData: AdRow[];
  filterOptions: FilterOptions;
  availableWeeks: WeekOption[];
  availableMonths: MonthOption[];
}

// Internal state managed by this component:
interface QueryViewState {
  activeView: ViewType;
  selectedWeek: string;
  selectedMonth: string;
  filters: DashboardFilters;     // Country, medium, goal (not period)
  detailPanel: {
    isOpen: boolean;
    entity: DrillDownEntity | null;
  };
}
```

**This component replaces** the current `DashboardShell` for the query views experience. The existing `DashboardShell` remains for the general dashboard overview.

**Data flow:**
```
QueryViewShell (state owner)
  |
  +-- ViewTabBar (view selection)
  |
  +-- PeriodBar (WeekPicker or MonthPicker based on view)
  |
  +-- FilterBar (country, medium, goal — existing component, adapted)
  |
  +-- ViewContent (switches layout based on activeView)
  |     |
  |     +-- KpiCards (top summary)
  |     +-- ViewCharts (view-specific charts)
  |     +-- ViewSummaryTable (view-specific table)
  |     +-- OR CreativeEfficiencyView (for creative tab)
  |
  +-- DetailPanel (slide-in, conditional)
```

**File:** `src/components/dashboard/query-view-shell.tsx`

---

## 6. Component Tree

```
dashboard/page.tsx (Server Component)
  |
  +-- DashboardLayout
  |     +-- DashboardSidebar (existing, unchanged)
  |     +-- SidebarInset
  |
  +-- QueryViewShell (Client Component, "use client")
        |
        +-- <header>
        |     +-- ViewTabBar
        |     +-- PeriodBar
        |     |     +-- WeekPicker (when weekly view active)
        |     |     +-- MonthPicker (when monthly view active)
        |     +-- FilterBar (adapted from existing)
        |     +-- FilterSummary + CopyLink + CSVExport
        |
        +-- <main>
        |     +-- KpiCards (existing, with WoW/MoM data)
        |     +-- ViewCharts (view-specific, wraps existing chart components)
        |     |     +-- RoasBarChart / StackedBarChart / ScatterPlot / AreaChart
        |     +-- ViewSummaryTable
        |     |     OR
        |     +-- CreativeEfficiencyView (for creative tab)
        |     |     OR
        |     +-- RawMasterTable (for master tab, extended DataTable)
        |
        +-- DetailPanel (Sheet, slides from right)
              +-- DetailHeader (entity name + period)
              +-- DetailKpis (2x2 mini cards)
              +-- DetailTrendChart (mini area chart, 4 periods)
              +-- DetailBreakdown (mini table)
              +-- "전체 보기" link
```

---

## 7. Animation Behaviors

### 7.1 Tab Switching

**Active indicator movement:**
- The cornflower underline slides horizontally to the new tab position
- Duration: 250ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like)

**Content transition:**
- Outgoing content fades out: 150ms, `ease-out`
- Incoming content fades in + slides up 8px: 200ms, `ease-out`, 50ms delay
- This creates a subtle "refresh" feel without being disorienting

```css
@keyframes view-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes view-exit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.view-content-enter {
  animation: view-enter 200ms ease-out 50ms both;
}

.view-content-exit {
  animation: view-exit 150ms ease-out both;
}
```

### 7.2 Week/Month Stepper

**Arrow press:**
- Number/label transition: 120ms crossfade
- Direction-aware: moving forward slides left, moving backward slides right
- Subtle scale pulse on the period label: 1.0 -> 1.02 -> 1.0 over 200ms

```css
@keyframes period-change-forward {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes period-change-backward {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### 7.3 Table Row Hover

- Row background transition: 150ms ease
- Left cornflower indicator appears: 200ms, slides down from center

### 7.4 Detail Panel

- As specified in section 5.5
- Panel content staggers in: header (0ms), KPIs (100ms), chart (200ms), breakdown (300ms)
- Each element uses `fade-in-up` with 8px translateY

### 7.5 Data Loading

- Skeleton shimmer on all data areas during fetch
- When data arrives: staggered fade-in for KPI cards (50ms intervals), then chart (100ms after last card), then table (100ms after chart)

```css
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.03) 25%,
    rgba(255,255,255,0.06) 50%,
    rgba(255,255,255,0.03) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}
```

---

## 8. URL State Encoding

All view state is encoded in the URL for sharing:

```
/dashboard?view=weekly-locale&week=2026-W12&c=봄툰KR,US&m=Meta&g=결제
```

| Param | Description | Default |
|-------|-------------|---------|
| `view` | Active view tab | `weekly-locale` |
| `week` | Selected week (ISO week) | Latest complete week |
| `month` | Selected month (YYYY-MM) | Latest complete month |
| `c` | Country filter (comma-separated) | Empty (all) |
| `m` | Medium filter | Empty (all) |
| `g` | Goal filter | Empty (all) |
| `detail` | Open detail panel entity | Empty (closed) |

This allows planners to share exact views via Slack/email with one link.

---

## 9. Responsive Behavior Summary

### Desktop (1024px+)

```
+--sidebar--+---------------------------------------------+
|            | [Tab1] [Tab2] [Tab3] | [Tab4] | [Tab5] [6] |
| AdInsight  |----------------------------------------------|
|            | [<] 3월 3주차 [>] [v]                        |
| Overview * | [국가] [매체] [목표] [초기화] [링크] [CSV]    |
| Countries  |----------------------------------------------|
| Media      | [KPI] [KPI] [KPI] [KPI]                      |
| Reports    |----------------------------------------------|
|            | [Chart Left 60%] [Chart Right 40%]           |
| ----       |----------------------------------------------|
| Settings   | [Summary Table with all columns]             |
|            |                                              |
+------------+----------------------------------------------+
```

### Tablet (768px-1023px)

- Sidebar collapsed (offcanvas toggle)
- Tab bar horizontally scrollable
- Charts stack vertically (100% width each)
- Table hides comparison columns by default (toggle to show)

### Mobile (<768px)

- Sidebar hidden (hamburger menu)
- Tab bar: horizontal scroll with pill style
- Period picker: full width, dropdown only (no stepper arrows)
- Filters: stacked vertically
- Charts: single column, reduced height
- Table: horizontal scroll with frozen first column (country)
- Detail panel: bottom sheet (slides up from bottom, 80% height)

---

## 10. Accessibility Considerations

| Element | ARIA Pattern | Keyboard |
|---------|-------------|----------|
| ViewTabBar | `role="tablist"`, `role="tab"`, `aria-selected` | Arrow keys to navigate tabs, Enter to select |
| WeekPicker stepper | `aria-label="이전 주"` / `"다음 주"` | Left/Right arrows when focused |
| WeekPicker dropdown | `role="listbox"`, `role="option"`, `aria-selected` | Up/Down arrows, Enter to select |
| ViewSummaryTable | `role="grid"`, sortable headers with `aria-sort` | Arrow keys for cell navigation |
| Table rows | `role="row"` with `aria-expanded` when detail open | Enter to open detail panel |
| DetailPanel | `role="complementary"`, `aria-label="상세 정보"` | Escape to close, Tab trapping inside |
| Change indicators | `aria-label="전주 대비 8.5% 감소"` (screen reader text) | - |
| Loading states | `aria-busy="true"` on containers, `aria-live="polite"` for updates | - |

---

## 11. Implementation Priority

### Phase 1: Core Navigation (Priority: Critical)

1. `ViewTabBar` — 6 tabs with active state and URL sync
2. `WeekPicker` — Week selection with stepper and dropdown
3. `MonthPicker` — Month selection (simpler version of WeekPicker)
4. `QueryViewShell` — Orchestrator replacing/extending DashboardShell
5. URL state encoding for view + period

### Phase 2: View-Specific Tables (Priority: High)

6. `ViewSummaryTable` — Configurable table with column configs per view
7. WoW/MoM comparison computation logic
8. Total row computation
9. Row grouping for medium/goal views
10. `CreativeEfficiencyView` — Two-section creative ranking layout

### Phase 3: Drill-Down (Priority: Medium)

11. `DetailPanel` — Slide-in side panel using shadcn Sheet
12. Detail panel content (KPIs, mini chart, breakdown)
13. Chart click-to-drill integration

### Phase 4: Polish (Priority: Low)

14. Tab switching animations
15. Period stepper animations
16. Staggered loading animations
17. Mobile responsive refinements
18. CSV export per view

---

## 12. New Files Summary

```
src/components/dashboard/
  view-tab-bar.tsx              # Tab navigation for 6 views
  week-picker.tsx               # Week stepper + dropdown
  month-picker.tsx              # Month stepper + dropdown
  period-bar.tsx                # Wrapper: renders WeekPicker or MonthPicker
  view-summary-table.tsx        # Configurable table per view
  creative-efficiency-view.tsx  # Two-section creative ranking
  detail-panel.tsx              # Slide-in drill-down panel
  detail-panel-content.tsx      # Panel interior (KPIs, chart, breakdown)
  query-view-shell.tsx          # Orchestrator component (replaces DashboardShell for views)
  raw-master-table.tsx          # Extended table for raw data view

src/lib/
  week-utils.ts                 # ISO week computation, week label formatting
  view-aggregation.ts           # GROUP BY logic per view type
  comparison-utils.ts           # WoW/MoM change computation

src/types/
  query-views.ts                # ViewType, WeekOption, MonthOption, ViewSummaryRow, etc.
```

---

## 13. Migration Path from Current DashboardShell

The current `DashboardShell` handles a flat filter + KPI + chart + table layout. The migration is additive, not destructive:

1. **Keep** `DashboardShell` as-is for backward compatibility
2. **Create** `QueryViewShell` as the new default on `/dashboard`
3. `QueryViewShell` internally reuses: `FilterBar` (adapted), `KpiCards` (with WoW/MoM), `ChartSection` (extended)
4. The existing `DashboardFilters` type gains optional `view` and `week`/`month` fields
5. The `/api/dashboard` endpoint gains `?groupBy=` and `?week=` parameters to support view-specific aggregation

This ensures zero regression risk: if the new views break, the old dashboard still works at a fallback route.
