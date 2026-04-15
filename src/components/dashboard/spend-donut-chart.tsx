"use client";

import * as React from "react";
import { Pie, PieChart, Cell } from "recharts";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import type { AdRow } from "@/types/dashboard";
import { formatKrw, formatPercent } from "@/lib/format";
import { buildExploreUrl } from "@/lib/explore-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { getCountryColor } from "@/lib/constants";

const FALLBACK_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 60%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 60%, 55%)",
  "hsl(190, 80%, 42%)",
  "hsl(330, 65%, 50%)",
  "hsl(45, 85%, 55%)",
];

type GroupBy = "country" | "medium";

interface SpendDonutChartProps {
  data: AdRow[];
  isLoading: boolean;
}

interface SliceData {
  name: string;
  value: number;
  pct: number;
}

function aggregateBy(data: AdRow[], groupBy: GroupBy): SliceData[] {
  const map = new Map<string, number>();
  for (const row of data) {
    const key = groupBy === "country" ? row.country : row.medium;
    map.set(key, (map.get(key) ?? 0) + row.adSpend);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function getSliceColor(name: string, index: number, groupBy: GroupBy): string {
  if (groupBy === "country") return getCountryColor(name, index);
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const chartConfig: ChartConfig = {
  value: { label: "광고비" },
};

export function SpendDonutChart({ data, isLoading }: SpendDonutChartProps) {
  const [groupBy, setGroupBy] = React.useState<GroupBy>("country");

  const slices = React.useMemo(() => aggregateBy(data, groupBy), [data, groupBy]);
  const total = React.useMemo(() => slices.reduce((s, d) => s + d.value, 0), [slices]);

  const exploreUrl = buildExploreUrl({
    dimensions: [groupBy === "country" ? "country" : "medium"],
    metrics: ["ad_spend_krw", "revenue_krw", "roas"],
    sort: { field: "ad_spend_krw", direction: "desc" },
  });

  if (isLoading) {
    return (
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader><CardTitle>광고비 비중</CardTitle></CardHeader>
        <CardContent><div className="h-[300px]" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>광고비 비중</CardTitle>
        <CardDescription>
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setGroupBy("country")}
              className={cn(
                "rounded-md px-2.5 py-0.5 text-xs font-medium transition-all",
                groupBy === "country"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              국가별
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("medium")}
              className={cn(
                "rounded-md px-2.5 py-0.5 text-xs font-medium transition-all",
                groupBy === "medium"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              매체별
            </button>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 @[400px]/card:flex-row">
        <ChartContainer config={chartConfig} className="aspect-square h-[200px] shrink-0">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item, index) => {
                    const color = item.payload?.fill ?? getSliceColor(String(name), index ?? 0, groupBy);
                    return (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-muted-foreground">{name}</span>
                        <span className="ml-auto font-mono font-medium tabular-nums">
                          {formatKrw(Number(value))}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              strokeWidth={2}
              stroke="rgba(0,0,0,0.3)"
            >
              {slices.map((s, i) => (
                <Cell key={i} fill={getSliceColor(s.name, i, groupBy)} />
              ))}
            </Pie>
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-sm font-semibold"
            >
              {formatKrw(total)}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground text-[10px]"
            >
              총 광고비
            </text>
          </PieChart>
        </ChartContainer>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {slices.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2 text-sm">
              <div
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getSliceColor(s.name, i, groupBy) }}
              />
              <span className="truncate flex-1 text-foreground/80">{s.name}</span>
              <span className="tabular-nums text-muted-foreground text-xs">{formatPercent(s.pct)}</span>
              <span className="tabular-nums text-foreground/80 text-xs">{formatKrw(s.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <div className="px-4 pb-3 lg:px-6">
        <Link
          href={exploreUrl}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          탐색에서 자세히 보기
          <IconArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
