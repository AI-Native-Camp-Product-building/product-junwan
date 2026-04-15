"use client";

import * as React from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METRIC_MAP } from "@/config/query-schema";
import type { DateRange, FilterCondition, DimensionKey, MetricKey } from "@/types/query";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { startOfWeek, format as fnsFormat } from "date-fns";
import type { CurveType } from "recharts/types/shape/Curve";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QueryResultRow = Record<string, unknown>;

type Granularity = "daily" | "weekly" | "monthly";

interface ExploreChartProps {
  /** Main query result rows (used when timeDim already in dimensions) */
  rows: QueryResultRow[];
  dimensions: string[];
  metrics: string[];
  /** Date range from query builder — if set, chart always renders */
  dateRange?: DateRange | null;
  /** Filters from query builder — used for self-fetch */
  filters?: FilterCondition[];
  /** Compare mode */
  isCompare?: boolean;
  compareBase?: QueryResultRow[];
  compareRows?: QueryResultRow[];
  baseLabel?: string;
  compareLabel?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_VARS = [
  "hsl(220, 70%, 55%)",   // 파랑
  "hsl(0, 70%, 55%)",     // 빨강
  "hsl(145, 60%, 45%)",   // 초록
  "hsl(35, 90%, 55%)",    // 주황
  "hsl(280, 60%, 55%)",   // 보라
  "hsl(180, 60%, 45%)",   // 청록
  "hsl(330, 65%, 55%)",   // 핑크
  "hsl(60, 70%, 45%)",    // 올리브
  "hsl(200, 80%, 50%)",   // 하늘
  "hsl(15, 75%, 50%)",    // 갈색
];

const COMPARE_COLORS = {
  base: "hsl(220,70%,55%)",
  compare: "hsl(0,70%,55%)",
};

const CURVE_TYPES: CurveType[] = ["linear", "monotone", "natural", "basis"];

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "일별" },
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월별" },
];

/** Map granularity to the DB dimension used for fetching.
 *  weekly → fetch by "date" and aggregate client-side (no week dim in RPC). */
function granularityToDimension(g: Granularity): DimensionKey {
  switch (g) {
    case "daily": return "date";
    case "weekly": return "date"; // fetch daily, aggregate to weeks client-side
    case "monthly": return "month";
  }
}

/** Aggregate daily rows into weekly buckets (Monday-start). */
function aggregateToWeeks(rows: QueryResultRow[], timeDim: string): QueryResultRow[] {
  const grouped = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const dateStr = String(row[timeDim] ?? "");
    if (!dateStr) continue;
    const weekStart = fnsFormat(startOfWeek(new Date(dateStr), { weekStartsOn: 1 }), "yyyy-MM-dd");

    if (!grouped.has(weekStart)) {
      grouped.set(weekStart, new Map());
    }
    const weekMap = grouped.get(weekStart)!;

    // Copy non-time dimension values (take first occurrence)
    for (const [key, val] of Object.entries(row)) {
      if (key === timeDim) continue;
      if (typeof val === "number") {
        weekMap.set(key, (weekMap.get(key) ?? 0) + val);
      } else if (!weekMap.has(key)) {
        weekMap.set(key, val as number);
      }
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, values]) => {
      const result: QueryResultRow = { [timeDim]: weekStart };
      for (const [k, v] of values.entries()) {
        result[k] = v;
      }
      return result;
    });
}

// ---------------------------------------------------------------------------
// Helper: aggregate rows by time period, optionally grouping by a series key
// ---------------------------------------------------------------------------

