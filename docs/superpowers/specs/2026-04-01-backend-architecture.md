# AdInsight Backend Architecture Specification

> Author: Backend Architect Agent
> Date: 2026-04-01
> Status: Design Phase (pre-implementation)
> Depends on: `supabase/schema.sql`, `2026-04-01-sheets-data-scan.md`, `2026-04-01-dashboard-component-spec.md`

---

## 1. File Structure

```
src/
├── app/
│   └── api/
│       ├── auth/
│       │   └── route.ts              # (existing) Local user auth
│       ├── sync/
│       │   └── route.ts              # POST — trigger Google Sheets sync
│       ├── dashboard/
│       │   └── route.ts              # GET — filtered ad data for dashboard
│       ├── filters/
│       │   └── route.ts              # GET — distinct filter options
│       ├── presets/
│       │   └── route.ts              # GET/POST — saved filter presets
│       └── export/
│           └── route.ts              # GET — CSV export of filtered data
├── lib/
│   ├── supabase.ts                   # (existing) Anon client for reads
│   ├── supabase-admin.ts             # NEW — Service role client for writes
│   ├── sheets-client.ts              # NEW — Google Sheets API authenticated client
│   ├── sheets-sync.ts                # NEW — Sync pipeline: Sheets → ad_raw
│   ├── sheets-parser.ts              # NEW — Per-sheet header parsing + row normalization
│   ├── dashboard-queries.ts          # NEW — Supabase query builder for dashboard
│   └── filter-presets.ts             # NEW — Preset CRUD + URL encoding
└── types/
    ├── dashboard.ts                  # (from frontend spec) AdRow, DashboardFilters, KpiSummary
    └── sync.ts                       # NEW — SyncResult, SheetSource, RawRow types
```

---

## 2. Environment Variables

```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=https://sevvypxiyqhnvgdzdghz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Required — user must add
SUPABASE_SERVICE_ROLE_KEY=           # From Supabase dashboard > Settings > API > service_role
SYNC_API_SECRET=                     # Random 32+ char string for sync endpoint auth
GOOGLE_SERVICE_ACCOUNT_PATH=credentials/service-account.json   # Path to GCP SA key
```

The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and is required for all write operations (sync pipeline, sync log updates). It must never be exposed to the client. The `SYNC_API_SECRET` protects the sync endpoint from unauthorized triggers.

---

## 3. Module Specifications

### 3.1 `src/lib/supabase-admin.ts` — Service Role Client

**Responsibility**: Provides a Supabase client authenticated with the `service_role` key. This client bypasses Row Level Security and is used exclusively in server-side code (API routes, sync pipeline). It must never be imported from client components.

```ts
// Function signatures

export function createAdminClient(): SupabaseClient
// Returns a Supabase client configured with SUPABASE_SERVICE_ROLE_KEY.
// Throws if SUPABASE_SERVICE_ROLE_KEY is not set.
// The client is NOT cached as a singleton — each call creates a fresh instance
// to avoid stale connections in serverless environments.
```

**Security constraints**:
- File includes a top-of-file comment: `// SERVER ONLY — never import from client components`
- Throws a descriptive error if the env var is missing, rather than silently falling back to anon key

---

### 3.2 `src/lib/sheets-client.ts` — Google Sheets API Client

**Responsibility**: Authenticates with Google Sheets API using the service account JSON and provides a thin wrapper for reading sheet data.

```ts
// Types

interface SheetReadOptions {
  spreadsheetId: string;
  tabName: string;
  range?: string;          // A1 notation, e.g. "A1:Q5000". Default: entire tab.
}

interface SheetReadResult {
  values: string[][];      // 2D array of cell values (all strings from Sheets API)
  totalRows: number;
}

// Function signatures

export async function createSheetsClient(): Promise<sheets_v4.Sheets>
// Reads credentials/service-account.json, creates a JWT auth client scoped to
// https://www.googleapis.com/auth/spreadsheets.readonly, returns authenticated
// google.sheets({ version: 'v4' }) instance.
// Throws SheetsAuthError if credentials file is missing or malformed.

export async function readSheet(options: SheetReadOptions): Promise<SheetReadResult>
// Reads all cell values from the specified sheet tab.
// Uses spreadsheets.values.get with valueRenderOption: 'UNFORMATTED_VALUE'
// for numeric precision, and dateTimeRenderOption: 'FORMATTED_STRING' for dates.
// Returns empty result (not error) for empty sheets.
// Throws SheetsReadError with sheet name context on API failure.
```

**Design decisions**:
- `UNFORMATTED_VALUE` render option ensures numbers come back as numbers, not locale-formatted strings with commas
- Service account JSON path is read from `GOOGLE_SERVICE_ACCOUNT_PATH` env var with fallback to `credentials/service-account.json`
- The Sheets API client is created per-call (not cached) since API route functions run in short-lived serverless contexts

---

### 3.3 `src/lib/sheets-parser.ts` — Header Parsing and Row Normalization

**Responsibility**: Handles the per-sheet structural differences documented in the data scan. Parses header rows, maps column positions to canonical field names, and normalizes each data row into an `AdRawInsert` record.

