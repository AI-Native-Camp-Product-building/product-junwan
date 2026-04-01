"use client";

import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { type SampleDataRow } from "@/data/sample";

type GoalRadialChartProps = { data: SampleDataRow[] };
const TARGET_ROAS = 400;
const chartConfig = { roas: { label: "ROAS", color: "var(--chart-1)" } } satisfies ChartConfig;

export function GoalRadialChart({ data }: GoalRadialChartProps) {
  const avgRoas = data.length > 0 ? data.reduce((s, d) => s + d.roas, 0) / data.length : 0;
  const rate = Math.min((avgRoas / TARGET_ROAS) * 100, 100);
  const endAngle = (rate / 100) * 360;
  const chartData = [{ roas: rate, fill: "var(--color-roas)" }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>목표 달성률</CardTitle>
        <CardDescription>ROAS 목표: {TARGET_ROAS}%</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
          <RadialBarChart data={chartData} startAngle={0} endAngle={endAngle} innerRadius={80} outerRadius={90}>
            <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[90, 80]} />
            <RadialBar dataKey="roas" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">{rate.toFixed(0)}%</tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-sm">달성률</tspan>
                    </text>
                  );
                }
              }} />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
