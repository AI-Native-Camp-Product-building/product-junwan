import { LocaleDetailView } from "@/components/dashboard/locale-detail-view";
import { fetchDashboardData, fetchFilterOptions } from "@/lib/dashboard-queries";
import { getDefaultLocale } from "@/lib/locales";

export const dynamic = "force-dynamic";

export default async function LocalePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const initialLocale = getDefaultLocale(params.locale);

  const [{ data: initialData }, filterOptions] = await Promise.all([
    fetchDashboardData({
      countries: [],
      months: [],
      mediums: [],
      goals: [],
      dateMode: "monthly",
      dateRange: null,
    }),
    fetchFilterOptions(),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-6">
      <LocaleDetailView
        initialData={initialData}
        filterOptions={filterOptions}
        initialLocale={initialLocale}
      />
    </div>
  );
}