```ts
// Types

interface ColumnMapping {
  month_raw: number;           // column index for 월별
  date_raw: number;            // column index for 일자
  medium_raw: number;          // column index for 매체
  goal_raw: number;            // column index for 목표
  creative_type_raw: number;   // column index for 소재종류
  creative_name: number;       // column index for 소재 (작품명)
  ad_spend_local: number;      // column index for 광고비 / 광고비(USD) / 광고비(유로)
  ad_spend_krw: number;        // column index for 원화 / 광고비(KRW)
  impressions: number;
  clicks: number;
  ctr_raw: number;
  signups: number;
  signup_cpa_raw: number;
  conversions: number;
  revenue_local: number;       // column index for 결제금액 / 결제금액(USD)
  revenue_krw: number | null;  // column index for 결제금액(KRW) / 결제금액 원화 (null if same as revenue_local)
  roas_raw: number;
}

interface AdRawInsert {
  sheet_source_id: number;
  sheet_row_number: number;
  month_raw: string | null;
  date_raw: string | null;
  medium_raw: string | null;
  goal_raw: string | null;
  creative_type_raw: string | null;
  creative_name: string | null;
  ad_spend_local: number | null;
  ad_spend_krw: number | null;
  revenue_local: number | null;
  revenue_krw: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr_raw: number | null;
  signups: number | null;
  signup_cpa_raw: number | null;
  conversions: number | null;
  roas_raw: number | null;
  sync_run_id: number;
}

// Function signatures

export function parseHeaders(headerRow: string[], sheetName: string): ColumnMapping
// Given a header row from the sheet, identifies each column's position by matching
// against known header patterns. Uses fuzzy matching for known variations:
//
// Header matching rules (order of precedence):
//   "광고비(USD)" | "광고비(유로)" | "광고비"  → ad_spend_local
//   "광고비(KRW)" | "원화"                     → ad_spend_krw
//   "결제금액(USD)" | "결제금액"                → revenue_local
//   "결제금액(KRW)" | "결제금액 원화"           → revenue_krw
//
// Special handling:
//   - For KR sheets (광고비 + 원화): ad_spend_local = 광고비 col, ad_spend_krw = 원화 col
//   - For US sheet: ad_spend_local = 광고비(USD), ad_spend_krw = 광고비(KRW),
//                   revenue_local = 결제금액(USD), revenue_krw = 결제금액(KRW)
//   - For DE sheet: 광고비(유로) maps to ad_spend_local
//   - For FR sheet: 결제금액 원화 maps to revenue_krw (extra column)
//
// Throws HeaderParseError if any required column (month, date, medium) is not found.
// Logs warnings (does not throw) for missing optional columns (revenue_krw).

export function parseRow(
  row: (string | number)[],
  mapping: ColumnMapping,
  sheetSourceId: number,
  rowNumber: number,
  syncRunId: number,
): AdRawInsert | null
// Extracts values from a single sheet row using the column mapping.
// Returns null for completely empty rows (all cells empty/null).
//
// Numeric parsing:
//   - Strips commas and whitespace from number strings
//   - Handles Korean-style numbers ("1,234,567")
//   - CTR: if value > 1, assumes it is already a percentage (e.g. 3.5 = 3.5%)
//          if value <= 1, assumes it is a ratio (e.g. 0.035 = 3.5%) — stores as-is
//   - ROAS: same logic as CTR
//   - Returns null (not 0) for empty or non-parseable numeric cells
//
// Date parsing:
//   - Passes date_raw as-is (string). The ad_normalized view handles date casting.
//
// Month normalization at ingest:
//   - "2026년 1월" → "2026-01" (done here, not deferred to the view)
//   - "2026-01" → "2026-01" (passthrough)
//   - This duplicates the view logic intentionally so that ad_raw.month_raw
//     is always in YYYY-MM format, simplifying direct queries on ad_raw.

export function isEmptyRow(row: (string | number)[]): boolean
// Returns true if all cells in the row are empty, null, undefined, or whitespace-only.
// Used to skip blank rows that exist between data sections in some sheets.
```

**Why a separate parser module**: The header-to-column mapping logic is the most complex and error-prone part of the sync pipeline. Isolating it makes it independently testable. Each sheet's quirks are handled by `parseHeaders` pattern matching, not by per-sheet config files, keeping the system extensible when new sheets are added.

---

### 3.4 `src/lib/sheets-sync.ts` — Sync Pipeline

**Responsibility**: Orchestrates the full sync cycle: read sheet sources from Supabase, fetch each sheet from Google Sheets API, parse and normalize rows, upsert into `ad_raw`, and log results to `sheet_sync_log`.

