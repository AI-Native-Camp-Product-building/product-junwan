"use client";

import * as React from "react";
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
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ChartSection } from "@/components/dashboard/chart-section";
import { DashboardDataTable } from "@/components/dashboard/dashboard-data-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { Button } from "@/components/ui/button";

interface DashboardShellProps {
  initialData: AdRow[];
  filterOptions: FilterOptions;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Compute KPI summary with MoM change. */
function computeKpiSummary(data: AdRow[]): KpiSummary {
  const adSpend = data.reduce((s, r) => s + r.adSpend, 0);
  const revenue = data.reduce((s, r) => s + r.revenue, 0);
  const signups = data.reduce((s, r) => s + r.signups, 0);
  const roas = adSpend > 0 ? (revenue / adSpend) * 100 : 0;

  // Group by month to compute MoM
  const byMonth = new Map<string, AdRow[]>();
  for (const row of data) {
    const existing = byMonth.get(row.month) ?? [];
    existing.push(row);
    byMonth.set(row.month, existing);
  }
  const sortedMonths = [...byMonth.keys()].sort();

  let adSpendChange = 0;
  let revenueChange = 0;
  let roasChange = 0;
  let signupsChange = 0;

  if (sortedMonths.length >= 2) {
    const curr = byMonth.get(sortedMonths[sortedMonths.length - 1])!;
    const prev = byMonth.get(sortedMonths[sortedMonths.length - 2])!;

    const currAdSpend = curr.reduce((s, r) => s + r.adSpend, 0);
    const prevAdSpend = prev.reduce((s, r) => s + r.adSpend, 0);
    const currRevenue = curr.reduce((s, r) => s + r.revenue, 0);
    const prevRevenue = prev.reduce((s, r) => s + r.revenue, 0);
    const currSignups = curr.reduce((s, r) => s + r.signups, 0);
    const prevSignups = prev.reduce((s, r) => s + r.signups, 0);
    const currRoas = currAdSpend > 0 ? (currRevenue / currAdSpend) * 100 : 0;
    const prevRoas = prevAdSpend > 0 ? (prevRevenue / prevAdSpend) * 100 : 0;

    adSpendChange = prevAdSpend > 0 ? ((currAdSpend - prevAdSpend) / prevAdSpend) * 100 : 0;
    revenueChange = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    signupsChange = prevSignups > 0 ? ((currSignups - prevSignups) / prevSignups) * 100 : 0;
    roasChange = currRoas - prevRoas; // pp change
  }

  return { adSpend, revenue, roas, signups, adSpendChange, revenueChange, roasChange, signupsChange };
}

type TrendMetric = "adSpend" | "signups" | "revenue" | "roas";

function computeTrendData(data: AdRow[], metric: TrendMetric): TrendPoint[] {
  const map = new Map<string, Map<string, { adSpend: number; revenue: number; signups: number }>>();

  for (const row of data) {
    if (!map.has(row.month)) map.set(row.month, new Map());
    const countryMap = map.get(row.month)!;
    const existing = countryMap.get(row.country) ?? { adSpend: 0, revenue: 0, signups: 0 };
    existing.adSpend += row.adSpend;
    existing.revenue += row.revenue;
    existing.signups += row.signups;
    countryMap.set(row.country, existing);
  }

  const result: TrendPoint[] = [];
  for (const [period, countryMap] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const point: TrendPoint = { period };
    let totalSpend = 0, totalRevenue = 0, totalSignups = 0;

    for (const [country, agg] of countryMap) {
      totalSpend += agg.adSpend;
      totalRevenue += agg.revenue;
      totalSignups += agg.signups;

      if (metric === "adSpend") point[country] = Math.round(agg.adSpend);
      else if (metric === "signups") point[country] = agg.signups;
      else if (metric === "revenue") point[country] = Math.round(agg.revenue);
      else if (metric === "roas") point[country] = agg.adSpend > 0 ? Math.round((agg.revenue / agg.adSpend) * 100 * 10) / 10 : 0;
    }

    if (metric === "adSpend") point["\uC804\uCCB4"] = Math.round(totalSpend);
    else if (metric === "signups") point["\uC804\uCCB4"] = totalSignups;
    else if (metric === "revenue") point["\uC804\uCCB4"] = Math.round(totalRevenue);
    else if (metric === "roas") point["\uC804\uCCB4"] = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100 * 10) / 10 : 0;

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

/** Read filters from URL search params on initial load. */
function readFiltersFromUrl(options: FilterOptions): DashboardFilters {
  if (typeof window === "undefined") {
    return { countries: [], months: [], mediums: [], goals: [], dateMode: "monthly", dateRange: null };
  }
  const params = new URLSearchParams(window.location.search);
  const parse = (key: string, valid: string[]) => {
    const raw = params.get(key);
    if (!raw) return [];
    return raw.split(",").filter((v) => valid.includes(v));
  };

  const dateMode = (params.get("mode") as DateMode) ?? "monthly";
  const start = params.get("start");
  const end = params.get("end");
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

export function DashboardShell({ initialData, filterOptions }: DashboardShellProps) {
  const [filters, setFilters] = React.useState<DashboardFilters>(() =>
    readFiltersFromUrl(filterOptions)
  );
  const [data, setData] = React.useState<AdRow[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);

  // Sync filters to URL on change
  React.useEffect(() => {
    syncFiltersToUrl(filters);
  }, [filters]);

  const debouncedFilters = useDebounce(filters, 300);

  // Fetch data when filters change (or on initial load)
  React.useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (debouncedFilters.countries.length > 0) params.set("countries", debouncedFilters.countries.join(","));
    if (debouncedFilters.mediums.length > 0) params.set("mediums", debouncedFilters.mediums.join(","));
    if (debouncedFilters.goals.length > 0) params.set("goals", debouncedFilters.goals.join(","));

    // Use dateRange for API if available, otherwise fall back to months
    if (debouncedFilters.dateRange) {
      params.set("startDate", debouncedFilters.dateRange.startDate);
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

  const kpiSummary = React.useMemo(() => computeKpiSummary(data), [data]);
  const mediumSpendData = React.useMemo(() => computeMediumSpend(data), [data]);

  const trendData = React.useMemo(() => ({
    adSpend: computeTrendData(data, "adSpend"),
    signups: computeTrendData(data, "signups"),
    revenue: computeTrendData(data, "revenue"),
    roas: computeTrendData(data, "roas"),
  }), [data]);

  // Split data into current/previous periods for insights
  const { currentPeriodData, previousPeriodData } = React.useMemo(() => {
    const sortedMonths = [...new Set(data.map((r) => r.month))].sort();
    if (sortedMonths.length < 2) {
      return { currentPeriodData: data, previousPeriodData: [] as AdRow[] };
    }
    const mid = Math.ceil(sortedMonths.length / 2);
    const currentMonths = new Set(sortedMonths.slice(mid));
    const previousMonths = new Set(sortedMonths.slice(0, mid));
    return {
      currentPeriodData: data.filter((r) => currentMonths.has(r.month)),
      previousPeriodData: data.filter((r) => previousMonths.has(r.month)),
    };
  }, [data]);

  const activeCountries = React.useMemo(() => {
    const set = new Set(data.map((r) => r.country));
    return [...set].sort();
  }, [data]);

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
            filters={filters}
            onFiltersChange={setFilters}
            options={filterOptions}
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
      <KpiCards summary={kpiSummary} isLoading={isLoading} />
      <ChartSection
        trendData={trendData}
        mediumSpendData={mediumSpendData}
        countries={activeCountries}
        isLoading={isLoading}
      />
      <InsightsPanel
        currentData={currentPeriodData}
        previousData={previousPeriodData}
        isLoading={isLoading}
      />
    </div>
  );
}
