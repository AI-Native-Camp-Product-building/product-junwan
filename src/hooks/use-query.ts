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
import { DERIVED_METRIC_COMPONENTS, METRICS } from "@/config/query-schema";

const ALL_METRIC_KEYS = new Set(METRICS.map((m) => m.key));

/** 지표 필터를 서버에서 제외 → 클라이언트에서 집계 후 적용 */
function splitFilters(filters: FilterCondition[]): {
  serverFilters: FilterCondition[];
  clientFilters: FilterCondition[];
} {
  const serverFilters: FilterCondition[] = [];
  const clientFilters: FilterCondition[] = [];
  for (const f of filters) {
    if (ALL_METRIC_KEYS.has(f.field as MetricKey)) {
      clientFilters.push(f);
    } else {
      serverFilters.push(f);
    }
  }
  return { serverFilters, clientFilters };
}

/** 클라이언트 필터 적용 (파생지표 범위 필터) */
function applyClientFilters(
  rows: Record<string, unknown>[],
  clientFilters: FilterCondition[],
): Record<string, unknown>[] {
  if (clientFilters.length === 0) return rows;
  return rows.filter((row) =>
    clientFilters.every((f) => {
      const val = Number(row[f.field] ?? 0);
      switch (f.operator) {
        case "gt": return val > Number(f.value);
        case "gte": return val >= Number(f.value);
        case "lt": return val < Number(f.value);
        case "lte": return val <= Number(f.value);
        case "eq": return val === Number(f.value);
        case "neq": return val !== Number(f.value);
        default: return true;
      }
    }),
  );
}

/** 파생 지표 선택 시 기반 지표 자동 포함 */
function ensureBaseMetrics(metrics: MetricKey[]): MetricKey[] {
  const result = [...metrics];
  for (const m of metrics) {
    const derived = DERIVED_METRIC_COMPONENTS[m];
    if (!derived) continue;
    for (const base of derived.components) {
      if (!result.includes(base)) {
        result.push(base);
      }
    }
  }
  return result;
}

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
  loadQuery: (query: QueryDefinition) => void;
  buildQueryDefinition: () => QueryDefinition;
  addOrUpdateFilter: (field: string, operator: FilterCondition["operator"], value: FilterCondition["value"]) => void;
  removeFilter: (field: string) => void;
}

export type UseQueryReturn = UseQueryState & UseQueryActions;

export function useExploreQuery(): UseQueryReturn {
  const [dimensions, setDimensions] = React.useState<DimensionKey[]>(["country"]);
  const [metrics, setMetricsRaw] = React.useState<MetricKey[]>(ensureBaseMetrics(["ad_spend_krw", "roas"]));
  const setMetrics = React.useCallback((m: MetricKey[]) => setMetricsRaw(ensureBaseMetrics(m)), []);
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
    const controller = new AbortController();
    fetch("/api/filters", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const map = new Map<string, string[]>();
        if (data.countries) map.set("country", data.countries);
        if (data.months) map.set("month", data.months);
        if (data.mediums) map.set("medium", data.mediums);
        if (data.goals) map.set("goal", data.goals);
        setFilterValueOptions(map);
      })
      .catch(() => {
        // Silenced: abort on unmount or network failure
      });
    return () => controller.abort();
  }, []);

  const execute = React.useCallback(async () => {
    if (metrics.length === 0) {
      setError("최소 1개의 지표를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const validFilters = filters.filter((f) => f.value !== "" && f.value !== undefined);
    const { serverFilters, clientFilters } = splitFilters(validFilters);

    const query: QueryDefinition = {
      dimensions,
      metrics,
      filters: serverFilters,
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

      // 파생지표 필터는 클라이언트에서 적용
      if (clientFilters.length > 0 && data.rows) {
        data.rows = applyClientFilters(data.rows, clientFilters);
        data.totalRows = data.rows.length;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setIsLoading(false);
    }
  }, [dimensions, metrics, filters, dateRange, compareEnabled, compare, sort]);

  const loadQuery = React.useCallback(
    (query: QueryDefinition) => {
      setDimensions(query.dimensions);
      setMetrics(query.metrics);
      setFilters(query.filters);
      setDateRange(query.dateRange);
      setSort(query.sort);
      if (query.compare) {
        setCompareEnabled(true);
        setCompare(query.compare);
      } else {
        setCompareEnabled(false);
        setCompare(undefined);
      }
    },
    [],
  );

  const addOrUpdateFilter = React.useCallback(
    (field: string, operator: FilterCondition["operator"], value: FilterCondition["value"]) => {
      setFilters((prev) => {
        const idx = prev.findIndex((f) => f.field === field);
        const newFilter: FilterCondition = { field: field as DimensionKey | MetricKey, operator, value };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newFilter;
          return next;
        }
        return [...prev, newFilter];
      });
    },
    [],
  );

  const removeFilter = React.useCallback(
    (field: string) => {
      setFilters((prev) => prev.filter((f) => f.field !== field));
    },
    [],
  );

  const buildQueryDefinition = React.useCallback((): QueryDefinition => {
    return {
      dimensions,
      metrics,
      filters: filters.filter((f) => f.value !== "" && f.value !== undefined),
      dateRange,
      compare: compareEnabled ? compare : undefined,
      sort,
    };
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
    loadQuery,
    buildQueryDefinition,
    addOrUpdateFilter,
    removeFilter,
  };
}