```ts
// Types

interface SyncOptions {
  sheetSourceIds?: number[];   // If provided, sync only these sheets. If omitted, sync all active sheets.
  dryRun?: boolean;            // If true, parse but do not write to Supabase. Returns parsed rows.
}

interface SheetSyncResult {
  sheetSourceId: number;
  sheetName: string;
  status: 'success' | 'failed' | 'partial';
  rowsFetched: number;
  rowsUpserted: number;
  rowsSkipped: number;
  durationMs: number;
  error?: string;
}

interface SyncRunResult {
  totalSheets: number;
  successful: number;
  failed: number;
  partial: number;
  results: SheetSyncResult[];
  totalDurationMs: number;
}

// Function signatures

export async function syncAllSheets(options?: SyncOptions): Promise<SyncRunResult>
// Main entry point. Steps:
//
// 1. Query sheet_source table for active sheets (or filter by sheetSourceIds).
// 2. For each sheet (sequentially to respect Google API rate limits):
//    a. Insert a sheet_sync_log row with status='running'.
//    b. Call readSheet() to fetch raw data.
//    c. Extract the header row (at position sheet_source.header_row - 1, 0-indexed).
//    d. Call parseHeaders() to build column mapping.
//    e. Iterate data rows (header_row onward), call parseRow() for each.
//    f. Batch upsert parsed rows into ad_raw (batches of 500).
//    g. Update sheet_sync_log with final status, row counts, and finished_at.
// 3. Return aggregated SyncRunResult.
//
// Error handling:
//   - If readSheet() fails for a sheet, mark that sheet as 'failed' and continue.
//   - If parseHeaders() fails, mark as 'failed' and continue.
//   - If individual rows fail to parse, skip them (increment rowsSkipped).
//   - If upsert batch partially fails, mark as 'partial'.
//   - The overall sync never throws — all errors are captured in results.

export async function syncSingleSheet(
  sheetSource: SheetSource,
  syncRunId: number,
  dryRun?: boolean,
): Promise<SheetSyncResult>
// Syncs a single sheet. Called by syncAllSheets for each sheet.
// Separated for testability and for the API to trigger single-sheet syncs.

async function upsertBatch(
  adminClient: SupabaseClient,
  rows: AdRawInsert[],
): Promise<{ upserted: number; errors: string[] }>
// Upserts a batch of rows into ad_raw using Supabase's .upsert() with
// onConflict: 'sheet_source_id,sheet_row_number'.
// Returns count of successfully upserted rows and any error messages.
// Batch size: 500 rows per upsert call (Supabase recommended limit).
```

**Sequential processing rationale**: Google Sheets API has a default quota of 60 requests per minute per user. With 8 sheets, sequential processing with one request per sheet stays well within limits. Parallel processing would offer minimal time savings (each sheet read takes ~1-3s) while risking quota exhaustion.

**Upsert strategy**: Using the `(sheet_source_id, sheet_row_number)` unique constraint as the conflict target means re-syncing the same sheet overwrites stale data without creating duplicates. Row numbers are stable because sheets are append-only in practice.

---

### 3.5 `src/lib/dashboard-queries.ts` — Dashboard Query Builder

**Responsibility**: Constructs Supabase queries against the `ad_normalized` view with filter parameters. Returns data shaped for the frontend `AdRow` interface.

```ts
// Types (imported from types/dashboard.ts)

import type { AdRow, DashboardFilters, KpiSummary } from '@/types/dashboard';

// Function signatures

export async function queryDashboardData(
  filters: DashboardFilters,
): Promise<{ data: AdRow[]; meta: QueryMeta }>
// Queries ad_normalized view with the given filters.
// Uses the anon Supabase client (reads only, RLS allows public read).
//
// Query construction:
//   let query = supabase.from('ad_normalized').select('*');
//   if (filters.countries.length > 0)
//     query = query.in('country_code', countryCodeMap(filters.countries));
//     // "레진 KR" maps to sheet_source.name, need to filter by sheet_name
//   if (filters.months.length > 0)
//     query = query.in('month', filters.months);
//   if (filters.mediums.length > 0)
//     query = query.in('medium', filters.mediums);
//   if (filters.goals.length > 0)
//     query = query.in('goal', filters.goals);
//
// Field mapping (ad_normalized → AdRow):
//   id             → id (string cast)
//   sheet_name     → country (e.g. "레진 KR", "US")
//   month          → month
//   ad_date        → date (ISO string)
//   medium         → medium
//   goal           → goal
//   creative_type  → creativeType
//   creative_name  → creativeName
//   ad_spend_krw   → adSpend
//   ad_spend_local → adSpendLocal
//   currency_local → currency
//   impressions    → impressions
//   clicks         → clicks
//   ctr            → ctr
//   signups        → signups
//   signup_cpa     → signupCpa
//   conversions    → conversions
//   revenue_krw    → revenue (fallback to revenue_local if null)
//   roas           → roas
//
// Returns empty data array (not error) when no rows match filters.
// Throws QueryError on Supabase client errors.

export async function queryKpiSummary(
  filters: DashboardFilters,
): Promise<KpiSummary>
// Computes KPI summary by querying ad_normalized with aggregation.
// Since Supabase JS client does not support server-side aggregation natively,
// this function uses an RPC call to a Supabase database function.
//
// Alternative approach (if RPC is not set up):
//   Fetch all filtered rows via queryDashboardData() and compute aggregates
//   in JavaScript. Acceptable for the current data volume (~8,000 rows total).
//
// Aggregation logic:
//   adSpend   = SUM(ad_spend_krw) for current period
//   revenue   = SUM(revenue_krw) for current period
//   roas      = revenue / adSpend (avoid division by zero)
//   signups   = SUM(signups) for current period
//
// MoM change calculation:
//   - Determine "current month" = max(filters.months) or latest month in data
//   - Determine "previous month" = current month - 1
//   - Query both months' aggregates
//   - change = ((current - previous) / previous) * 100
//   - Return 0 if previous period has no data

export async function queryFilterOptions(): Promise<{
  countries: string[];
  months: string[];
  mediums: string[];
  goals: string[];
}>
// Queries distinct values from ad_normalized for each filter dimension.
// Uses separate queries for each dimension (4 parallel queries).
//
// Implementation:
//   const [countries, months, mediums, goals] = await Promise.all([
//     supabase.from('ad_normalized').select('sheet_name').then(distinct),
//     supabase.from('ad_normalized').select('month').then(distinct),
//     supabase.from('ad_normalized').select('medium').then(distinct),
//     supabase.from('ad_normalized').select('goal').then(distinct),
//   ]);
//
// Filters out 'none' values from mediums and goals.
// Sorts months chronologically, countries alphabetically.
// Returns empty arrays (not error) if ad_normalized has no data.
```

