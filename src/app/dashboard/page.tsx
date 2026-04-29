import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { fetchFilterOptions, fetchLatestDataDate } from "@/lib/dashboard-queries";
import { fetchOverviewReport } from "@/lib/report-queries";
import type { DashboardFilters } from "@/types/dashboard";

export const dynamic = "force-dynamic";

function getMonthlyDateRange(latestDataDate?: string) {
  const referenceDate = latestDataDate ? new Date(latestDataDate) : new Date();
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default async function DashboardPage() {
  const [filterOptions, latestDataDate] = await Promise.all([
    fetchFilterOptions(),
    fetchLatestDataDate(),
  ]);
  const initialDateRange = getMonthlyDateRange(latestDataDate);
  const initialFilters: DashboardFilters = {
    countries: [],
    months: [],
    mediums: [],
    goals: [],
    dateMode: "monthly",
    dateRange: initialDateRange,
    startDate: initialDateRange.startDate,
    endDate: initialDateRange.endDate,
  };
  const initialReport = await fetchOverviewReport({
    countries: [],
    mediums: [],
    goals: [],
    startDate: initialDateRange.startDate,
    endDate: initialDateRange.endDate,
  });

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Overview</h1>
      </div>
      <DashboardShell
        initialData={[]}
        filterOptions={filterOptions}
        initialFilters={initialFilters}
        initialReport={initialReport}
        latestDataDate={latestDataDate}
      />
    </div>
  );
}
