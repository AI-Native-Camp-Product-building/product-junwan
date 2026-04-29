import { LocaleDetailView } from "@/components/dashboard/locale-detail-view";
import { fetchDashboardData, fetchFilterOptions } from "@/lib/dashboard-queries";
import { getDefaultLocale } from "@/lib/locales";
import { fetchLocaleReport } from "@/lib/report-queries";
import type { DashboardFilters } from "@/types/dashboard";

export const dynamic = "force-dynamic";

type LocaleSearchParams = Record<string, string | string[] | undefined>;

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

function buildInitialFilters(params: LocaleSearchParams, locale: string): DashboardFilters {
  const startDate = firstValue(params.startDate) ?? firstValue(params.start);
  const endDate = firstValue(params.endDate) ?? firstValue(params.end);
  const dateRange = startDate && endDate ? { startDate, endDate } : null;

  return {
    countries: [locale],
    months: parseCommaSeparated(params.months),
    mediums: parseCommaSeparated(params.mediums),
    goals: parseCommaSeparated(params.goals),
    dateMode: (firstValue(params.mode) as DashboardFilters["dateMode"]) ?? "monthly",
    dateRange,
    startDate: startDate && endDate ? startDate : undefined,
    endDate: startDate && endDate ? endDate : undefined,
  };
}

function buildInitialRequestKey(filters: DashboardFilters, locale: string): string {
  const params = new URLSearchParams();
  params.set("locale", locale);
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

export default async function LocalePage({
  searchParams,
}: {
  searchParams: Promise<LocaleSearchParams>;
}) {
  const params = await searchParams;
  const initialLocale = getDefaultLocale(firstValue(params.locale));
  const initialFilters = buildInitialFilters(params, initialLocale);
  const initialRequestKey = buildInitialRequestKey(initialFilters, initialLocale);

  const [{ data: initialData }, filterOptions, initialReport] = await Promise.all([
    fetchDashboardData(initialFilters),
    fetchFilterOptions(),
    fetchLocaleReport(initialLocale, {
      mediums: initialFilters.mediums,
      goals: initialFilters.goals,
      startDate: initialFilters.startDate,
      endDate: initialFilters.endDate,
    }),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-6">
      <LocaleDetailView
        initialData={initialData}
        filterOptions={filterOptions}
        initialLocale={initialLocale}
        initialReport={initialReport}
        initialRequestKey={initialRequestKey}
      />
    </div>
  );
}