**Why client-side aggregation for KPIs**: The total data volume is approximately 7,800 rows across 8 sheets. Fetching all filtered rows and computing sums in JavaScript adds negligible overhead compared to the network round-trip. This avoids requiring a Supabase database function for v1. If data grows past 50,000 rows, migrate to an RPC-based aggregation function.

---

### 3.6 `src/lib/filter-presets.ts` — Filter Preset System

**Responsibility**: Manages saved filter presets, URL-based filter sharing, and human-readable filter descriptions.

```ts
// Types

interface FilterPreset {
  id: string;                  // UUID
  name: string;                // User-defined name, e.g. "KR Meta 3월 결제"
  filters: DashboardFilters;
  description: string;         // Auto-generated Korean description
  createdBy: string;           // User name from auth
  createdAt: string;           // ISO timestamp
}

// Function signatures

export function filtersToSearchParams(filters: DashboardFilters): URLSearchParams
// Encodes filter state into URL search params.
// Format:
//   ?countries=레진+KR,US&months=2026-01,2026-02&mediums=Meta&goals=결제
// Empty arrays are omitted (meaning "all").
// Values are comma-separated within each param.
// Uses encodeURIComponent for Korean characters.

export function searchParamsToFilters(params: URLSearchParams): DashboardFilters
// Decodes URL search params back into DashboardFilters.
// Missing params default to empty arrays (= "all").
// Invalid values are silently dropped (no error thrown).

export function generateFilterDescription(filters: DashboardFilters): string
// Generates a natural-language Korean description of the active filters.
// Examples:
//   { countries: ["US", "DE"], months: ["2026-01", "2026-02", "2026-03"], mediums: ["Meta"], goals: [] }
//   → "US, DE / 2026년 1분기 / Meta / 전체 목표"
//
//   { countries: [], months: ["2026-03"], mediums: [], goals: ["결제"] }
//   → "전체 국가 / 2026년 3월 / 전체 매체 / 결제 목표"
//
// Quarter detection:
//   If months = [01,02,03] → "1분기"
//   If months = [01,02,03,04] → "1~4월" (no quarter label for non-standard ranges)
//   Single month → "3월"

export async function savePreset(preset: Omit<FilterPreset, 'id' | 'createdAt'>): Promise<FilterPreset>
// Saves a new filter preset. For v1, presets are stored in localStorage on the client.
// Future: migrate to a Supabase `filter_presets` table when multi-user sharing is needed.

export async function loadPresets(): Promise<FilterPreset[]>
// Loads all saved presets. For v1, reads from localStorage.

export async function deletePreset(id: string): Promise<void>
// Deletes a preset by ID.
```

**v1 storage decision**: Filter presets are stored in the browser's `localStorage` rather than a database table. Rationale: the initial user base is a small team of brand planners who each work on their own machines. URL sharing covers the cross-user use case (copy the URL with encoded filters). If the team requests persistent server-side presets, add a `filter_presets` table to Supabase.

---

## 4. API Route Specifications

### 4.1 `POST /api/sync`

**File**: `src/app/api/sync/route.ts`

**Purpose**: Triggers Google Sheets to Supabase sync. Protected endpoint.

**Authentication**: Requires `Authorization: Bearer <SYNC_API_SECRET>` header. Returns 401 if missing or incorrect.

**Request body** (optional):
```ts
{
  sheetSourceIds?: number[];   // Sync specific sheets. Omit for all active sheets.
  dryRun?: boolean;            // Parse only, do not write.
}
```

**Response (200)**:
```ts
{
  success: true;
  result: SyncRunResult;       // See sheets-sync.ts types
}
```

**Response (401)**:
```ts
{ error: "Unauthorized", message: "Invalid or missing API secret" }
```

