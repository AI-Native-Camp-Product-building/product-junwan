// =============================================================================
// Dashboard Query Builder — AdInsight
// Supabase queries against ad_normalized view for dashboard data.
// Uses the anon client (RLS allows public read).
// =============================================================================

import { supabase } from "@/lib/supabase";
import type {
  AdRow,
  DashboardFilters,
  FilterOptions,
  KpiSummary,
} from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely coerce a numeric DB value to a JS number, defaulting to 0. */
function num(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Resolve ad_spend in KRW: 봄툰 KR uses ad_spend_local (원화 컬럼 오류). */
function resolveAdSpendKrw(row: Record<string, unknown>): number {
  const sheetName = String(row.sheet_name ?? "");
  if (sheetName === "봄툰 KR") {
    return num(row.ad_spend_local);
  }
  const krw = num(row.ad_spend_krw);
  return krw !== 0 ? krw : num(row.ad_spend_local);
}

/** Map a raw Supabase row (snake_case) to the frontend AdRow (camelCase). */
function mapRow(row: Record<string, unknown>): AdRow {
  const adSpend = resolveAdSpendKrw(row);
  const revenue = row.revenue_krw != null ? num(row.revenue_krw) : num(row.revenue_local);

  return {
    id: String(row.id ?? ""),
    country: String(row.sheet_name ?? ""),
    month: String(row.month ?? ""),
    date: row.ad_date ? String(row.ad_date) : "",
    medium: String(row.medium ?? ""),
    goal: String(row.goal ?? ""),
    creativeType: String(row.creative_type ?? ""),
    creativeName: String(row.creative_name ?? ""),
    adSpend,
    adSpendLocal: num(row.ad_spend_local),
    currency: String(row.currency_local ?? "KRW"),
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    ctr: num(row.ctr) * 100,
    signups: num(row.signups),
    signupCpa: num(row.signup_cpa),
    conversions: num(row.conversions),
    revenue,
    roas: adSpend > 0 ? (revenue / adSpend) * 100 : 0,
  };
}

/** Extract unique sorted values from an array. */
function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

// ---------------------------------------------------------------------------
// Select clause — only the columns we need (avoids transferring raw debug cols)
// ---------------------------------------------------------------------------

const SELECT_COLUMNS = [
  "id",
  "sheet_name",
  "month",
  "ad_date",
  "medium",
  "goal",
  "creative_type",
  "creative_name",
  "ad_spend_krw",
  "ad_spend_local",
  "currency_local",
  "impressions",
  "clicks",
  "ctr",
  "signups",
  "signup_cpa",
  "conversions",
  "revenue_krw",
  "revenue_local",
  "roas",
].join(",");

// ---------------------------------------------------------------------------
// Core Queries
// ---------------------------------------------------------------------------

export interface QueryMeta {
  totalRows: number;
  countries: string[];
  months: string[];
  mediums: string[];
  goals: string[];
  queriedAt: string;
}

const DASHBOARD_DATA_CACHE_TTL_MS = 15 * 60 * 1000;
const DASHBOARD_DATA_CACHE_MAX_ENTRIES = 20;
const FILTER_OPTIONS_CACHE_TTL_MS = 15 * 60 * 1000;

const dashboardDataCache = new Map<
  string,
  { data: { data: AdRow[]; meta: QueryMeta }; timestamp: number }
>();
let filterOptionsCache:
  | { data: FilterOptions; timestamp: number }
  | null = null;

function getDashboardCacheKey(filters: DashboardFilters): string {
  return JSON.stringify({
    countries: [...filters.countries].sort(),
    months: [...filters.months].sort(),
    mediums: [...filters.mediums].sort(),
    goals: [...filters.goals].sort(),
    startDate: filters.startDate ?? null,
    endDate: filters.endDate ?? null,
  });
}

function getCachedDashboardData(
  key: string,
): { data: AdRow[]; meta: QueryMeta } | null {
  const entry = dashboardDataCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > DASHBOARD_DATA_CACHE_TTL_MS) {
    dashboardDataCache.delete(key);
    return null;
  }

  dashboardDataCache.delete(key);
  dashboardDataCache.set(key, entry);
  return entry.data;
}

