"use client";

import * as React from "react";
import {
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { startOfWeek, format as formatDate } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { AdRow, DashboardFilters, FilterOptions } from "@/types/dashboard";
import { LOCALES, getDefaultLocale } from "@/lib/locales";
import { cn } from "@/lib/utils";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { getDefaultDateRangeForMode } from "@/components/dashboard/date-range-picker-refined";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LocaleDetailViewProps {
  initialData: AdRow[];
  filterOptions: FilterOptions;
  initialLocale: string;
}

interface Bucket {
  adSpend: number;
  impressions: number;
  clicks: number;
  signups: number;
  conversions: number;
  revenue: number;
}

interface GroupRow extends Bucket {
  name: string;
  ctr: number;
  roas: number;
  cpa: number | null;
}

interface WeeklyRow extends Bucket {
  week: string;
  ctr: number;
  roas: number;
  signupCpa: number | null;
}

interface InsightItem {
  tone: "good" | "warn" | "bad" | "info";
  title: string;
  description: string;
}

type SortKey =
  | "name"
  | "adSpend"
  | "ctr"
  | "signups"
  | "cpa"
  | "revenue"
  | "roas";

type SortDirection = "asc" | "desc";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

type TitlePeriodMode = "all" | "month" | "week";

interface TitlePeriodOption {
  value: string;
  label: string;
}

const EMPTY_BUCKET: Bucket = {
  adSpend: 0,
  impressions: 0,
  clicks: 0,
  signups: 0,
  conversions: 0,
  revenue: 0,
};

const DEFAULT_FILTERS: DashboardFilters = {
  countries: [],
  months: [],
  mediums: [],
  goals: [],
  dateMode: "monthly",
  dateRange: null,
};

const GOAL_ORDER = ["결제", "첫결제", "가입", "가입&결제", "기타"];
const SLICE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 12% 58%)",
];

const weeklyChartConfig = {
  adSpend: { label: "광고비", color: "rgba(200,200,210,0.9)" },
  ctr: { label: "CTR", color: "hsl(var(--chart-2))" },
  signups: { label: "회원가입", color: "rgba(170,180,200,0.72)" },
  roas: { label: "ROAS", color: "hsl(var(--chart-3))" },
  signupCpa: { label: "가입 CPA", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

function getWeeklyChartLabel(name: unknown): React.ReactNode {
  const key = String(name) as keyof typeof weeklyChartConfig;
  return weeklyChartConfig[key]?.label ?? name;
}

function createBucket(): Bucket {
  return { ...EMPTY_BUCKET };
}

function addRow(bucket: Bucket, row: AdRow) {
  bucket.adSpend += row.adSpend;
  bucket.impressions += row.impressions;
  bucket.clicks += row.clicks;
  bucket.signups += row.signups;
  bucket.conversions += row.conversions;
  bucket.revenue += row.revenue;
}

function getGoalKey(goal: string): string {
  if (goal === "결제" || goal === "첫결제" || goal === "가입" || goal === "가입&결제") {
    return goal;
  }
  return "기타";
}

function isPayGoal(goal: string): boolean {
  return goal === "결제" || goal === "첫결제";
}

function toMetrics(bucket: Bucket) {
  return {
    ctr: bucket.impressions > 0 ? (bucket.clicks / bucket.impressions) * 100 : 0,
    roas: bucket.adSpend > 0 ? (bucket.revenue / bucket.adSpend) * 100 : 0,
    cpa: bucket.signups > 0 ? bucket.adSpend / bucket.signups : null,
  };
}

function parseCommaSeparated(value: string | null, valid?: string[]): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item) => (valid && valid.length > 0 ? valid.includes(item) : true));
}

function readFiltersFromUrl(searchParams: URLSearchParams): DashboardFilters {
  const start = searchParams.get("start") ?? searchParams.get("startDate");
  const end = searchParams.get("end") ?? searchParams.get("endDate");
  const dateRange = start && end ? { startDate: start, endDate: end } : null;

  return {
    ...DEFAULT_FILTERS,
    months: parseCommaSeparated(searchParams.get("months")),
    mediums: parseCommaSeparated(searchParams.get("mediums")),
    goals: parseCommaSeparated(searchParams.get("goals")),
    dateMode: (searchParams.get("mode") as DashboardFilters["dateMode"]) ?? "monthly",
    dateRange,
  };
}