**Response (500)**:
```ts
{ error: "SyncFailed", message: string, partialResult?: SyncRunResult }
```

**Implementation outline**:
```
1. Validate Authorization header against SYNC_API_SECRET
2. Parse request body (default: all sheets, dryRun=false)
3. Call syncAllSheets(options)
4. Return result with appropriate status code:
   - 200 if all sheets succeeded
   - 207 (Multi-Status) if some sheets failed (partial success)
   - 500 if all sheets failed
```

**Invocation patterns**:
- Manual: `curl -X POST https://adinsight.vercel.app/api/sync -H "Authorization: Bearer $SECRET"`
- Scheduled: Vercel Cron Job (see section 7)
- Single sheet: `curl -X POST ... -d '{"sheetSourceIds": [3]}'` (sync US sheet only)

---

### 4.2 `GET /api/dashboard`

**File**: `src/app/api/dashboard/route.ts`

**Purpose**: Returns filtered ad data for the dashboard. Public endpoint (data is not sensitive).

**Query parameters**:
```
?countries=레진+KR,US          # comma-separated, URL-encoded
&months=2026-01,2026-02        # comma-separated
&mediums=Meta,TikTok           # comma-separated
&goals=결제,가입               # comma-separated
```

All parameters are optional. Omitting a parameter means "all values" (no filter).

**Response (200)**:
```ts
{
  data: AdRow[];                // Array of normalized ad rows
  meta: {
    totalRows: number;
    countries: string[];        // Distinct values in the returned data
    months: string[];
    mediums: string[];
    goals: string[];
    queriedAt: string;          // ISO timestamp
  };
}
```

**Response (400)**:
```ts
{ error: "InvalidParams", message: "Invalid month format: '2026-13'" }
```

**Implementation outline**:
```
1. Parse and validate query parameters
   - months: must match YYYY-MM format
   - countries/mediums/goals: validated against known values (warn but don't reject unknowns)
2. Construct DashboardFilters from params
3. Call queryDashboardData(filters)
4. Transform Supabase rows to AdRow[] (field name mapping, type coercion)
5. Compute meta (distinct values from returned data)
6. Return JSON response with Cache-Control: s-maxage=300 (5 min CDN cache)
```

**Caching strategy**: Responses are cached at the CDN edge for 5 minutes (`Cache-Control: public, s-maxage=300, stale-while-revalidate=60`). This is appropriate because sheet data changes at most once per day. The sync endpoint can optionally purge the cache via Vercel's API after a successful sync.

---

### 4.3 `GET /api/filters`

**File**: `src/app/api/filters/route.ts`

**Purpose**: Returns distinct filter options for populating dropdown menus.

**Query parameters**: None.

**Response (200)**:
```ts
{
  countries: string[];          // ["레진 KR", "봄툰 KR", "US", "DE", "FR", "TH", "TW", "ES"]
  months: string[];             // ["2026-01", "2026-02", "2026-03", "2026-04"] (sorted)
  mediums: string[];            // ["Meta", "YouTube", "Google GDN", ...] (excludes "none")
  goals: string[];              // ["결제", "첫결제", "가입", "가입&결제"] (excludes "none")
}
```

**Implementation outline**:
```
1. Call queryFilterOptions()
2. Return JSON with Cache-Control: s-maxage=3600 (1 hour CDN cache)
```

**Caching**: Filter options change only when new data is synced. 1-hour cache is conservative.

---

### 4.4 `GET /api/export`

**File**: `src/app/api/export/route.ts`

**Purpose**: Exports filtered dashboard data as a CSV file download.

**Query parameters**: Same as `/api/dashboard` (countries, months, mediums, goals).

**Response (200)**:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="adinsight-export-2026-04-01.csv"