function setCachedDashboardData(
  key: string,
  data: { data: AdRow[]; meta: QueryMeta },
): void {
  if (dashboardDataCache.has(key)) {
    dashboardDataCache.delete(key);
  }

  dashboardDataCache.set(key, { data, timestamp: Date.now() });

  while (dashboardDataCache.size > DASHBOARD_DATA_CACHE_MAX_ENTRIES) {
    const oldestKey = dashboardDataCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    dashboardDataCache.delete(oldestKey);
  }
}

/**
 * Fetch all rows from a Supabase query using pagination.
 * Supabase caps responses at 1000 rows regardless of .limit().
 * This fetches in pages of 1000 until all rows are retrieved.
 */
async function fetchAllRows(
  tableName: string,
  columns: string,
  filters: DashboardFilters,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  const PAGE_SIZE = 1000;
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from(tableName)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);

    if (filters.countries.length > 0) {
      query = query.in("sheet_name", filters.countries);
    }
    // Date range takes precedence over months
    const useDateRange = Boolean(filters.startDate && filters.endDate);
    if (useDateRange) {
      query = query.gte("ad_date", filters.startDate!).lte("ad_date", filters.endDate!);
    } else if (filters.months.length > 0) {
      query = query.in("month", filters.months);
    }
    if (filters.mediums.length > 0) {
      query = query.in("medium", filters.mediums);
    }
    if (filters.goals.length > 0) {
      query = query.in("goal", filters.goals);
    }

    const { data, error } = await query;
    if (error) return { rows: allRows, error: error.message };

    const page = (data ?? []) as unknown as Record<string, unknown>[];
    allRows.push(...page);

    if (page.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;
  }

  return { rows: allRows, error: null };
}

/**
 * Fetch dashboard data from ad_normalized with optional filters.
 * Returns mapped AdRow[] and metadata about the result set.
 * Uses pagination to bypass Supabase's 1000-row default cap.
 */
export async function fetchDashboardData(
  filters: DashboardFilters,
): Promise<{ data: AdRow[]; meta: QueryMeta }> {
  const cacheKey = getDashboardCacheKey(filters);
  const cached = getCachedDashboardData(cacheKey);
  if (cached) return cached;

  const { rows, error } = await fetchAllRows("ad_normalized", SELECT_COLUMNS, filters);

  if (error) {
    throw new Error(`Supabase query error: ${error}`);
  }

  // Cast to Record<string, unknown>[] — Supabase returns generic row objects
  // when querying views without generated types.
  const data = ((rows ?? []) as unknown as Record<string, unknown>[]).map(
    mapRow,
  );

  const meta: QueryMeta = {
    totalRows: data.length,
    countries: uniqueSorted(data.map((r) => r.country)),
    months: uniqueSorted(data.map((r) => r.month)),
    mediums: uniqueSorted(data.map((r) => r.medium)),
    goals: uniqueSorted(data.map((r) => r.goal)),
    queriedAt: new Date().toISOString(),
  };

  const result = { data, meta };
  setCachedDashboardData(cacheKey, result);
  return result;
}

