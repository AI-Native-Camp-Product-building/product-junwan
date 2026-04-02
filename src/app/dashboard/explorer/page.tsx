"use client";

import * as React from "react";
import type { AdRow, DashboardFilters, FilterOptions } from "@/types/dashboard";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DashboardDataTable } from "@/components/dashboard/dashboard-data-table";

export default function ExplorerPage() {
  const [filters, setFilters] = React.useState<DashboardFilters>({
    countries: [],
    months: [],
    mediums: [],
    goals: [],
    dateMode: "monthly",
    dateRange: null,
  });
  const [filterOptions, setFilterOptions] = React.useState<FilterOptions>({
    countries: [],
    months: [],
    mediums: [],
    goals: [],
  });
  const [data, setData] = React.useState<AdRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch filter options on mount
  React.useEffect(() => {
    fetch("/api/filters")
      .then((res) => res.json())
      .then((opts) => setFilterOptions(opts))
      .catch(() => {});
  }, []);

  // Fetch data when filters change
  React.useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filters.countries.length > 0) params.set("countries", filters.countries.join(","));
    if (filters.months.length > 0) params.set("months", filters.months.join(","));
    if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","));
    if (filters.goals.length > 0) params.set("goals", filters.goals.join(","));

    fetch(`/api/dashboard?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setData(json.data ?? []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [filters]);

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Data Explorer</h1>
      </div>
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        options={filterOptions}
      />
      <DashboardDataTable data={data} isLoading={isLoading} />
    </div>
  );
}
