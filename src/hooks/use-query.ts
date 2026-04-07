"use client";

import * as React from "react";
import type {
  QueryDefinition,
  QueryResponse,
  DimensionKey,
  MetricKey,
  FilterCondition,
  DateRange,
  CompareConfig,
} from "@/types/query";
import { isCompareResult } from "@/types/query";

interface UseQueryState {
  // Query definition
  dimensions: DimensionKey[];
  metrics: MetricKey[];
  filters: FilterCondition[];
  dateRange: DateRange | null;
  compareEnabled: boolean;
  compare: CompareConfig | undefined;
  sort: { field: string; direction: "asc" | "desc" } | undefined;

  // Result
  result: QueryResponse | null;
  isLoading: boolean;
  error: string | null;

  // Filter value options (for dropdowns)
  filterValueOptions: Map<string, string[]>;
}

interface UseQueryActions {
  setDimensions: (dims: DimensionKey[]) => void;
  setMetrics: (metrics: MetricKey[]) => void;
  setFilters: (filters: FilterCondition[]) => void;
  setDateRange: (range: DateRange | null) => void;
  setCompareEnabled: (enabled: boolean) => void;
  setCompare: (config: CompareConfig | undefined) => void;
  setSort: (sort: { field: string; direction: "asc" | "desc" } | undefined) => void;
  execute: () => Promise<void>;
}

export type UseQueryReturn = UseQueryState & UseQueryActions;

export function useExploreQuery(): UseQueryReturn {
  const [dimensions, setDimensions] = React.useState<DimensionKey[]>(["country"]);
  const [metrics, setMetrics] = React.useState<MetricKey[]>(["ad_spend_krw", "roas"]);
  const [filters, setFilters] = React.useState<FilterCondition[]>([]);
  const [dateRange, setDateRange] = React.useState<DateRange | null>(null);
  const [compareEnabled, setCompareEnabled] = React.useState(false);
  const [compare, setCompare] = React.useState<CompareConfig | undefined>();
  const [sort, setSort] = React.useState<{ field: string; direction: "asc" | "desc" } | undefined>();
  const [result, setResult] = React.useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterValueOptions, setFilterValueOptions] = React.useState<Map<string, string[]>>(new Map());

  // Fetch filter options on mount
  React.useEffect(() => {
    fetch("/api/filters")
      .then((res) => res.json())
      .then((data) => {
        const map = new Map<string, string[]>();
        if (data.countries) map.set("country", data.countries);
        if (data.months) map.set("month", data.months);
        if (data.mediums) map.set("medium", data.mediums);
        if (data.goals) map.set("goal", data.goals);
        setFilterValueOptions(map);
      })
      .catch(() => {});
  }, []);

  const execute = React.useCallback(async () => {
    if (metrics.length === 0) {
      setError("최소 1개의 지표를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const query: QueryDefinition = {
      dimensions,
      metrics,
      filters: filters.filter((f) => f.value !== "" && f.value !== undefined),
      dateRange,
      compare: compareEnabled ? compare : undefined,
      sort,
      limit: 1000,
    };

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "쿼리 실행에 실패했습니다.");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setIsLoading(false);
    }
  }, [dimensions, metrics, filters, dateRange, compareEnabled, compare, sort]);

  return {
    dimensions,
    metrics,
    filters,
    dateRange,
    compareEnabled,
    compare,
    sort,
    result,
    isLoading,
    error,
    filterValueOptions,
    setDimensions,
    setMetrics,
    setFilters,
    setDateRange,
    setCompareEnabled,
    setCompare,
    setSort,
    execute,
  };
}
