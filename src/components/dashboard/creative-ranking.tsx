"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import type { AdRow } from "@/types/dashboard";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";
import { buildExploreUrl } from "@/lib/explore-link";
import {
  Card,
  CardAction,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type SortMetric = "adSpend" | "signups" | "revenue" | "roas";

interface CreativeRankingProps {
  data: AdRow[];
  isLoading: boolean;
}

interface CreativeAgg {
  name: string;
  adSpend: number;
  signups: number;
  revenue: number;
  roas: number;
}

function aggregateByCreative(data: AdRow[]): CreativeAgg[] {
  const map = new Map<string, { adSpend: number; revenue: number; signups: number }>();
  for (const row of data) {
    if (!row.creativeName) continue;
    const existing = map.get(row.creativeName) ?? { adSpend: 0, revenue: 0, signups: 0 };
    existing.adSpend += row.adSpend;
    existing.revenue += row.revenue;
    existing.signups += row.signups;
    map.set(row.creativeName, existing);
  }

  return [...map.entries()].map(([name, agg]) => ({
    name,
    adSpend: agg.adSpend,
    signups: agg.signups,
    revenue: agg.revenue,
    roas: agg.adSpend > 0 ? (agg.revenue / agg.adSpend) * 100 : 0,
  }));
}

const TABS: { value: SortMetric; label: string }[] = [
  { value: "adSpend", label: "광고비" },
  { value: "signups", label: "가입" },
  { value: "revenue", label: "결제" },
  { value: "roas", label: "ROAS" },
];

const chartConfig: ChartConfig = {
  value: { label: "값", color: "rgba(200,200,210,0.9)" },
};

function formatValue(v: number, metric: SortMetric): string {
  if (metric === "roas") return formatPercent(v);
  if (metric === "signups") return formatNumber(v);
  return formatKrw(v);
}

const exploreUrl = buildExploreUrl({
  dimensions: ["creative_name"],
  metrics: ["ad_spend_krw", "signups", "revenue_krw", "roas"],
  sort: { field: "ad_spend_krw", direction: "desc" },
});

export function CreativeRanking({ data, isLoading }: CreativeRankingProps) {
  const [activeTab, setActiveTab] = React.useState<SortMetric>("adSpend");

  const allCreatives = React.useMemo(() => aggregateByCreative(data), [data]);

  const top10 = React.useMemo(() => {
    return [...allCreatives]
      .sort((a, b) => b[activeTab] - a[activeTab])
      .slice(0, 10)
      .map((c) => ({ name: c.name, value: c[activeTab] }));
  }, [allCreatives, activeTab]);

  if (isLoading) {
    return (
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>작품별 성과 Top 10</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SortMetric)}>
        <CardHeader>
          <CardTitle>작품별 성과 Top 10</CardTitle>
          <CardDescription>작품(소재)별 집계</CardDescription>
          <CardAction>
            <TabsList className="bg-white/[0.04]">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </CardAction>
        </CardHeader>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
                <BarChart data={top10} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 13, fill: "#ffffff" }}
                    tickFormatter={(v: string) => (v.length > 8 ? `${v.slice(0, 8)}..` : v)}
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    padding={{ left: 16 }}
                    tick={{ fontSize: 12, fill: "#ffffff" }}
                    tickFormatter={(v: number) => formatValue(v, tab.value)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatValue(Number(value), tab.value)}
                        indicator="line"
                      />
                    }
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    animationDuration={400}
                  >
                    {top10.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`hsl(0, 0%, ${75 - (i / Math.max(top10.length - 1, 1)) * 60}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </TabsContent>
        ))}
      </Tabs>
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
