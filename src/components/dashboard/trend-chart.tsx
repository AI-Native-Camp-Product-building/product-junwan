"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { TrendPoint } from "@/types/dashboard";
import { formatKrw } from "@/lib/format";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import type { ChartGranularity } from "@/components/dashboard/dashboard-shell";

type MetricKey = "adSpend" | "signups" | "revenue" | "roas";

interface TrendChartProps {
  trendData: Record<MetricKey, TrendPoint[]>;
  countries: string[];
  isLoading: boolean;
  chartGranularity: ChartGranularity;
  onChartGranularityChange: (g: ChartGranularity) => void;
}

const CHART_COLORS = [
  "rgba(200,200,210,0.9)",
  "rgba(170,180,200,0.8)",
  "rgba(150,160,180,0.7)",
  "rgba(130,140,165,0.65)",
  "rgba(180,185,195,0.75)",
];

const TAB_CONFIG: Record<
  MetricKey,
  {
    label: string;
    description: string;
    formatter: (v: number) => string;
    yTickFormatter: (v: number) => string;
  }
> = {
  adSpend: {
    label: "광고비",
    description: "기간별 광고비 추이",
    formatter: (v) => formatKrw(v),
    yTickFormatter: (v) => formatKrw(v),
  },
  signups: {
    label: "가입",
    description: "기간별 가입 추이",
    formatter: (v) => v.toLocaleString(),
    yTickFormatter: (v) => v.toLocaleString(),
  },
  revenue: {
    label: "결제",
    description: "기간별 결제금액 추이",
    formatter: (v) => formatKrw(v),
    yTickFormatter: (v) => formatKrw(v),
  },
  roas: {
    label: "ROAS",
    description: "기간별 ROAS 추이",
    formatter: (v) => `${v.toFixed(1)}%`,
    yTickFormatter: (v) => `${v.toFixed(0)}%`,
  },
};

const GRANULARITY_OPTIONS: Array<{ key: ChartGranularity; label: string }> = [
  { key: "daily", label: "일" },
  { key: "weekly", label: "주" },
  { key: "monthly", label: "월" },
];

export function TrendChart({
  trendData,
  countries,
  isLoading,
  chartGranularity,
  onChartGranularityChange,
}: TrendChartProps) {
  // useIsMobile removed — not currently used
  const [viewMode, setViewMode] = React.useState("전체");
  const [activeTab, setActiveTab] = React.useState<MetricKey>("adSpend");

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
        color: CHART_COLORS[(i + 1) % CHART_COLORS.length],
      };
    });
    return config;
  }, [countries]);

  if (isLoading) {
    return (
      <Card className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>성과 추이</CardTitle>
          <CardDescription>광고비 / 가입 / 결제 / ROAS</CardDescription>
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
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as MetricKey)}
      >
        <CardHeader>
          <CardTitle>성과 추이</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              {TAB_CONFIG[activeTab].description}
            </span>
            <span className="@[540px]/card:hidden">성과 추이</span>
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              <TabsList className="hidden @[540px]/card:flex">
                {(Object.keys(TAB_CONFIG) as MetricKey[]).map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {TAB_CONFIG[key].label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Select
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as MetricKey)}
              >
                <SelectTrigger
                  className="flex w-24 @[540px]/card:hidden"
                  size="sm"
                  aria-label="지표 선택"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(Object.keys(TAB_CONFIG) as MetricKey[]).map((key) => (
                    <SelectItem key={key} value={key} className="rounded-lg">
                      {TAB_CONFIG[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ToggleGroup
                value={viewModeArray}
                onValueChange={handleToggleChange}
                variant="outline"
                className="hidden *:data-[slot=toggle-group-item]:px-3! @[540px]/card:flex"
              >
                <ToggleGroupItem value="전체">전체</ToggleGroupItem>
                <ToggleGroupItem value="국가별">국가별</ToggleGroupItem>
              </ToggleGroup>
              <Select value={viewMode} onValueChange={handleSelectChange}>
                <SelectTrigger
                  className="flex w-20 @[540px]/card:hidden"
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
              <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
                {GRANULARITY_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChartGranularityChange(key)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium transition-all",
                      chartGranularity === key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardAction>
        </CardHeader>

        {(Object.keys(TAB_CONFIG) as MetricKey[]).map((metricKey) => {
          const data = trendData[metricKey] ?? [];
          const activeKeys = viewMode === "전체" ? ["전체"] : countries;
          const { yTickFormatter, formatter } = TAB_CONFIG[metricKey];

          return (
            <TabsContent
              key={metricKey}
              value={metricKey}
              className="animate-in fade-in duration-200"
            >
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <AreaChart data={data}>
                    <defs>
                      {activeKeys.map((key, i) => {
                        const color =
                          chartConfig[key]?.color ??
                          CHART_COLORS[i % CHART_COLORS.length];
                        return (
                          <linearGradient
                            key={key}
                            id={`fill-${metricKey}-${key.replace(/[^a-zA-Z0-9]/g, "_")}`}
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
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={yTickFormatter}
                      width={60}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => `${value}`}
                          formatter={(value) =>
                            typeof value === "number" ? formatter(value) : String(value)
                          }
                          indicator="dot"
                        />
                      }
                    />
                    {activeKeys.map((key, i) => {
                      const safeId = `${metricKey}-${key.replace(/[^a-zA-Z0-9]/g, "_")}`;
                      const color =
                        chartConfig[key]?.color ?? CHART_COLORS[i % CHART_COLORS.length];
                      return (
                        <Area
                          key={key}
                          dataKey={key}
                          type="natural"
                          fill={`url(#fill-${safeId})`}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 3, fill: color, strokeWidth: 0 }}
                          activeDot={{
                            r: 5,
                            fill: color,
                            strokeWidth: 2,
                            stroke: "rgba(255,255,255,0.3)",
                          }}
                          animationDuration={500}
                          animationEasing="ease-out"
                        />
                      );
                    })}
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
