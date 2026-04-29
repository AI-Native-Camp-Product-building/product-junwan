import { TitleOverviewView } from "@/components/dashboard/title-overview-view";
import { fetchDashboardData, fetchFilterOptions } from "@/lib/dashboard-queries";
import { fetchTitlesReport } from "@/lib/report-queries";
import type { DashboardFilters } from "@/types/dashboard";
import type { TitlePeriodMode } from "@/types/reports";

export const dynamic = "force-dynamic";

type TitlesSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseCommaSeparated(value: string | string[] | undefined): string[] {
  const raw = firstValue(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildInitialFilters(params: TitlesSearchParams): DashboardFilters {
  const startDate = firstValue(params.startDate) ?? firstValue(params.start);
  const endDate = firstValue(params.endDate) ?? firstValue(params.end);
  const dateRange = startDate && endDate ? { startDate, endDate } : null;

  return {
    countries: parseCommaSeparated(params.countries),
    months: parseCommaSeparated(params.months),
    mediums: parseCommaSeparated(params.mediums),
    goals: parseCommaSeparated(params.goals),
    dateMode: (firstValue(params.mode) as DashboardFilters["dateMode"]) ?? "monthly",
    dateRange,
    startDate: startDate && endDate ? startDate : undefined,
    endDate: startDate && endDate ? endDate : undefined,
  };
}

function buildInitialRequestKey(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  if (filters.countries.length > 0) params.set("countries", filters.countries.join(","));
  if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","));
  if (filters.goals.length > 0) params.set("goals", filters.goals.join(","));
  if (filters.startDate && filters.endDate) {
    params.set("startDate", filters.startDate);
    params.set("endDate", filters.endDate);
  } else if (filters.months.length > 0) {
    params.set("months", filters.months.join(","));
  }
  return params.toString();
}

function getPeriodMode(value: string | string[] | undefined): TitlePeriodMode {
  const raw = firstValue(value);
  return raw === "month" || raw === "week" ? raw : "all";
}

function buildReportRequestKey(
  filters: DashboardFilters,
  periodMode: TitlePeriodMode,
  period: string,
): string {
  const params = new URLSearchParams(buildInitialRequestKey(filters));
  params.set("periodMode", periodMode);
  params.set("period", period);
  return params.toString();
}

export default async function TitlesPage({
  searchParams,
}: {
  searchParams: Promise<TitlesSearchParams>;
}) {
  const params = await searchParams;
  const initialFilters = buildInitialFilters(params);
  const initialPeriodMode = getPeriodMode(params.periodMode);
  const initialPeriod = firstValue(params.period) ?? "all";
  const initialRequestKey = buildReportRequestKey(
    initialFilters,
    initialPeriodMode,
    initialPeriod,
  );

  const [{ data: initialData }, filterOptions, initialReport] = await Promise.all([
    fetchDashboardData(initialFilters),
    fetchFilterOptions(),
    fetchTitlesReport(
      {
        countries: initialFilters.countries,
        mediums: initialFilters.mediums,
        goals: initialFilters.goals,
        startDate: initialFilters.startDate,
        endDate: initialFilters.endDate,
      },
      initialPeriodMode,
      initialPeriod,
    ),
  ]);

  return (
    <TitleOverviewView
      initialData={initialData}
      filterOptions={filterOptions}
      initialReport={initialReport}
      initialRequestKey={initialRequestKey}
    />
  );
}