국가,월,일자,매체,목표,소재종류,소재(작품명),광고비(KRW),광고비(현지),통화,노출수,클릭,CTR,회원가입,가입CPA,결제전환,결제금액(KRW),ROAS
레진 KR,2026-01,2026-01-15,Meta,결제,영상(한익게),Mr.A'sFarm,1500000,1500000,KRW,45000,1200,2.67,15,100000,8,3200000,213.33
...
```

**Implementation outline**:
```
1. Parse and validate query parameters (same as /api/dashboard)
2. Call queryDashboardData(filters)
3. Generate CSV with BOM (UTF-8 BOM for Excel Korean character support)
4. Set filename with current date
5. Return CSV response with appropriate headers
```

**CSV encoding**: Prepend `\uFEFF` (UTF-8 BOM) so Microsoft Excel correctly detects Korean characters.

---

### 4.5 `GET/POST /api/presets`

**File**: `src/app/api/presets/route.ts`

**Purpose**: Server-side preset storage (future). For v1, presets live in `localStorage` and this route is not implemented. Documented here for future reference.

**GET response**: `{ presets: FilterPreset[] }`

**POST body**: `{ name: string, filters: DashboardFilters }`

**POST response**: `{ preset: FilterPreset }`

This route would require a `filter_presets` table in Supabase:

```sql
-- Future: add when multi-user preset sharing is needed
create table if not exists public.filter_presets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  filters     jsonb not null,
  description text,
  created_by  text not null,
  created_at  timestamptz default now()
);
```

---

## 5. Data Flow Diagrams

### 5.1 Sync Pipeline (Google Sheets to Supabase)

```
┌─────────────────┐
│   POST /api/sync │ ◄── Vercel Cron (daily) or manual trigger
│   (auth check)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  sheets-sync.ts          │
│  syncAllSheets()         │
│                          │
│  1. Query sheet_source   │ ──► Supabase (read active sheets)
│     table for active     │
│     sheets               │
│                          │
│  2. For each sheet:      │
│     ┌──────────────────┐ │
│     │ Insert sync_log   │ │ ──► Supabase (insert running log)
│     │ (status=running)  │ │
│     └────────┬─────────┘ │
│              ▼           │
│     ┌──────────────────┐ │
│     │ readSheet()       │ │ ──► Google Sheets API (fetch raw cells)
│     │ sheets-client.ts  │ │
│     └────────┬─────────┘ │
│              ▼           │
│     ┌──────────────────┐ │
│     │ parseHeaders()    │ │     Pure function (no I/O)
│     │ sheets-parser.ts  │ │
│     └────────┬─────────┘ │
│              ▼           │
│     ┌──────────────────┐ │
│     │ parseRow() x N    │ │     Pure function (no I/O)
│     │ (skip empty rows) │ │
│     └────────┬─────────┘ │
│              ▼           │
│     ┌──────────────────┐ │
│     │ upsertBatch()     │ │ ──► Supabase (upsert ad_raw, 500/batch)
│     │ (service_role)    │ │
│     └────────┬─────────┘ │
│              ▼           │
│     ┌──────────────────┐ │
│     │ Update sync_log   │ │ ──► Supabase (update status + counts)
│     │ (status=success)  │ │
│     └──────────────────┘ │
│                          │
│  3. Return SyncRunResult │
└──────────────────────────┘
```

### 5.2 Dashboard Data Flow (User Request)

```
┌────────────────────┐     ┌─────────────────────┐
│  Browser            │     │  Browser              │
│  DashboardShell     │     │  (first load)         │
│  filter change      │     │                       │
└─────────┬──────────┘     └──────────┬────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ GET /api/dashboard   │     │ /dashboard/page.tsx   │
│ ?countries=...       │     │ (Server Component)    │
│ &months=...          │     │ SSR initial fetch     │
└─────────┬───────────┘     └──────────┬────────────┘
          │                            │
          ▼                            ▼
