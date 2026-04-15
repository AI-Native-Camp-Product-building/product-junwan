"use client";

import * as React from "react";
import { startOfWeek, format as fnsFormat } from "date-fns";
import type {
  AdRow,
  DashboardFilters,
  FilterOptions,
  KpiSummary,
  MediumSpendPoint,
  TrendPoint,
  DateMode,
  DateRange,
} from "@/types/dashboard";
import { IconLink } from "@tabler/icons-react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { getDefaultDateRangeForMode } from "@/components/dashboard/date-range-picker-refined";
import { KpiCardsRefined } from "@/components/dashboard/kpi-cards-refined";
import { ChartSection } from "@/components/dashboard/chart-section";
import { DashboardDataTable } from "@/components/dashboard/dashboard-data-table";
import { CreativeRanking } from "@/components/dashboard/creative-ranking";
import { SpendDonutChart } from "@/components/dashboard/spend-donut-chart";
import { MediumSummaryTable } from "@/components/dashboard/medium-summary-table";
import { CountrySummaryTable } from "@/components/dashboard/country-summary-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { Button } from "@/components/ui/button";

interface DashboardShellProps {
  initialData: AdRow[];
  filterOptions: FilterOptions;
  /** Optional initial filter overrides (e.g. pre-selecting a country or medium). */
  initialFilters?: Partial<DashboardFilters>;
  hiddenFilters?: Array<"countries" | "mediums" | "goals">;
  lockedFilters?: Partial<Pick<DashboardFilters, "countries" | "mediums">>;
}

function applyLockedFilters(
  filters: DashboardFilters,
  lockedFilters?: Partial<Pick<DashboardFilters, "countries" | "mediums">>,
): DashboardFilters {
  if (!lockedFilters) {
    return filters;
  }

  return {
    ...filters,
    countries:
      lockedFilters.countries && lockedFilters.countries.length > 0
        ? lockedFilters.countries
        : filters.countries,
    mediums:
      lockedFilters.mediums && lockedFilters.mediums.length > 0
        ? lockedFilters.mediums
        : filters.mediums,
  };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  const serialized = JSON.stringify(value);
  React.useEffect(() => {
    const parsed = JSON.parse(serialized) as T;
    const timer = setTimeout(() => setDebounced(parsed), delay);
    return () => clearTimeout(timer);
   
  }, [serialized, delay]);
  return debounced;
}

// KEYWORD: dashboard-kpi-summary-client
/** Compute KPI summary with MoM change. */
/** Split data into current/previous periods based on dateMode.
 *  - weekly: rows split by week boundary (last 7 days vs prior 7 days)
 *  - monthly: group by month, compare last 2 months
 *  - daily/custom: split dateRange in half, compare 2nd half vs 1st half (전 동기간)
 */
function splitByPeriod(
  data: AdRow[],
  dateMode: DateMode,
  dateRange: DateRange | null,
): { curr: AdRow[]; prev: AdRow[] } {
  if (dateMode === "monthly") {
    const byMonth = new Map<string, AdRow[]>();
    for (const row of data) {
      const existing = byMonth.get(row.month) ?? [];
      existing.push(row);
      byMonth.set(row.month, existing);
    }
    const sorted = [...byMonth.keys()].sort();
    if (sorted.length >= 2) {
      return {
        curr: byMonth.get(sorted[sorted.length - 1]) ?? [],
        prev: byMonth.get(sorted[sorted.length - 2]) ?? [],
      };
    }
    return { curr: data, prev: [] };
  }

  if (dateMode === "weekly") {
    // 날짜 기준: 최근 7일 vs 그 전 7일
    const withDate = data.filter((r) => r.date);
    if (withDate.length === 0) return { curr: data, prev: [] };
    const dates = withDate.map((r) => r.date).sort();
    const latest = new Date(dates[dates.length - 1]);
    const weekAgo = new Date(latest);
    weekAgo.setDate(weekAgo.getDate() - 6); // 7일 포함
    const twoWeeksAgo = new Date(weekAgo);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().slice(0, 10);

    return {
      curr: withDate.filter((r) => r.date >= weekAgoStr),
      prev: withDate.filter((r) => r.date >= twoWeeksAgoStr && r.date < weekAgoStr),
    };
  }

  // daily/custom: dateRange 기반 전 동기간
  if (dateRange) {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const startStr = dateRange.startDate;
    const endStr = dateRange.endDate;
    const prevStartStr = prevStart.toISOString().slice(0, 10);
    const prevEndStr = prevEnd.toISOString().slice(0, 10);

    const withDate = data.filter((r) => r.date);
    return {
      curr: withDate.filter((r) => r.date >= startStr && r.date <= endStr),
      prev: withDate.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr),
    };
  }

  // fallback: 월 기준
  return splitByPeriod(data, "monthly", null);
}