function buildNormalChartData(
  rows: QueryResultRow[],
  timeDim: string,
  seriesDims: string[],
  metricKey: string,
): { data: Record<string, unknown>[]; series: string[] } {
  const periodSet = new Set<string>();
  const seriesSet = new Set<string>();

  for (const row of rows) {
    const period = String(row[timeDim] ?? "");
    if (period) periodSet.add(period);

    if (seriesDims.length > 0) {
      const seriesLabel = seriesDims.map((d) => String(row[d] ?? "")).join(" / ");
      seriesSet.add(seriesLabel);
    }
  }

  const hasSeries = seriesDims.length > 0 && seriesSet.size > 0;
  const allSeries = hasSeries ? Array.from(seriesSet) : ["전체"];
  const allPeriods = Array.from(periodSet).sort();

  const lookup = new Map<string, Map<string, number>>();
  for (const period of allPeriods) {
    lookup.set(period, new Map());
  }

  for (const row of rows) {
    const period = String(row[timeDim] ?? "");
    if (!period) continue;
    const rawValue = row[metricKey];
    const value = rawValue !== null && rawValue !== undefined ? Number(rawValue) : undefined;
    if (value === undefined || isNaN(value)) continue;

    const seriesLabel = hasSeries
      ? seriesDims.map((d) => String(row[d] ?? "")).join(" / ")
      : "전체";

    const periodMap = lookup.get(period);
    if (!periodMap) continue;

    const existing = periodMap.get(seriesLabel);
    periodMap.set(seriesLabel, (existing ?? 0) + value);
  }

  const data: Record<string, unknown>[] = allPeriods.map((period) => {
    const point: Record<string, unknown> = { period };
    const periodMap = lookup.get(period);
    for (const s of allSeries) {
      const val = periodMap?.get(s);
      point[s] = val !== undefined ? val : undefined;
    }
    return point;
  });

  return { data, series: allSeries };
}