┌──────────────────────────────────────────────────┐
│  dashboard-queries.ts                             │
│  queryDashboardData(filters)                      │
│                                                   │
│  supabase                                         │
│    .from('ad_normalized')                         │
│    .select('*')                                   │
│    .in('sheet_name', [...])                       │
│    .in('month', [...])                            │
│    .in('medium', [...])                           │
│    .in('goal', [...])                             │
│                                                   │
│  Returns: AdRow[]                                 │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Supabase                                         │
│  ad_normalized VIEW                               │
│  (joins ad_raw + medium_map + goal_map +          │
│   creative_type_map + sheet_source)               │
└──────────────────────────────────────────────────┘
```

### 5.3 Filter Preset / URL Sharing Flow

```
┌─────────────────────┐
│  User sets filters    │
│  in FilterBar         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────────────────┐
│  DashboardShell                                   │
│                                                   │
│  1. filtersToSearchParams(filters)                │
│     → Updates browser URL (history.replaceState)  │
│     → URL: /dashboard?countries=US&months=2026-01 │
│                                                   │
│  2. generateFilterDescription(filters)            │
│     → "US / 2026년 1월 / 전체 매체 / 전체 목표"   │
│     → Displayed in FilterBar summary text         │
│                                                   │
│  3. User clicks "프리셋 저장"                      │
│     → savePreset({ name, filters })               │
│     → Stored in localStorage                      │
│                                                   │
│  4. User shares URL with colleague                │
│     → Colleague opens URL                         │
│     → searchParamsToFilters(urlParams)             │
│     → Filters auto-applied on load                │
└─────────────────────────────────────────────────┘
```

---

## 6. Error Handling Strategy

### 6.1 Error Classification

| Category | Examples | Response | Logging |
|----------|----------|----------|---------|
| **Auth errors** | Missing/invalid SYNC_API_SECRET | 401 JSON | Warn level |
| **Validation errors** | Invalid month format, unknown country | 400 JSON with details | Info level |
| **Sheets API errors** | Auth failure, quota exceeded, sheet not shared | 500 JSON per sheet; other sheets continue | Error level + sync_log |
| **Parse errors** | Missing required header, unparseable number | Skip row/sheet; log to sync_log | Warn level + sync_log |
| **Supabase errors** | Connection timeout, RLS violation, constraint violation | 500 JSON; partial sync continues | Error level + sync_log |
| **Unexpected errors** | Unhandled exceptions | 500 generic JSON | Error level + console |

### 6.2 Sync Pipeline Error Behavior

The sync pipeline follows a "best effort" model:

1. **Sheet-level isolation**: A failure in one sheet does not affect other sheets. Each sheet is synced independently with its own sync_log entry.

2. **Row-level isolation**: A single unparseable row is skipped. The `rowsSkipped` counter is incremented, and the row number is logged in the sync_log `error_message` field.

3. **Batch-level recovery**: If an upsert batch of 500 rows fails, the pipeline retries with smaller batch sizes (250, then 100, then row-by-row) before marking the sheet as 'partial'.

4. **Idempotency**: The sync is fully idempotent. Running it multiple times with the same sheet data produces the same result because of the upsert on `(sheet_source_id, sheet_row_number)`.

### 6.3 API Route Error Format

All API error responses follow a consistent format:

```ts
{
  error: string;       // Machine-readable error code (PascalCase)
  message: string;     // Human-readable description (Korean or English)
  details?: unknown;   // Optional structured details for debugging
}
```

### 6.4 Frontend Error Handling

The dashboard shell should handle API errors gracefully:

- **Network error / timeout**: Show toast notification "데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요." with retry button.
- **Empty result**: Show empty state with message "선택한 필터에 해당하는 데이터가 없습니다." (not an error).
- **Stale data**: Show subtle banner "마지막 동기화: 2시간 전" if the latest sync is older than 1 hour (query `sheet_sync_latest` view).

---

## 7. Scheduled Sync (Vercel Cron)

**File**: `vercel.json` (add cron configuration)

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This triggers a daily sync at 09:00 UTC (18:00 KST). Vercel Cron sends a GET request; the sync route should also accept GET with the `Authorization` header set via Vercel environment variables.

**Alternative**: If the team prefers manual sync only (planners update sheets infrequently), skip the cron and provide a "동기화" button in the dashboard nav that calls `POST /api/sync` with the stored secret.

---

## 8. Query Builder / Filter Preset System (Detailed)

### 8.1 URL-Based Filter Sharing

The primary sharing mechanism. When a user adjusts filters in the dashboard, the URL updates in real-time via `history.replaceState()`. The URL is the single source of truth for filter state on page load.

**URL format**:
```
/dashboard?countries=레진+KR,US&months=2026-01,2026-02&mediums=Meta&goals=결제
```

**Encoding rules**:
- Comma (`,`) separates values within a parameter
- Values are URI-encoded (Korean characters become `%XX` sequences)
- Spaces in sheet names (e.g., "레진 KR") are encoded as `+` or `%20`
- Empty/omitted parameter means "all values" (no filter applied)

**On page load**:
1. `page.tsx` (Server Component) reads `searchParams` from the Next.js page props
2. Passes decoded filters as `initialFilters` to `DashboardShell`
3. `DashboardShell` uses these as the initial filter state
4. Server-side data fetch uses the same filters for initial SSR data

### 8.2 Saved Presets (localStorage for v1)

**Storage key**: `adinsight-filter-presets`

**Storage format**:
```ts
// localStorage value (JSON stringified)
[
  {
    "id": "a1b2c3d4",
    "name": "KR Meta 3월 결제",
    "filters": {
      "countries": ["레진 KR", "봄툰 KR"],
      "months": ["2026-03"],
      "mediums": ["Meta"],
      "goals": ["결제"]
    },
    "description": "레진 KR, 봄툰 KR / 2026년 3월 / Meta / 결제 목표",
    "createdBy": "기획팀 김준완",
    "createdAt": "2026-04-01T09:00:00Z"
  }
]
```

**UI integration** (in FilterBar):
- "프리셋 저장" button: Opens a dialog to name the current filter state
- "프리셋 불러오기" dropdown: Lists saved presets, clicking one applies the filters
- "프리셋 삭제": Swipe or X button on each preset in the list
- "링크 복사" button: Copies the current URL to clipboard with a toast notification

### 8.3 Natural Language Filter Description

Displayed below the FilterBar as a summary line. Auto-generated, not editable.

**Generation rules** (in priority order):

| Dimension | No selection | Single | Multiple | Quarter detection |
|-----------|-------------|--------|----------|-------------------|
| Countries | "전체 국가" | "US" | "US, DE" | n/a |
| Months | "전체 기간" | "2026년 3월" | "2026년 1~3월" | "2026년 1분기" if [01,02,03] |
| Mediums | "전체 매체" | "Meta" | "Meta, TikTok" | n/a |
| Goals | "전체 목표" | "결제 목표" | "결제, 가입 목표" | n/a |

**Output format**: Dimensions joined by ` / `:
```
US, DE / 2026년 1분기 / Meta / 전체 목표
```

### 8.4 CSV Export

Accessible via an "내보내기" button in the DataTable toolbar. Uses the current filter state.

**Implementation**:
1. Button click calls `fetch('/api/export?' + filtersToSearchParams(currentFilters))`
2. Browser receives CSV as a file download (via `Content-Disposition: attachment`)
3. File is UTF-8 with BOM for Korean character support in Excel

**Filename convention**: `adinsight-{description}-{date}.csv`
- Example: `adinsight-US-Meta-2026-03-2026-04-01.csv`
- Falls back to `adinsight-export-2026-04-01.csv` if description is too long

---

## 9. Security Considerations

### 9.1 API Authentication

| Endpoint | Auth Method | Rationale |
|----------|-------------|-----------|
| `POST /api/sync` | Bearer token (SYNC_API_SECRET) | Write operation; must be restricted |
| `GET /api/dashboard` | None (public) | Read-only; data is not sensitive |
| `GET /api/filters` | None (public) | Read-only; returns dimension values only |
| `GET /api/export` | None (public) | Same data as /api/dashboard, different format |
| `POST /api/auth` | (existing) Credentials check | Existing auth system |

### 9.2 Supabase Client Separation

- **Anon client** (`supabase.ts`): Used for all read operations from API routes and server components. Limited by RLS to SELECT-only.
- **Admin client** (`supabase-admin.ts`): Used exclusively by the sync pipeline. Has full INSERT/UPDATE access. Never exposed to client-side code.

### 9.3 Google Sheets Service Account

- Credentials file is in `credentials/` which is git-ignored
- Service account has read-only scope (`spreadsheets.readonly`)
- Each sheet must be shared with the service account email as a viewer

### 9.4 Rate Limiting

- `/api/dashboard` and `/api/filters`: CDN caching serves as implicit rate limiting. Consider adding explicit rate limiting (e.g., 100 req/min per IP) via Vercel Edge Middleware if needed.
- `/api/sync`: Protected by secret, so rate limiting is less critical. The sequential sheet processing naturally limits throughput.

---

## 10. Performance Budget

| Operation | Target | Approach |
|-----------|--------|----------|
| `/api/dashboard` response | < 500ms | CDN cache (5 min); Supabase indexes on month, medium, sheet_source_id |
| `/api/filters` response | < 200ms | CDN cache (1 hour); 4 parallel distinct queries |
| Full sync (8 sheets) | < 60s | Sequential processing; 500-row upsert batches |
| Single sheet sync | < 10s | One Sheets API call + one upsert batch |
| Initial dashboard SSR | < 1s | Server Component fetches default data; no client-side loading |
| Filter change response | < 800ms | 300ms debounce + 500ms API response |

---

## 11. Implementation Order

The recommended implementation sequence, accounting for dependencies:

| Phase | Task | Dependencies | Estimated Effort |
|-------|------|-------------|------------------|
| **1** | `supabase-admin.ts` — service role client | SUPABASE_SERVICE_ROLE_KEY env var | 30 min |
| **2** | `types/sync.ts` + `types/dashboard.ts` — type definitions | Schema knowledge | 1 hour |
| **3** | `sheets-client.ts` — Google Sheets API client | Service account shared with sheets | 1 hour |
| **4** | `sheets-parser.ts` — header parsing + row normalization | Data scan results | 2 hours |
| **5** | `sheets-sync.ts` — full sync pipeline | Phases 1-4 | 2 hours |
| **6** | `POST /api/sync` — sync trigger route | Phase 5 | 30 min |
| **7** | Run first sync, verify data in Supabase | Phases 1-6 + schema applied to Supabase | 1 hour (debug) |
| **8** | `dashboard-queries.ts` — query builder | Phase 2 + data in Supabase | 1.5 hours |
| **9** | `GET /api/dashboard` + `GET /api/filters` | Phase 8 | 1 hour |
| **10** | `GET /api/export` — CSV export | Phase 8 | 30 min |
| **11** | `filter-presets.ts` — URL encoding + presets | Phase 2 | 1 hour |
| **12** | `vercel.json` cron configuration | Phase 6 deployed | 15 min |

**Total estimated effort**: ~12 hours of implementation work.

**Critical path**: Phases 1-7 must complete before any dashboard frontend work can use real data. Phase 7 (first sync + verification) is the integration milestone.

---

## 12. Testing Strategy

### Unit Tests (recommended files)

| Module | Test Focus |
|--------|-----------|
| `sheets-parser.test.ts` | Header parsing for all 8 sheet variants; row parsing with edge cases (empty cells, Korean numbers, percentage vs ratio) |
| `filter-presets.test.ts` | URL encoding/decoding round-trip; description generation for various filter combinations |
| `dashboard-queries.test.ts` | Filter-to-query construction (mock Supabase client); field mapping correctness |

### Integration Tests

| Test | Setup |
|------|-------|
| Sync pipeline end-to-end | Use a test Google Sheet with known data; verify rows appear in Supabase |
| `/api/dashboard` with filters | Seed Supabase with fixture data; verify response shape and filtering |
| CSV export correctness | Verify BOM, Korean characters, numeric formatting in exported CSV |

### Manual Verification Checklist

- [ ] Each of the 8 sheets syncs without errors
- [ ] `ad_normalized` view returns correct normalized values for all 8 sheets
- [ ] KPI summary matches manual spreadsheet calculations
- [ ] URL-shared filters produce the same dashboard view for another user
- [ ] CSV export opens correctly in Excel with Korean characters
