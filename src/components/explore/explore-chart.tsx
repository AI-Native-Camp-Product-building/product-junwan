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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QueryResultRow = Record<string, unknown>;

interface ExploreChartProps {
  rows: QueryResultRow[];
  dimensions: string[];
  metrics: string[];
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
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const COMPARE_COLORS = {
  base: "hsl(220,70%,55%)",
  compare: "hsl(0,70%,55%)",
};

// ---------------------------------------------------------------------------
// Helper: aggregate rows by time period, optionally grouping by a series key
// ---------------------------------------------------------------------------

function buildNormalChartData(
  rows: QueryResultRow[],
  timeDim: string,
  seriesDims: string[],
  metricKey: string,
): { data: Record<string, unknown>[]; series: string[] } {
  // Collect all unique periods and series
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

  // Build a lookup: period → seriesLabel → value
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

    // Accumulate (sum) in case multiple rows share same period+series
    const existing = periodMap.get(seriesLabel);
    periodMap.set(seriesLabel, (existing ?? 0) + value);
  }

  // Build recharts data array
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
  // Aggregate each set by time
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

  const allPeriods = Array.from(
    new Set([...baseMap.keys(), ...compareMap.keys()])
  ).sort();

  const data: Record<string, unknown>[] = allPeriods.map((period) => ({
    period,
    [baseLabel]: baseMap.get(period),
    [compareLabel]: compareMap.get(period),
  }));

  return { data, series: [baseLabel, compareLabel] };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExploreChart({
  rows,
  dimensions,
  metrics,
  isCompare = false,
  compareBase,
  compareRows,
  baseLabel = "기준",
  compareLabel = "비교",
}: ExploreChartProps) {
  const [selectedMetric, setSelectedMetric] = React.useState(metrics[0] ?? "");

  // Keep selectedMetric in sync when metrics prop changes
  React.useEffect(() => {
    if (metrics.length > 0 && !metrics.includes(selectedMetric)) {
      setSelectedMetric(metrics[0]);
    }
  }, [metrics, selectedMetric]);

  // Determine time dimension — must exist or we render nothing
  const timeDim = dimensions.find((d) => d === "date" || d === "month");

  // Other dimensions become series keys
  const seriesDims = dimensions.filter((d) => d !== "date" && d !== "month");

  // Build chart data
  const { chartData, seriesKeys } = React.useMemo(() => {
    if (!timeDim || !selectedMetric) return { chartData: [], seriesKeys: [] };

    if (isCompare && compareBase && compareRows) {
      const { data, series } = buildCompareChartData(
        compareBase,
        compareRows,
        timeDim,
        selectedMetric,
        baseLabel,
        compareLabel,
      );
      return { chartData: data, seriesKeys: series };
    }

    const { data, series } = buildNormalChartData(
      rows,
      timeDim,
      seriesDims,
      selectedMetric,
    );
    return { chartData: data, seriesKeys: series };
  }, [timeDim, selectedMetric, isCompare, compareBase, compareRows, rows, seriesDims, baseLabel, compareLabel]);

  // Build ChartConfig for shadcn chart
  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    if (isCompare && compareBase && compareRows) {
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
  }, [isCompare, compareBase, compareRows, baseLabel, compareLabel, seriesKeys]);

  // Metric formatter
  const metricMeta = METRIC_MAP.get(selectedMetric as Parameters<typeof METRIC_MAP.get>[0]);
  const formatValue = metricMeta?.format ?? ((v: number) => v.toLocaleString());

  // Don't render if no time dimension
  if (!timeDim) return null;

  // Don't render if no data
  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">추이</CardTitle>
        {metrics.length > 1 && (
          <Select value={selectedMetric} onValueChange={(v) => { if (v) setSelectedMetric(v); }}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
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
                isCompare && compareBase && compareRows
                  ? i === 0
                    ? COMPARE_COLORS.base
                    : COMPARE_COLORS.compare
                  : CHART_VARS[i % CHART_VARS.length];
              return (
                <Line
                  key={key}
                  type="monotone"
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

        {/* Legend */}
        {seriesKeys.length > 1 && (
          <div className="flex flex-wrap gap-3 pt-2 justify-center">
            {seriesKeys.map((key, i) => {
              const color =
                isCompare && compareBase && compareRows
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