function computeKpiSummary(data: AdRow[], dateMode: DateMode = "monthly", dateRange: DateRange | null = null): KpiSummary {
  const adSpend = data.reduce((s, r) => s + r.adSpend, 0);
  const revenue = data.reduce((s, r) => s + r.revenue, 0);
  const signups = data.reduce((s, r) => s + r.signups, 0);
  const conversions = data.reduce((s, r) => s + r.conversions, 0);
  const roas = adSpend > 0 ? (revenue / adSpend) * 100 : 0;

  const { curr, prev } = splitByPeriod(data, dateMode, dateRange);

  let adSpendChange = 0;
  let revenueChange = 0;
  let roasChange = 0;
  let signupsChange = 0;
  let conversionsChange = 0;

  if (prev.length > 0) {
    const currAdSpend = curr.reduce((s, r) => s + r.adSpend, 0);
    const prevAdSpend = prev.reduce((s, r) => s + r.adSpend, 0);
    const currRevenue = curr.reduce((s, r) => s + r.revenue, 0);
    const prevRevenue = prev.reduce((s, r) => s + r.revenue, 0);
    const currSignups = curr.reduce((s, r) => s + r.signups, 0);
    const prevSignups = prev.reduce((s, r) => s + r.signups, 0);
    const currConversions = curr.reduce((s, r) => s + r.conversions, 0);
    const prevConversions = prev.reduce((s, r) => s + r.conversions, 0);
    const currRoas = currAdSpend > 0 ? (currRevenue / currAdSpend) * 100 : 0;
    const prevRoas = prevAdSpend > 0 ? (prevRevenue / prevAdSpend) * 100 : 0;

    adSpendChange = prevAdSpend > 0 ? ((currAdSpend - prevAdSpend) / prevAdSpend) * 100 : 0;
    revenueChange = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    signupsChange = prevSignups > 0 ? ((currSignups - prevSignups) / prevSignups) * 100 : 0;
    conversionsChange = prevConversions > 0 ? ((currConversions - prevConversions) / prevConversions) * 100 : 0;
    roasChange = currRoas - prevRoas;
  }

  return {
    adSpend,
    revenue,
    roas,
    signups,
    conversions,
    adSpendChange,
    revenueChange,
    roasChange,
    signupsChange,
    conversionsChange,
  };
}

type TrendMetric = "adSpend" | "signups" | "revenue" | "roas" | "signupCpa";
export type ChartGranularity = "daily" | "weekly" | "monthly";

/** Get the period key for a row based on chart granularity */
function getPeriodKey(row: AdRow, granularity: ChartGranularity): string {
  if (granularity === "monthly") return row.month;
  if (granularity === "daily") return row.date || row.month;
  // weekly: group by week start (Monday)
  if (row.date) {
    const weekStart = startOfWeek(new Date(row.date), { weekStartsOn: 1 });
    return fnsFormat(weekStart, "MM.dd");
  }
  return row.month;
}