/**
 * Fetch distinct filter option values from ad_normalized.
 * Runs 4 queries in parallel for efficiency.
 * Filters out "none" values from mediums and goals.
 */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  if (
    filterOptionsCache &&
    Date.now() - filterOptionsCache.timestamp < FILTER_OPTIONS_CACHE_TTL_MS
  ) {
    return filterOptionsCache.data;
  }

  const emptyFilters: DashboardFilters = { countries: [], months: [], mediums: [], goals: [], dateMode: "monthly", dateRange: null };
  const [countriesRes, monthsRes, mediumsRes, goalsRes, creativeTypesRes, creativeNamesRes] = await Promise.all([
    fetchAllRows("ad_normalized", "sheet_name", emptyFilters),
    fetchAllRows("ad_normalized", "month", emptyFilters),
    fetchAllRows("ad_normalized", "medium", emptyFilters),
    fetchAllRows("ad_normalized", "goal", emptyFilters),
    fetchAllRows("ad_normalized", "creative_type", emptyFilters),
    fetchAllRows("ad_normalized", "creative_name", emptyFilters),
  ]);

  for (const res of [countriesRes, monthsRes, mediumsRes, goalsRes, creativeTypesRes, creativeNamesRes]) {
    if (res.error) {
      throw new Error(`Supabase filter query error: ${res.error}`);
    }
  }

  const extractDistinct = (
    rows: Record<string, unknown>[],
    key: string,
    excludeNone = false,
  ): string[] => {
    const values = rows
      .map((r) => String(r[key] ?? ""))
      .filter((v) => v !== "" && (!excludeNone || v !== "none"));
    return uniqueSorted([...new Set(values)]);
  };

  const data = {
    countries: extractDistinct(countriesRes.rows, "sheet_name"),
    months: extractDistinct(monthsRes.rows, "month"),
    mediums: extractDistinct(mediumsRes.rows, "medium", true),
    goals: extractDistinct(goalsRes.rows, "goal", true),
    creativeTypes: extractDistinct(creativeTypesRes.rows, "creative_type", true),
    creativeNames: extractDistinct(creativeNamesRes.rows, "creative_name", true),
  };

  filterOptionsCache = { data, timestamp: Date.now() };
  return data;
}

export async function fetchLatestDataDate(): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("ad_normalized")
    .select("ad_date")
    .not("ad_date", "is", null)
    .order("ad_date", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Supabase latest date query error: ${error.message}`);
  }

  const row = data?.[0] as Record<string, unknown> | undefined;
  return row?.ad_date ? String(row.ad_date) : undefined;
}

/**
 * Compute KPI summary from two arrays of AdRow data (current & previous period).
 * Client-side aggregation — acceptable for ~8000 rows total.
 */
export function computeKpiSummary(
  currentData: AdRow[],
  previousData: AdRow[],
): KpiSummary {
  // KEYWORD: dashboard-kpi-summary-server
  const sumField = (rows: AdRow[], field: keyof AdRow): number =>
    rows.reduce((acc, row) => acc + num(row[field]), 0);

  const currentAdSpend = sumField(currentData, "adSpend");
  const currentRevenue = sumField(currentData, "revenue");
  const currentRoas =
    currentAdSpend > 0 ? (currentRevenue / currentAdSpend) * 100 : 0;
  const currentSignups = sumField(currentData, "signups");
  const currentConversions = sumField(currentData, "conversions");

  const prevAdSpend = sumField(previousData, "adSpend");
  const prevRevenue = sumField(previousData, "revenue");
  const prevRoas = prevAdSpend > 0 ? (prevRevenue / prevAdSpend) * 100 : 0;
  const prevSignups = sumField(previousData, "signups");
  const prevConversions = sumField(previousData, "conversions");

  const change = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    adSpend: currentAdSpend,
    revenue: currentRevenue,
    roas: currentRoas,
    signups: currentSignups,
    conversions: currentConversions,
    adSpendChange: change(currentAdSpend, prevAdSpend),
    revenueChange: change(currentRevenue, prevRevenue),
    roasChange: change(currentRoas, prevRoas),
    signupsChange: change(currentSignups, prevSignups),
    conversionsChange: change(currentConversions, prevConversions),
    adSpendDelta: currentAdSpend - prevAdSpend,
    revenueDelta: currentRevenue - prevRevenue,
    roasDelta: currentRoas - prevRoas,
    signupsDelta: currentSignups - prevSignups,
    conversionsDelta: currentConversions - prevConversions,
  };
}
