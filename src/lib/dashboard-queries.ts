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

/** Map a raw Supabase row (snake_case) to the frontend AdRow (camelCase). */
function mapRow(row: Record<string, unknown>): AdRow {
  return {
    id: String(row.id ?? ""),
    country: String(row.sheet_name ?? ""),
    month: String(row.month ?? ""),
    date: row.ad_date ? String(row.ad_date) : "",
    medium: String(row.medium ?? ""),
    goal: String(row.goal ?? ""),
    creativeType: String(row.creative_type ?? ""),
    creativeName: String(row.creative_name ?? ""),
    adSpend: num(row.ad_spend_krw),
    adSpendLocal: num(row.ad_spend_local),
    currency: String(row.currency_local ?? "KRW"),
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    ctr: num(row.ctr) * 100,
    signups: num(row.signups),
    signupCpa: num(row.signup_cpa),
    conversions: num(row.conversions),
    revenue: row.revenue_krw != null ? num(row.revenue_krw) : num(row.revenue_local),
    roas: num(row.roas) * 100,
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

  return { data, meta };
}

/**
 * Fetch distinct filter option values from ad_normalized.
 * Runs 4 queries in parallel for efficiency.
 * Filters out "none" values from mediums and goals.
 */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  const emptyFilters: DashboardFilters = { countries: [], months: [], mediums: [], goals: [], dateMode: "monthly", dateRange: null };
  const [countriesRes, monthsRes, mediumsRes, goalsRes] = await Promise.all([
    fetchAllRows("ad_normalized", "sheet_name", emptyFilters),
    fetchAllRows("ad_normalized", "month", emptyFilters),
    fetchAllRows("ad_normalized", "medium", emptyFilters),
    fetchAllRows("ad_normalized", "goal", emptyFilters),
  ]);

  for (const res of [countriesRes, monthsRes, mediumsRes, goalsRes]) {
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

  return {
    countries: extractDistinct(countriesRes.rows, "sheet_name"),
    months: extractDistinct(monthsRes.rows, "month"),
    mediums: extractDistinct(mediumsRes.rows, "medium", true),
    goals: extractDistinct(goalsRes.rows, "goal", true),
  };
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
  };
}