function computeTrendData(
  data: AdRow[],
  metric: TrendMetric,
  granularity: ChartGranularity,
): TrendPoint[] {
  const map = new Map<string, Map<string, { adSpend: number; revenue: number; signups: number; hasData: boolean }>>();

  for (const row of data) {
    // KEYWORD: dashboard-trend-period-granularity
    const periodKey = getPeriodKey(row, granularity);

    if (!map.has(periodKey)) map.set(periodKey, new Map());
    const countryMap = map.get(periodKey)!;
    const existing = countryMap.get(row.country) ?? { adSpend: 0, revenue: 0, signups: 0, hasData: false };
    existing.adSpend += row.adSpend;
    existing.revenue += row.revenue;
    existing.signups += row.signups;
    if (row.adSpend > 0 || row.revenue > 0 || row.signups > 0) {
      existing.hasData = true;
    }
    countryMap.set(row.country, existing);
  }

  const result: TrendPoint[] = [];
  for (const [period, countryMap] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const point: TrendPoint = { period };
    let totalSpend = 0, totalRevenue = 0, totalSignups = 0;
    let totalHasData = false;

    for (const [country, agg] of countryMap) {
      totalSpend += agg.adSpend;
      totalRevenue += agg.revenue;
      totalSignups += agg.signups;
      if (agg.hasData) totalHasData = true;

      // 미입력(모든 지표 0) → skip = undefined = Recharts 갭
      if (!agg.hasData) continue;

      if (metric === "adSpend") point[country] = Math.round(agg.adSpend);
      else if (metric === "signups") point[country] = agg.signups;
      else if (metric === "revenue") point[country] = Math.round(agg.revenue);
      else if (metric === "roas") point[country] = agg.adSpend > 0 ? Math.round((agg.revenue / agg.adSpend) * 100 * 10) / 10 : 0;
      else if (metric === "signupCpa") point[country] = agg.signups > 0 ? Math.round(agg.adSpend / agg.signups) : 0;
    }

    if (totalHasData) {
      if (metric === "adSpend") point["\uC804\uCCB4"] = Math.round(totalSpend);
      else if (metric === "signups") point["\uC804\uCCB4"] = totalSignups;
      else if (metric === "revenue") point["\uC804\uCCB4"] = Math.round(totalRevenue);
      else if (metric === "roas") point["\uC804\uCCB4"] = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100 * 10) / 10 : 0;
      else if (metric === "signupCpa") point["\uC804\uCCB4"] = totalSignups > 0 ? Math.round(totalSpend / totalSignups) : 0;
    }

    result.push(point);
  }
  return result;
}