function buildCompareChartData(
  baseRows: QueryResultRow[],
  compareRows: QueryResultRow[],
  timeDim: string,
  metricKey: string,
  baseLabel: string,
  compareLabel: string,
): { data: Record<string, unknown>[]; series: string[] } {
  function aggregate(rows: QueryResultRow[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      const period = String(row[timeDim] ?? "");
      if (!period) continue;
      const rawValue = row[metricKey];
      const value = rawValue !== null && rawValue !== undefined ? Number(rawValue) : undefined;
      if (value === undefined || isNaN(value)) continue;
      map.set(period, (map.get(period) ?? 0) + value);
    }
    return map;
  }

  const baseMap = aggregate(baseRows);
  const compareMap = aggregate(compareRows);

  const basePeriods = [...baseMap.keys()].sort();
  const comparePeriods = [...compareMap.keys()].sort();
  const maxLen = Math.max(basePeriods.length, comparePeriods.length);

  const data: Record<string, unknown>[] = [];
  for (let i = 0; i < maxLen; i++) {
    const basePeriod = basePeriods[i];
    const comparePeriod = comparePeriods[i];
    const label = basePeriod
      ? basePeriod.replace(/^\d{4}-/, "")
      : (comparePeriod ? comparePeriod.replace(/^\d{4}-/, "") : `${i + 1}`);
    const point: Record<string, unknown> = { period: label };
    if (basePeriod) point[baseLabel] = baseMap.get(basePeriod);
    if (comparePeriod) point[compareLabel] = compareMap.get(comparePeriod);
    data.push(point);
  }

  return { data, series: [baseLabel, compareLabel] };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExploreChart({
  rows,
  dimensions,
  metrics,
  dateRange,
  filters,
  isCompare = false,
  compareBase,
  compareRows,
  baseLabel = "기준",
  compareLabel = "비교",
}: ExploreChartProps) {
  const [selectedMetric, setSelectedMetric] = React.useState(metrics[0] ?? "");
  const [granularity, setGranularity] = React.useState<Granularity>("daily");
  const [curveStep, setCurveStep] = React.useState(1);
  const curveType = CURVE_TYPES[curveStep];
  const [chartRows, setChartRows] = React.useState<QueryResultRow[] | null>(null);
  const [chartCompareBase, setChartCompareBase] = React.useState<QueryResultRow[] | null>(null);
  const [chartCompareRows, setChartCompareRows] = React.useState<QueryResultRow[] | null>(null);
  const [isChartLoading, setIsChartLoading] = React.useState(false);

  // Keep selectedMetric in sync when metrics prop changes
  React.useEffect(() => {
    if (metrics.length > 0 && !metrics.includes(selectedMetric)) {
      setSelectedMetric(metrics[0]);
    }
  }, [metrics, selectedMetric]);

  // Check if main query already has a time dimension
  const existingTimeDim = dimensions.find((d) => d === "date" || d === "month" || d === "week");
  const seriesDims = dimensions.filter((d) => d !== "date" && d !== "month" && d !== "week");

  // Self-fetch needed when:
  // 1. No time dimension in main query but dateRange is set
  // 2. Main query has a time dimension but granularity doesn't match
  //    (e.g. main has "date" but user wants "monthly", or main has "month" but user wants "daily")
  const granularityDim = granularityToDimension(granularity);
  const needsSelfFetch = !!dateRange && (!existingTimeDim || (existingTimeDim !== granularityDim && granularity !== "weekly"));

  // Self-fetch chart data when needed
  React.useEffect(() => {
    if (!needsSelfFetch || metrics.length === 0) {
      setChartRows(null);
      setChartCompareBase(null);
      setChartCompareRows(null);
      return;
    }

    const controller = new AbortController();
    setIsChartLoading(true);

    const timeDimKey = granularityToDimension(granularity);
    const chartDimensions = [timeDimKey, ...seriesDims] as DimensionKey[];
    const validFilters = (filters ?? []).filter((f) => f.value !== "" && f.value !== undefined);

    const query = {
      dimensions: chartDimensions,
      metrics,
      filters: validFilters,
      dateRange,
      sort: { field: timeDimKey, direction: "asc" as const },
      limit: 5000,
    };

    fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const applyWeekly = (r: QueryResultRow[]) =>
          granularity === "weekly" ? aggregateToWeeks(r, timeDimKey) : r;

        if (data.rows) {
          setChartRows(applyWeekly(data.rows));
        }
        // Compare mode results
        if (data.base?.rows && data.compare?.rows) {
          setChartCompareBase(applyWeekly(data.base.rows));
          setChartCompareRows(applyWeekly(data.compare.rows));
        }
      })
      .catch(() => { /* abort or network error */ })
      .finally(() => setIsChartLoading(false));

    return () => controller.abort();
  }, [needsSelfFetch, granularity, metrics, filters, dateRange, seriesDims.join(",")]);

  // Determine effective data source
  // When main query has "date" and user selects "weekly", aggregate client-side
  const useWeeklyOnExisting = granularity === "weekly" && existingTimeDim === "date" && !needsSelfFetch;
  const effectiveTimeDim = needsSelfFetch ? granularityDim : existingTimeDim;

  const effectiveRows = React.useMemo(() => {
    if (needsSelfFetch) return chartRows ?? [];
    if (useWeeklyOnExisting) return aggregateToWeeks(rows, "date");
    return rows;
  }, [needsSelfFetch, useWeeklyOnExisting, chartRows, rows]);

  const effectiveCompareBase = React.useMemo(() => {
    if (needsSelfFetch) return chartCompareBase ?? compareBase;
    if (useWeeklyOnExisting && compareBase) return aggregateToWeeks(compareBase, "date");
    return compareBase;
  }, [needsSelfFetch, useWeeklyOnExisting, chartCompareBase, compareBase]);

  const effectiveCompareRows = React.useMemo(() => {
    if (needsSelfFetch) return chartCompareRows ?? compareRows;
    if (useWeeklyOnExisting && compareRows) return aggregateToWeeks(compareRows, "date");
    return compareRows;
  }, [needsSelfFetch, useWeeklyOnExisting, chartCompareRows, compareRows]);

  // Build chart data
  const { chartData, seriesKeys } = React.useMemo(() => {
    if (!effectiveTimeDim || !selectedMetric) return { chartData: [], seriesKeys: [] };

    if (isCompare && effectiveCompareBase && effectiveCompareRows) {
      const { data, series } = buildCompareChartData(
        effectiveCompareBase,
        effectiveCompareRows,
        effectiveTimeDim,
        selectedMetric,
        baseLabel,
        compareLabel,
      );
      return { chartData: data, seriesKeys: series };
    }

    const { data, series } = buildNormalChartData(
      effectiveRows,
      effectiveTimeDim,
      seriesDims,
      selectedMetric,
    );
    return { chartData: data, seriesKeys: series };
  }, [effectiveTimeDim, selectedMetric, isCompare, effectiveCompareBase, effectiveCompareRows, effectiveRows, seriesDims, baseLabel, compareLabel]);

  // Build ChartConfig for shadcn chart
  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    if (isCompare && effectiveCompareBase && effectiveCompareRows) {
      config[baseLabel] = { label: baseLabel, color: COMPARE_COLORS.base };
      config[compareLabel] = { label: compareLabel, color: COMPARE_COLORS.compare };
    } else {
      seriesKeys.forEach((key, i) => {
        config[key] = {
          label: key,
          color: CHART_VARS[i % CHART_VARS.length],
        };
      });
    }
    return config;
  }, [isCompare, effectiveCompareBase, effectiveCompareRows, baseLabel, compareLabel, seriesKeys]);

  // Metric formatter
  const metricMeta = METRIC_MAP.get(selectedMetric as Parameters<typeof METRIC_MAP.get>[0]);
  const formatValue = metricMeta?.format ?? ((v: number) => v.toLocaleString());

  // Determine current granularity for toggle highlight (from main query's time dim)
  const activeGranularity = React.useMemo<Granularity>(() => {
    if (needsSelfFetch) return granularity;
    if (existingTimeDim === "date") return "daily";
    if (existingTimeDim === "week") return "weekly";
    if (existingTimeDim === "month") return "monthly";
    return granularity;
  }, [needsSelfFetch, existingTimeDim, granularity]);

  // Don't render if no dateRange and no time dimension
  if (!effectiveTimeDim && !dateRange) return null;

  // Show loading state
  if (isChartLoading && chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[300px]">
          <span className="text-sm text-muted-foreground">차트 로딩 중...</span>
        </CardContent>
      </Card>
    );
  }

  // No data
  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">추이</CardTitle>
        <div className="flex items-center gap-2">
          {/* Granularity toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            {GRANULARITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGranularity(opt.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  activeGranularity === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Metric selector */}
          {metrics.length > 1 && (
            <Select value={selectedMetric} onValueChange={(v) => { if (v) setSelectedMetric(v); }}>
              <SelectTrigger size="sm" className="w-[140px]">
                <span className="truncate">
                  {METRIC_MAP.get(selectedMetric as Parameters<typeof METRIC_MAP.get>[0])?.label ?? selectedMetric}
                </span>
              </SelectTrigger>
              <SelectContent>
                {metrics.map((m) => {
                  const meta = METRIC_MAP.get(m as Parameters<typeof METRIC_MAP.get>[0]);
                  return (
                    <SelectItem key={m} value={m}>
                      {meta?.label ?? m}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickMargin={4}
              tickFormatter={(v: number) => formatValue(v)}
              width={72}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatValue(Number(value))}
                />
              }
            />
            {seriesKeys.map((key, i) => {
              const color =
                isCompare && effectiveCompareBase && effectiveCompareRows
                  ? i === 0
                    ? COMPARE_COLORS.base
                    : COMPARE_COLORS.compare
                  : CHART_VARS[i % CHART_VARS.length];
              return (
                <Line
                  key={key}
                  type={curveType}
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              );
            })}
          </LineChart>
        </ChartContainer>

        {/* Curve smoothness slider */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-[10px] text-muted-foreground select-none">직선</span>
          <Slider
            value={curveStep}
            onValueChange={setCurveStep}
            min={0}
            max={3}
            step={1}
            className="w-32"
          />
          <span className="text-[10px] text-muted-foreground select-none">곡선</span>
        </div>

        {/* Legend */}
        {seriesKeys.length > 1 && (
          <div className="flex flex-wrap gap-3 pt-2 justify-center">
            {seriesKeys.map((key, i) => {
              const color =
                isCompare && effectiveCompareBase && effectiveCompareRows
                  ? i === 0
                    ? COMPARE_COLORS.base
                    : COMPARE_COLORS.compare
                  : CHART_VARS[i % CHART_VARS.length];
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {key}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
