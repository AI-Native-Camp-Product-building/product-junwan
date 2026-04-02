"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { MediumSpendPoint } from "@/types/dashboard";
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

interface MediumBarChartProps {
  data: MediumSpendPoint[];
  isLoading: boolean;
}

type MetricKey = "adSpend" | "revenue" | "roas";

const metricTabs: { value: MetricKey; label: string }[] = [
  { value: "adSpend", label: "광고비" },
  { value: "revenue", label: "결제금액" },
  { value: "roas", label: "ROAS" },
];

const chartConfig: ChartConfig = {
  adSpend: { label: "광고비", color: "rgba(200,200,210,0.9)" },
  revenue: { label: "결제금액", color: "rgba(170,180,200,0.8)" },
  roas: { label: "ROAS", color: "rgba(150,160,180,0.7)" },
};

function formatBarValue(value: number, metric: MetricKey): string {
  if (metric === "roas") return `${value.toFixed(1)}%`;
  if (value >= 1_0000_0000) return `₩${(value / 1_0000_0000).toFixed(1)}억`;
  if (value >= 1_0000) return `₩${(value / 1_0000).toFixed(0)}만`;
  return `₩${new Intl.NumberFormat("ko-KR").format(Math.round(value))}`;
}

export function MediumBarChart({ data, isLoading }: MediumBarChartProps) {
  const [activeMetric, setActiveMetric] = React.useState<MetricKey>("adSpend");

  if (isLoading) {
    return (
      <Card className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>매체별 성과</CardTitle>
          <CardDescription>광고 매체별 비교</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <Tabs
        defaultValue="adSpend"
        onValueChange={(v) => setActiveMetric(v as MetricKey)}
      >
        <CardHeader>
          <CardTitle>매체별 성과</CardTitle>
          <CardDescription>광고 매체별 비교</CardDescription>
          <CardAction>
            <TabsList className="bg-white/[0.04]">
              {metricTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardAction>
        </CardHeader>
        {metricTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                <BarChart data={data}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="medium"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value: string) =>
                      value.length > 8 ? `${value.slice(0, 8)}...` : value
                    }
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: number) =>
                      formatBarValue(v, tab.value)
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        formatter={(value) =>
                          formatBarValue(Number(value), tab.value)
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey={tab.value}
                    fill={`var(--color-${tab.value})`}
                    radius={[4, 4, 0, 0]}
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