/** Build medium spend data aggregated across all filtered rows. */
function computeMediumSpend(data: AdRow[]): MediumSpendPoint[] {
  const map = new Map<string, { adSpend: number; revenue: number }>();
  for (const row of data) {
    const existing = map.get(row.medium) ?? { adSpend: 0, revenue: 0 };
    existing.adSpend += row.adSpend;
    existing.revenue += row.revenue;
    map.set(row.medium, existing);
  }

  return [...map.entries()]
    .map(([medium, { adSpend, revenue }]) => ({
      medium,
      adSpend,
      revenue,
      roas: adSpend > 0 ? Math.round((revenue / adSpend) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.adSpend - a.adSpend);
}

/** Default filter state — used for SSR and as initial client state. */
const DEFAULT_FILTERS: DashboardFilters = {
  countries: [], months: [], mediums: [], goals: [],
  dateMode: "monthly", dateRange: null,
};

/** Read filters from URL search params. Client-only (returns null on server). */
function readFiltersFromUrl(options: FilterOptions): DashboardFilters | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.size === 0) return null;

  const parse = (key: string, valid: string[]) => {
    const raw = params.get(key);
    if (!raw) return [];
    return raw.split(",").filter((v) => valid.includes(v));
  };

  const dateMode = (params.get("mode") as DateMode) ?? "monthly";
  const start = params.get("start") ?? params.get("startDate");
  const end = params.get("end") ?? params.get("endDate");
  const dateRange: DateRange | null = start && end ? { startDate: start, endDate: end } : null;

  return {
    countries: parse("countries", options.countries),
    months: parse("months", options.months),
    mediums: parse("mediums", options.mediums),
    goals: parse("goals", options.goals),
    dateMode,
    dateRange,
  };
}

/** Sync current filters to URL without triggering navigation. */
function syncFiltersToUrl(filters: DashboardFilters) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (filters.countries.length > 0) params.set("countries", filters.countries.join(","));
  if (filters.months.length > 0) params.set("months", filters.months.join(","));
  if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","));
  if (filters.goals.length > 0) params.set("goals", filters.goals.join(","));
  if (filters.dateMode !== "monthly") params.set("mode", filters.dateMode);
  if (filters.dateRange) {
    params.set("start", filters.dateRange.startDate);
    params.set("end", filters.dateRange.endDate);
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

export function DashboardShell({
  initialData,
  filterOptions,
  initialFilters,
  hiddenFilters,
  lockedFilters,
}: DashboardShellProps) {
  // KEYWORD: dashboard-latest-data-date
  const latestDataDate = React.useMemo(() => {
    const validDates = initialData
      .map((row) => row.date)
      .filter((date): date is string => Boolean(date))
      .sort();

    return validDates[validDates.length - 1];
  }, [initialData]);

  const [filters, setFilters] = React.useState<DashboardFilters>(() => {
    const baseFilters: DashboardFilters = {
      ...DEFAULT_FILTERS,
      ...initialFilters,
    };

    if (!baseFilters.dateRange && baseFilters.months.length === 0) {
      return {
        ...baseFilters,
        dateRange: getDefaultDateRangeForMode(
          baseFilters.dateMode ?? "monthly",
          latestDataDate,
        ),
      };
    }

    return baseFilters;
  });
  const [data, setData] = React.useState<AdRow[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [chartGranularity, setChartGranularity] = React.useState<ChartGranularity>("monthly");
  const effectiveFilters = React.useMemo(
    () => applyLockedFilters(filters, lockedFilters),
    [filters, lockedFilters],
  );

  // Read URL params only after hydration to avoid SSR/client mismatch
  React.useEffect(() => {
    const urlFilters = readFiltersFromUrl(filterOptions);
    // KEYWORD: dashboard-fixed-filter-merge
    if (urlFilters) {
      setFilters((currentFilters) => ({
        ...currentFilters,
        ...urlFilters,
        countries:
          urlFilters.countries.length > 0
            ? urlFilters.countries
            : currentFilters.countries,
        mediums:
          urlFilters.mediums.length > 0
            ? urlFilters.mediums
            : currentFilters.mediums,
        dateRange:
          !urlFilters.dateRange && urlFilters.months.length === 0
            ? currentFilters.dateRange ??
              getDefaultDateRangeForMode(
                urlFilters.dateMode ?? currentFilters.dateMode,
                latestDataDate,
              )
            : urlFilters.dateRange,
      }));
    }
    setHydrated(true);
  }, [filterOptions, latestDataDate]);

  // Sync filters to URL on change (skip initial hydration sync)
  React.useEffect(() => {
    if (!hydrated) return;
    syncFiltersToUrl(effectiveFilters);
  }, [effectiveFilters, hydrated]);

  const debouncedFilters = useDebounce(effectiveFilters, 300);

  // Fetch data when filters change (or on initial load)
  React.useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (debouncedFilters.countries.length > 0) params.set("countries", debouncedFilters.countries.join(","));
    if (debouncedFilters.mediums.length > 0) params.set("mediums", debouncedFilters.mediums.join(","));
    if (debouncedFilters.goals.length > 0) params.set("goals", debouncedFilters.goals.join(","));

    // Use dateRange for API if available, otherwise fall back to months
    // Extend range to include comparison period data
    if (debouncedFilters.dateRange) {
      const start = new Date(debouncedFilters.dateRange.startDate);
      const end = new Date(debouncedFilters.dateRange.endDate);
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const mode = debouncedFilters.dateMode;
      const extraDays = mode === "weekly" ? 14 : days; // 전주 or 전 동기간
      const extendedStart = new Date(start);
      extendedStart.setDate(extendedStart.getDate() - extraDays);
      params.set("startDate", extendedStart.toISOString().slice(0, 10));
      params.set("endDate", debouncedFilters.dateRange.endDate);
    } else if (debouncedFilters.months.length > 0) {
      params.set("months", debouncedFilters.months.join(","));
    }

    fetch(`/api/dashboard?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setData(json.data ?? []))
      .catch(() => setData(initialData))
      .finally(() => setIsLoading(false));
  }, [debouncedFilters, initialData]);

  const kpiSummary = React.useMemo(() => computeKpiSummary(data, filters.dateMode, filters.dateRange), [data, filters.dateMode, filters.dateRange]);
  const mediumSpendData = React.useMemo(() => computeMediumSpend(data), [data]);

  const trendData = React.useMemo(() => ({
    adSpend: computeTrendData(data, "adSpend", chartGranularity),
    signups: computeTrendData(data, "signups", chartGranularity),
    revenue: computeTrendData(data, "revenue", chartGranularity),
    roas: computeTrendData(data, "roas", chartGranularity),
    signupCpa: computeTrendData(data, "signupCpa", chartGranularity),
  }), [data, chartGranularity]);

  // KEYWORD: dashboard-insight-period-split
  // Split data into current/previous periods for insights.
  const sortedMonths = [...new Set(data.map((r) => r.month))].sort();
  const mid = Math.ceil(sortedMonths.length / 2);
  const currentMonths = new Set(sortedMonths.slice(mid));
  const previousMonths = new Set(sortedMonths.slice(0, mid));
  const currentPeriodData =
    sortedMonths.length < 2
      ? data
      : data.filter((row) => currentMonths.has(row.month));
  const previousPeriodData =
    sortedMonths.length < 2
      ? ([] as AdRow[])
      : data.filter((row) => previousMonths.has(row.month));

  const activeCountries = React.useMemo(() => {
    const set = new Set(data.map((r) => r.country));
    return [...set].sort();
  }, [data]);

  // Compute the latest date present in data — used as reference for date picker mode switching
  const handleCopyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex-1">
          <FilterBar
            filters={effectiveFilters}
            onFiltersChange={setFilters}
            options={filterOptions}
            latestDataDate={latestDataDate}
            hiddenFilters={hiddenFilters}
          />
        </div>
        <div className="px-4 lg:px-6 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="shrink-0 gap-1.5 bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
            aria-label="현재 필터 링크 복사"
          >
            <IconLink className="size-3.5" />
            {linkCopied ? "복사됨!" : "링크 복사"}
          </Button>
        </div>
      </div>
      {/* KEYWORD: dashboard-shell-main-flow */}
      <KpiCardsRefined
        summary={kpiSummary}
        isLoading={isLoading}
        changeLabel={
          filters.dateMode === "weekly" ? "전주 대비"
            : filters.dateMode === "monthly" ? "전월 대비"
            : "전 동기간 대비"
        }
      />
      <ChartSection
        trendData={trendData}
        mediumSpendData={mediumSpendData}
        countries={activeCountries}
        isLoading={isLoading}
        chartGranularity={chartGranularity}
        onChartGranularityChange={setChartGranularity}
      />
      {/* P1 charts — 매체/국가 요약 + 도넛 + 작품 랭킹 */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <MediumSummaryTable data={data} isLoading={isLoading} />
        <CountrySummaryTable data={data} isLoading={isLoading} />
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-7 lg:px-6">
        <div className="lg:col-span-4">
          <CreativeRanking data={data} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-3">
          <SpendDonutChart data={data} isLoading={isLoading} />
        </div>
      </div>

      <DashboardDataTable data={data} isLoading={isLoading} />
      <InsightsPanel
        currentData={currentPeriodData}
        previousData={previousPeriodData}
        isLoading={isLoading}
      />
    </div>
  );
}
