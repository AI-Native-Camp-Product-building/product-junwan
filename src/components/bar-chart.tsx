"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { type SampleDataRow } from "@/data/sample";

type MediumBarChartProps = { data: SampleDataRow[] };

const chartConfig = {
  adSpend: { label: "광고비", color: "var(--chart-1)" },
  revenue: { label: "결제금액", color: "var(--chart-2)" },
} satisfies ChartConfig;

function aggregateByMedium(data: SampleDataRow[]) {
  const grouped: Record<string, { adSpend: number; revenue: number }> = {};
  for (const row of data) {
    if (!grouped[row.medium]) grouped[row.medium] = { adSpend: 0, revenue: 0 };
    grouped[row.medium].adSpend += row.adSpend;
    grouped[row.medium].revenue += row.revenue;
  }
  return Object.entries(grouped).map(([medium, values]) => ({ medium, ...values }));
}

export function MediumBarChart({ data }: MediumBarChartProps) {
  const [activeMetric, setActiveMetric] = React.useState<"adSpend" | "revenue">("adSpend");
  const chartData = aggregateByMedium(data);
  const totals = React.useMemo(() => ({
    adSpend: chartData.reduce((s, d) => s + d.adSpend, 0),
    revenue: chartData.reduce((s, d) => s + d.revenue, 0),
  }), [chartData]);

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3">
          <CardTitle>매체별 성과</CardTitle>
          <CardDescription>매체별 광고비/결제금액 비교</CardDescription>
        </div>
        <div className="flex">
          {(["adSpend", "revenue"] as const).map((key) => (
            <button key={key} data-active={activeMetric === key}
              className="relative flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-6 sm:py-4"
              onClick={() => setActiveMetric(key)}>
              <span className="text-xs text-muted-foreground">{chartConfig[key].label}</span>
              <span className="text-lg leading-none font-bold">₩{(totals[key] / 100000000).toFixed(1)}억</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="medium" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={activeMetric} fill={`var(--color-${activeMetric})`} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