function buildLocaleUrl(locale: string, filters: DashboardFilters): string {
  const params = new URLSearchParams();
  params.set("locale", locale);
  if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","));
  if (filters.goals.length > 0) params.set("goals", filters.goals.join(","));
  if (filters.dateMode !== "monthly") params.set("mode", filters.dateMode);
  if (filters.dateRange) {
    params.set("start", filters.dateRange.startDate);
    params.set("end", filters.dateRange.endDate);
  } else if (filters.months.length > 0) {
    params.set("months", filters.months.join(","));
  }
  return `/dashboard/locale?${params.toString()}`;
}

function aggregateTotal(data: AdRow[]): Bucket {
  const bucket = createBucket();
  for (const row of data) addRow(bucket, row);
  return bucket;
}

function aggregateByGoal(data: AdRow[]): GroupRow[] {
  const map = new Map<string, Bucket>();
  for (const row of data) {
    const key = getGoalKey(row.goal);
    const bucket = map.get(key) ?? createBucket();
    addRow(bucket, row);
    map.set(key, bucket);
  }
  return GOAL_ORDER.filter((goal) => map.has(goal)).map((goal) => {
    const bucket = map.get(goal)!;
    return { name: goal, ...bucket, ...toMetrics(bucket) };
  });
}

function aggregateByDimension(
  data: AdRow[],
  key: "creativeName" | "creativeType" | "medium",
): GroupRow[] {
  const map = new Map<string, Bucket>();
  for (const row of data) {
    const name = row[key] || "미지정";
    const bucket = map.get(name) ?? createBucket();
    addRow(bucket, row);
    map.set(name, bucket);
  }
  return [...map.entries()]
    .map(([name, bucket]) => ({ name, ...bucket, ...toMetrics(bucket) }))
    .sort((a, b) => b.adSpend - a.adSpend);
}

function aggregateMatrix(
  data: AdRow[],
  key: "creativeType" | "medium",
): GroupRow[] {
  const map = new Map<string, Bucket>();
  for (const row of data) {
    const name = `${row[key] || "미지정"}||${getGoalKey(row.goal)}`;
    const bucket = map.get(name) ?? createBucket();
    addRow(bucket, row);
    map.set(name, bucket);
  }
  return [...map.entries()]
    .map(([compound, bucket]) => {
      const [name, goal] = compound.split("||");
      return { name: `${name} · ${goal}`, ...bucket, ...toMetrics(bucket) };
    })
    .sort((a, b) => b.adSpend - a.adSpend);
}

function aggregateWeekly(data: AdRow[]): WeeklyRow[] {
  const map = new Map<string, Bucket>();
  for (const row of data) {
    const week = getWeekKey(row);
    const bucket = map.get(week) ?? createBucket();
    addRow(bucket, row);
    map.set(week, bucket);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, bucket]) => ({
      week,
      ...bucket,
      ctr: toMetrics(bucket).ctr,
      roas: toMetrics(bucket).roas,
      signupCpa: toMetrics(bucket).cpa,
    }));
}

