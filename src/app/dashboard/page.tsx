import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { fetchDashboardData, fetchFilterOptions } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ data: initialData }, filterOptions] = await Promise.all([
    fetchDashboardData({ countries: [], months: [], mediums: [], goals: [] }),
    fetchFilterOptions(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Overview</h1>
      </div>
      <DashboardShell
        initialData={initialData}
        filterOptions={filterOptions}
      />
    </div>
  );
}
