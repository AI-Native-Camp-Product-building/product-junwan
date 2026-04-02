import { fetchDashboardData, fetchFilterOptions } from "@/lib/dashboard-queries";
import { PlatformView } from "@/components/dashboard/platform-view";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const [{ data: initialData }, filterOptions] = await Promise.all([
    fetchDashboardData({ countries: [], months: [], mediums: [], goals: [], dateMode: "monthly", dateRange: null }),
    fetchFilterOptions(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">플랫폼별 성과</h1>
      </div>
      <PlatformView initialData={initialData} filterOptions={filterOptions} platforms={filterOptions.countries} />
    </div>
  );
}
