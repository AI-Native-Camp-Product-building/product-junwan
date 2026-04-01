"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { RoasTrendPoint } from "@/types/dashboard";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface RoasAreaChartProps {
  data: RoasTrendPoint[];
  countries: string[];
  isLoading: boolean;
}

export function RoasAreaChart({ data, countries, isLoading }: RoasAreaChartProps) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = React.useState("전체");
  const viewModeArray = React.useMemo(() => [viewMode], [viewMode]);

  const handleToggleChange = React.useCallback((v: readonly string[]) => {
    if (v.length > 0) setViewMode(v[0]);
  }, []);

  const handleSelectChange = React.useCallback((v: string | null) => {
    if (v) setViewMode(v);
  }, []);

  const chartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {
      전체: { label: "전체", color: CHART_COLORS[0] },
    };
    countries.forEach((country, i) => {
      config[country] = {
        label: country,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  }, [countries]);

  const activeKeys = viewMode === "전체" ? ["전체"] : countries;

  if (isLoading) {
    return (
      <Card className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>ROAS 추이</CardTitle>
          <CardDescription>월별 ROAS 변화 추이</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>ROAS 추이</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            월별 ROAS 변화 추이
          </span>
          <span className="@[540px]/card:hidden">ROAS 추이</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            value={viewModeArray}
            onValueChange={handleToggleChange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[540px]/card:flex"
          >
            <ToggleGroupItem value="전체">전체</ToggleGroupItem>
            <ToggleGroupItem value="국가별">국가별</ToggleGroupItem>
          </ToggleGroup>
          <Select value={viewMode} onValueChange={handleSelectChange}>
            <SelectTrigger
              className="flex w-28 @[540px]/card:hidden"
              size="sm"
              aria-label="보기 모드 선택"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="전체" className="rounded-lg">전체</SelectItem>
              <SelectItem value="국가별" className="rounded-lg">국가별</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              {activeKeys.map((key, i) => {
                const color = chartConfig[key]?.color ?? CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <linearGradient
                    key={key}
                    id={`fill-${key.replace(/[^a-zA-Z0-9]/g, "_")}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) => `${v}%`}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${value}`}
                  indicator="dot"
                />
              }
            />
            {activeKeys.map((key) => {
              const safeId = key.replace(/[^a-zA-Z0-9]/g, "_");
              const color = chartConfig[key]?.color ?? CHART_COLORS[0];
              return (
                <Area
                  key={key}
                  dataKey={key}
                  type="natural"
                  fill={`url(#fill-${safeId})`}
                  stroke={color}
                  strokeWidth={2}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              );
            })}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