function getWeekKey(row: AdRow): string {
  const baseDate = row.date || `${row.month}-01`;
  return formatDate(
    startOfWeek(new Date(baseDate), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
}

function getTitlePeriodKey(row: AdRow, mode: TitlePeriodMode): string {
  if (mode === "all") return "all";
  if (mode === "month") return row.month || row.date.slice(0, 7);
  return getWeekKey(row);
}

function getTitlePeriodOptions(
  data: AdRow[],
  mode: TitlePeriodMode,
): TitlePeriodOption[] {
  if (mode === "all") {
    return [{ value: "all", label: "현재 선택 기간 전체" }];
  }

  const values = [...new Set(data.map((row) => getTitlePeriodKey(row, mode)))]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return values.map((value) => ({
    value,
    label: mode === "month" ? value : `${value} 주차`,
  }));
}

function getPayTitleRows(data: AdRow[]): GroupRow[] {
  return aggregateByDimension(data.filter((row) => isPayGoal(row.goal)), "creativeName")
    .filter((row) => row.adSpend > 0);
}

function getSignupTitleRows(data: AdRow[]): GroupRow[] {
  return aggregateByDimension(data.filter((row) => row.goal === "가입"), "creativeName")
    .filter((row) => row.signups > 0);
}

function buildInsights(
  locale: string,
  total: Bucket,
  goals: GroupRow[],
  titles: GroupRow[],
  mediums: GroupRow[],
  creativeTypes: GroupRow[],
): InsightItem[] {
  const metrics = toMetrics(total);
  const topGoal = [...goals].sort((a, b) => b.adSpend - a.adSpend)[0];
  const topTitle = titles[0];
  const topMedium = mediums[0];
  const topCreativeType = creativeTypes[0];

  const items: InsightItem[] = [
    {
      tone: metrics.roas >= 120 ? "good" : metrics.roas >= 80 ? "warn" : "bad",
      title: `${locale} 전체 ROAS ${formatPercent(metrics.roas)}`,
      description:
        metrics.roas >= 100
          ? `선택 기간 기준 광고비 대비 결제금액이 손익분기 위에 있습니다.`
          : `선택 기간 기준 결제 회수가 손익분기 아래입니다. 목표/소재별 분해 확인이 필요합니다.`,
    },
  ];

  if (topGoal) {
    items.push({
      tone: "info",
      title: `목표 믹스: ${topGoal.name} 중심`,
      description: `${topGoal.name} 목표가 광고비 ${formatKrw(topGoal.adSpend)}로 가장 큽니다. 전체 광고비 중 ${
        total.adSpend > 0 ? formatPercent((topGoal.adSpend / total.adSpend) * 100) : "0.0%"
      }를 차지합니다.`,
    });
  }

  if (topTitle) {
    items.push({
      tone: topTitle.roas >= 100 ? "good" : "warn",
      title: `주요 작품: ${topTitle.name}`,
      description: `광고비 ${formatKrw(topTitle.adSpend)}, ROAS ${formatPercent(topTitle.roas)}, 회원가입 ${formatNumber(topTitle.signups)}건입니다.`,
    });
  }

  if (topMedium || topCreativeType) {
    items.push({
      tone: "info",
      title: "주요 기여 축",
      description: `${topMedium ? `매체는 ${topMedium.name}` : ""}${
        topMedium && topCreativeType ? ", " : ""
      }${topCreativeType ? `소재종류는 ${topCreativeType.name}` : ""}가 광고비 기준 상위입니다.`,
    });
  }

  if (metrics.cpa && metrics.cpa > 10000) {
    items.push({
      tone: "warn",
      title: `가입 CPA ${formatKrw(metrics.cpa)}`,
      description: "가입 효율이 높게 형성되어 있어 가입 목표 캠페인의 소재와 랜딩 흐름 점검이 필요합니다.",
    });
  }

  return items.slice(0, 4);
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {description}
        </CardContent>
      ) : null}
    </Card>
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  const toneClass = {
    good: "border-[hsl(160,60%,45%)]/30 bg-[hsl(160,60%,45%)]/5",
    warn: "border-[hsl(42,85%,55%)]/30 bg-[hsl(42,85%,55%)]/5",
    bad: "border-[hsl(0,72%,51%)]/30 bg-[hsl(0,72%,51%)]/5",
    info: "border-white/[0.08] bg-white/[0.025]",
  }[item.tone];

  return (
    <div className={cn("rounded-lg border p-4", toneClass)}>
      <p className="text-sm font-semibold text-foreground">{item.title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {item.description}
      </p>
    </div>
  );
}

function DistributionChart({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: GroupRow[];
}) {
  const data = rows.filter((row) => row.adSpend > 0).slice(0, 8);
  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyBlock />
        ) : (
          <ChartContainer config={{ spend: { label: "광고비", color: "hsl(var(--chart-1))" } }} className="h-[220px] w-full">
            <PieChart>
              <Pie
                data={data}
                dataKey="adSpend"
                nameKey="name"
                innerRadius={54}
                outerRadius={86}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                  />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => (
                      <div className="flex min-w-40 items-center justify-between gap-3">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono tabular-nums">
                          {formatKrw(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyBlock() {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-sm text-muted-foreground">
      표시할 데이터가 없습니다.
    </div>
  );
}

function getSortValue(row: GroupRow, key: SortKey): string | number | null {
  if (key === "name") return row.name;
  return row[key];
}

function compareSortValues(
  a: string | number | null,
  b: string | number | null,
  direction: SortDirection,
) {
  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }

  const aMissing = a == null;
  const bMissing = b == null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  return direction === "asc"
    ? Number(a) - Number(b)
    : Number(b) - Number(a);
}

function SortableHead({
  label,
  sortKey,
  align = "right",
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  align?: "left" | "right";
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sort.key === sortKey;
  const Icon = isActive
    ? sort.direction === "asc"
      ? IconSortAscending
      : IconSortDescending
    : IconArrowsSort;

  const ariaSort = isActive
    ? sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <TableHead
      className={align === "right" ? "text-right" : ""}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
          align === "right" ? "justify-end" : "justify-start",
          isActive
            ? "bg-white/[0.05] text-foreground"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
        )}
      >
        <span>{label}</span>
        <Icon className="size-3.5 shrink-0" />
      </button>
    </TableHead>
  );
}

function DataTable({
  title,
  description,
  rows,
  mode = "full",
  maxRows,
}: {
  title: string;
  description?: string;
  rows: GroupRow[];
  mode?: "full" | "pay" | "signup";
  maxRows?: number;
}) {
  const [sort, setSort] = React.useState<SortState>({
    key: "adSpend",
    direction: "desc",
  });

  const handleSort = React.useCallback((key: SortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: key === "cpa" || key === "name" ? "asc" : "desc",
      };
    });
  }, []);

  const sortedRows = React.useMemo(() => {
    const nextRows = [...rows].sort((a, b) =>
      compareSortValues(
        getSortValue(a, sort.key),
        getSortValue(b, sort.key),
        sort.direction,
      ),
    );

    return typeof maxRows === "number" ? nextRows.slice(0, maxRows) : nextRows;
  }, [maxRows, rows, sort]);

  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="px-4">
            <EmptyBlock />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="항목"
                    sortKey="name"
                    align="left"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="광고비"
                    sortKey="adSpend"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="CTR"
                    sortKey="ctr"
                    sort={sort}
                    onSort={handleSort}
                  />
                  {mode !== "pay" ? (
                    <SortableHead
                      label="가입"
                      sortKey="signups"
                      sort={sort}
                      onSort={handleSort}
                    />
                  ) : null}
                  {mode !== "pay" ? (
                    <SortableHead
                      label="CPA"
                      sortKey="cpa"
                      sort={sort}
                      onSort={handleSort}
                    />
                  ) : null}
                  {mode !== "signup" ? (
                    <SortableHead
                      label="결제금액"
                      sortKey="revenue"
                      sort={sort}
                      onSort={handleSort}
                    />
                  ) : null}
                  {mode !== "signup" ? (
                    <SortableHead
                      label="ROAS"
                      sortKey="roas"
                      sort={sort}
                      onSort={handleSort}
                    />
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="max-w-[260px] truncate font-medium">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatKrw(row.adSpend)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(row.ctr)}
                    </TableCell>
                    {mode !== "pay" ? (
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.signups)}
                      </TableCell>
                    ) : null}
                    {mode !== "pay" ? (
                      <TableCell className="text-right tabular-nums">
                        {row.cpa ? formatKrw(row.cpa) : "-"}
                      </TableCell>
                    ) : null}
                    {mode !== "signup" ? (
                      <TableCell className="text-right tabular-nums">
                        {formatKrw(row.revenue)}
                      </TableCell>
                    ) : null}
                    {mode !== "signup" ? (
                      <TableCell className="text-right tabular-nums font-medium">
                        <span className={row.roas >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}>
                          {formatPercent(row.roas)}
                        </span>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TitleOverviewSection({ data }: { data: AdRow[] }) {
  const [periodMode, setPeriodMode] = React.useState<TitlePeriodMode>("all");
  const periodOptions = React.useMemo(
    () => getTitlePeriodOptions(data, periodMode),
    [data, periodMode],
  );
  const [period, setPeriod] = React.useState("all");

  React.useEffect(() => {
    if (periodOptions.length === 0) {
      setPeriod("all");
      return;
    }

    setPeriod((current) =>
      periodOptions.some((option) => option.value === current)
        ? current
        : periodOptions[0].value,
    );
  }, [periodOptions]);

  const scopedRows = React.useMemo(() => {
    if (periodMode === "all") return data;
    return data.filter((row) => getTitlePeriodKey(row, periodMode) === period);
  }, [data, period, periodMode]);

  const rankingRows = React.useMemo(
    () => aggregateByDimension(scopedRows, "creativeName"),
    [scopedRows],
  );
  const topSpend = rankingRows[0];
  const topRoas = React.useMemo(
    () =>
      [...rankingRows]
        .filter((row) => row.adSpend >= 100000)
        .sort((a, b) => b.roas - a.roas)[0],
    [rankingRows],
  );
  const topCpa = React.useMemo(
    () =>
      [...rankingRows]
        .filter((row) => row.signups > 0 && row.cpa != null)
        .sort((a, b) => (a.cpa ?? Number.MAX_SAFE_INTEGER) - (b.cpa ?? Number.MAX_SAFE_INTEGER))[0],
    [rankingRows],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>작품 종합 랭킹</CardTitle>
              <CardDescription>
                현재 로케일과 필터 기준에서 기간 단위별 작품 성과를 비교합니다.
              </CardDescription>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select
                value={periodMode}
                onValueChange={(value) => {
                  if (!value) return;
                  setPeriodMode(value as TitlePeriodMode);
                }}
              >
                <SelectTrigger className="w-full border-white/[0.08] bg-white/[0.03] sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-popover/95 backdrop-blur-lg">
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="month">월별</SelectItem>
                  <SelectItem value="week">주차별</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={period}
                onValueChange={(value) => {
                  if (!value) return;
                  setPeriod(value);
                }}
                disabled={periodOptions.length <= 1}
              >
                <SelectTrigger className="w-full border-white/[0.08] bg-white/[0.03] sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-popover/95 backdrop-blur-lg">
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard
              label="광고비 1위"
              value={topSpend ? topSpend.name : "-"}
              description={topSpend ? formatKrw(topSpend.adSpend) : undefined}
            />
            <StatCard
              label="ROAS 1위"
              value={topRoas ? topRoas.name : "-"}
              description={topRoas ? formatPercent(topRoas.roas) : undefined}
            />
            <StatCard
              label="가입 CPA 1위"
              value={topCpa ? topCpa.name : "-"}
              description={topCpa?.cpa ? formatKrw(topCpa.cpa) : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        title="작품 종합 랭킹"
        description="기본은 광고비 순이며, 각 컬럼을 클릭해 오름/내림차순으로 바꿀 수 있습니다."
        rows={rankingRows}
        maxRows={30}
      />
    </div>
  );
}

function InsightPlaceholder() {
  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>시사점</CardTitle>
        <CardDescription>
          AI 분석 기반 액션 아이템은 다음 단계에서 연결합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-white/[0.08] px-4 text-center text-sm text-muted-foreground">
          아직 구현되지 않은 영역입니다.
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklySection({ weekly }: { weekly: WeeklyRow[] }) {
  if (weekly.length === 0) return <EmptyBlock />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
          <CardHeader>
            <CardTitle>주차별 광고비 + CTR</CardTitle>
            <CardDescription>광고 투입과 클릭 효율을 같은 주차 단위로 봅니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={weeklyChartConfig} className="h-[320px] w-full">
              <ComposedChart data={weekly}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis yAxisId="spend" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatKrw(Number(v))} width={70} />
                <YAxis yAxisId="ctr" orientation="right" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} width={44} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex min-w-40 items-center justify-between gap-3">
                          <span className="text-muted-foreground">{getWeeklyChartLabel(name)}</span>
                          <span className="font-mono tabular-nums">
                            {name === "ctr" ? formatPercent(Number(value)) : formatKrw(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar yAxisId="spend" dataKey="adSpend" fill="var(--color-adSpend)" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  yAxisId="ctr"
                  dataKey="ctr"
                  stroke="var(--color-ctr)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
          <CardHeader>
            <CardTitle>주차별 결제 ROAS / 가입 CPA / 가입자 수</CardTitle>
            <CardDescription>회원가입 규모와 결제·가입 효율을 함께 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={weeklyChartConfig} className="h-[320px] w-full">
              <ComposedChart data={weekly}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis yAxisId="signups" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => formatNumber(Number(v))} width={52} />
                <YAxis yAxisId="roas" orientation="right" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} width={44} />
                <YAxis yAxisId="cpa" hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex min-w-44 items-center justify-between gap-3">
                          <span className="text-muted-foreground">{getWeeklyChartLabel(name)}</span>
                          <span className="font-mono tabular-nums">
                            {name === "signups"
                              ? `${formatNumber(Number(value))}건`
                              : name === "roas"
                                ? formatPercent(Number(value))
                                : formatKrw(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar yAxisId="signups" dataKey="signups" fill="var(--color-signups)" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  yAxisId="roas"
                  dataKey="roas"
                  stroke="var(--color-roas)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  yAxisId="cpa"
                  dataKey="signupCpa"
                  stroke="var(--color-signupCpa)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>주차별 데이터 표</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>주차</TableHead>
                  <TableHead className="text-right">광고비</TableHead>
                  <TableHead className="text-right">노출</TableHead>
                  <TableHead className="text-right">클릭</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">가입</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                  <TableHead className="text-right">결제금액</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekly.map((row) => (
                  <TableRow key={row.week}>
                    <TableCell>{row.week}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKrw(row.adSpend)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.clicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(row.ctr)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.signups)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.signupCpa ? formatKrw(row.signupCpa) : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKrw(row.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(row.roas)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LocaleDetailView({
  initialData,
  filterOptions,
  initialLocale,
}: LocaleDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latestDataDate = React.useMemo(() => {
    const dates = initialData.map((row) => row.date).filter(Boolean).sort();
    return dates[dates.length - 1];
  }, [initialData]);

  const [locale, setLocale] = React.useState(() => getDefaultLocale(initialLocale));
  const [filters, setFilters] = React.useState<DashboardFilters>(() => {
    const urlFilters = readFiltersFromUrl(new URLSearchParams(searchParams.toString()));
    return {
      ...urlFilters,
      dateRange:
        urlFilters.dateRange ??
        getDefaultDateRangeForMode(urlFilters.dateMode ?? "monthly", latestDataDate),
      countries: [getDefaultLocale(initialLocale)],
    };
  });
  const [data, setData] = React.useState<AdRow[]>(
    initialData.filter((row) => row.country === locale),
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const dataRef = React.useRef(data);

  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const effectiveFilters = React.useMemo<DashboardFilters>(
    () => ({ ...filters, countries: [locale] }),
    [filters, locale],
  );

  React.useEffect(() => {
    const nextLocale = getDefaultLocale(searchParams.get("locale"));
    setLocale((current) => (current === nextLocale ? current : nextLocale));
    setFilters((current) =>
      current.countries.length === 1 && current.countries[0] === nextLocale
        ? current
        : { ...current, countries: [nextLocale] },
    );
  }, [searchParams]);

  React.useEffect(() => {
    router.replace(buildLocaleUrl(locale, effectiveFilters), { scroll: false });
  }, [effectiveFilters, locale, router]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("countries", locale);
    if (effectiveFilters.mediums.length > 0) params.set("mediums", effectiveFilters.mediums.join(","));
    if (effectiveFilters.goals.length > 0) params.set("goals", effectiveFilters.goals.join(","));
    if (effectiveFilters.dateRange) {
      params.set("startDate", effectiveFilters.dateRange.startDate);
      params.set("endDate", effectiveFilters.dateRange.endDate);
    } else if (effectiveFilters.months.length > 0) {
      params.set("months", effectiveFilters.months.join(","));
    }

    const controller = new AbortController();

    setIsLoading(dataRef.current.length === 0);
    fetch(`/api/dashboard?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setData(json.data ?? []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setData(initialData.filter((row) => row.country === locale));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [effectiveFilters, initialData, locale]);

  const adjustedOptions = React.useMemo<FilterOptions>(
    () => ({ ...filterOptions, countries: [locale] }),
    [filterOptions, locale],
  );

  const total = React.useMemo(() => aggregateTotal(data), [data]);
  const totalMetrics = React.useMemo(() => toMetrics(total), [total]);
  const goals = React.useMemo(() => aggregateByGoal(data), [data]);
  const weekly = React.useMemo(() => aggregateWeekly(data), [data]);
  const allTitles = React.useMemo(() => aggregateByDimension(data, "creativeName"), [data]);
  const payTitles = React.useMemo(() => getPayTitleRows(data), [data]);
  const signupTitles = React.useMemo(() => getSignupTitleRows(data), [data]);
  const creativeTypes = React.useMemo(() => aggregateByDimension(data, "creativeType"), [data]);
  const creativeTypeMatrix = React.useMemo(() => aggregateMatrix(data, "creativeType"), [data]);
  const mediums = React.useMemo(() => aggregateByDimension(data, "medium"), [data]);
  const mediumMatrix = React.useMemo(() => aggregateMatrix(data, "medium"), [data]);
  const insights = React.useMemo(
    () => buildInsights(locale, total, goals, allTitles, mediums, creativeTypes),
    [locale, total, goals, allTitles, mediums, creativeTypes],
  );

  const periodText = effectiveFilters.dateRange
    ? `${effectiveFilters.dateRange.startDate} ~ ${effectiveFilters.dateRange.endDate}`
    : "전체 기간";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 border-white/[0.08] text-muted-foreground">
              로케일 상세
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight">{locale}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{periodText}</p>
          </div>
          <Select
            value={locale}
            onValueChange={(value) => {
              if (!value) return;
              setLocale(value);
              setFilters((current) => ({ ...current, countries: [value] }));
            }}
          >
            <SelectTrigger className="w-full border-white/[0.08] bg-white/[0.03] md:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/[0.08] bg-popover/95 backdrop-blur-lg">
              {LOCALES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FilterBar
        filters={effectiveFilters}
        onFiltersChange={setFilters}
        options={adjustedOptions}
        latestDataDate={latestDataDate}
        hiddenFilters={["countries"]}
      />

      {isLoading && data.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyBlock />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
            <StatCard label="총 광고비" value={formatKrw(total.adSpend)} />
            <StatCard label="결제금액" value={formatKrw(total.revenue)} />
            <StatCard label="ROAS" value={formatPercent(totalMetrics.roas)} />
            <StatCard label="회원가입" value={`${formatNumber(total.signups)}건`} />
            <StatCard label="가입 CPA" value={totalMetrics.cpa ? formatKrw(totalMetrics.cpa) : "-"} />
            <StatCard label="CTR" value={formatPercent(totalMetrics.ctr)} />
            <StatCard label="노출수" value={formatNumber(total.impressions)} />
            <StatCard label="클릭" value={formatNumber(total.clicks)} />
          </div>

          <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-4 lg:px-6">
            {insights.map((item) => (
              <InsightCard key={item.title} item={item} />
            ))}
          </div>

          <div className="px-4 lg:px-6">
            <DistributionChart
              title="캠페인 목표별 광고비 분포"
              description="선택 기간의 목표 믹스를 광고비 기준으로 봅니다."
              rows={goals}
            />
          </div>

          <Tabs defaultValue="weekly" className="px-4 lg:px-6">
            <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-white/[0.04]">
              <TabsTrigger value="weekly">주차별</TabsTrigger>
              <TabsTrigger value="titleOverview">작품 종합</TabsTrigger>
              <TabsTrigger value="titles">작품별</TabsTrigger>
              <TabsTrigger value="creativeTypes">소재별</TabsTrigger>
              <TabsTrigger value="mediums">매체별</TabsTrigger>
              <TabsTrigger value="insights">시사점</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly">
              <WeeklySection weekly={weekly} />
            </TabsContent>
            <TabsContent value="titleOverview">
              <TitleOverviewSection data={data} />
            </TabsContent>
            <TabsContent value="titles">
              <div className="grid grid-cols-1 gap-4">
                <DataTable
                  title="결제 캠페인 TOP"
                  description="기본은 광고비 순이며 컬럼 클릭으로 정렬을 바꿀 수 있습니다."
                  rows={payTitles}
                  mode="pay"
                  maxRows={15}
                />
                <DataTable
                  title="가입 캠페인 TOP"
                  description="기본은 광고비 순이며 CPA는 첫 클릭 시 낮은 순으로 정렬됩니다."
                  rows={signupTitles}
                  mode="signup"
                  maxRows={15}
                />
                <DataTable
                  title="전체 광고비 TOP"
                  description="목표와 무관하게 기본 광고비 순으로 보여줍니다."
                  rows={allTitles}
                  maxRows={15}
                />
              </div>
            </TabsContent>
            <TabsContent value="creativeTypes">
              <div className="grid grid-cols-1 gap-4">
                <DistributionChart title="소재종류별 광고비 분포" description="소재종류별 광고비 비중" rows={creativeTypes} />
                <DataTable title="소재종류 요약" rows={creativeTypes} />
                <DataTable title="소재종류 × 캠페인 목표 매트릭스" rows={creativeTypeMatrix} />
              </div>
            </TabsContent>
            <TabsContent value="mediums">
              <div className="grid grid-cols-1 gap-4">
                <DistributionChart title="매체별 광고비 분포" description="매체별 광고비 비중" rows={mediums} />
                <DataTable title="매체 요약" rows={mediums} />
                <DataTable title="매체 × 캠페인 목표 매트릭스" rows={mediumMatrix} />
              </div>
            </TabsContent>
            <TabsContent value="insights">
              <InsightPlaceholder />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
