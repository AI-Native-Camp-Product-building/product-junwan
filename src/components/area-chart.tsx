"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { type SampleDataRow } from "@/data/sample";
import { countries } from "@/config/countries";

type RoasAreaChartProps = { data: SampleDataRow[] };

const chartConfig = Object.fromEntries(
  countries.map((c, i) => [c.code.toLowerCase(), { label: c.name, color: `var(--chart-${i + 1})` }])
) satisfies ChartConfig;

function pivotByMonth(data: SampleDataRow[]) {
  const grouped: Record<string, Record<string, { sum: number; count: number }>> = {};
  for (const row of data) {
    if (!grouped[row.month]) grouped[row.month] = {};
    const key = row.country.toLowerCase();
    if (!grouped[row.month][key]) grouped[row.month][key] = { sum: 0, count: 0 };
    grouped[row.month][key].sum += row.roas;
    grouped[row.month][key].count += 1;
  }
  return Object.entries(grouped)
    .map(([month, vals]) => {
      const entry: Record<string, string | number> = { month };
      for (const [k, v] of Object.entries(vals)) entry[k] = v.sum / v.count;
      return entry;
    })
    .sort((a, b) => (a.month as string).localeCompare(b.month as string));
}

export function RoasAreaChart({ data }: RoasAreaChartProps) {
  const chartData = pivotByMonth(data);
  const countryKeys = countries.map((c) => c.code.toLowerCase());

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>ROAS 추이</CardTitle>
          <CardDescription>국가별 ROAS 6개월 트렌드</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart data={chartData}>
            <defs>
              {countryKeys.map((key) => (
                <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: string) => v.slice(5)} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {countryKeys.map((key) => (
              <Area key={key} dataKey={key} type="natural" fill={`url(#fill-${key})`} stroke={`var(--color-${key})`} stackId="a" />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
