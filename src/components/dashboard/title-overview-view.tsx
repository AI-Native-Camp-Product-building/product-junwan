"use client";

import * as React from "react";
import {
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";

import type { AdRow, DashboardFilters, FilterOptions } from "@/types/dashboard";
import type { ReportGroupRow, TitlesReport } from "@/types/reports";
import { cn } from "@/lib/utils";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TitleOverviewViewProps {
  initialData: AdRow[];
  filterOptions: FilterOptions;
  initialReport: TitlesReport;
  initialRequestKey: string;
}

interface GroupRow {
  country: string;
  name: string;
  adSpend: number;
  impressions: number;
  clicks: number;
  signups: number;
  conversions: number;
  revenue: number;
  ctr: number;
  roas: number;
  cpa: number | null;
}

type SortKey =
  | "country"
  | "name"
  | "adSpend"
  | "ctr"
  | "signups"
  | "cpa"
  | "revenue"
  | "roas";
type SortDirection = "asc" | "desc";
type TitlePeriodMode = "all" | "month" | "week";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const DEFAULT_FILTERS: DashboardFilters = {
  countries: [],
  months: [],
  mediums: [],
  goals: [],
  dateMode: "monthly",
  dateRange: null,
};

function groupRowsFromReport(rows: ReportGroupRow[]): GroupRow[] {
  return rows.map((row) => ({
    country: row.country ?? "",
    name: row.name,
    adSpend: row.adSpend,
    impressions: row.impressions,
    clicks: row.clicks,
    signups: row.signups,
    conversions: row.conversions,
    revenue: row.revenue,
    ctr: row.ctr,
    roas: row.roas,
    cpa: row.signupCpa,
  }));
}

function parseCommaSeparated(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readFiltersFromUrl(searchParams: URLSearchParams): DashboardFilters {
  const start = searchParams.get("start") ?? searchParams.get("startDate");
  const end = searchParams.get("end") ?? searchParams.get("endDate");

  return {
    ...DEFAULT_FILTERS,
    countries: parseCommaSeparated(searchParams.get("countries")),
    months: parseCommaSeparated(searchParams.get("months")),
    mediums: parseCommaSeparated(searchParams.get("mediums")),
    goals: parseCommaSeparated(searchParams.get("goals")),
    dateMode:
      (searchParams.get("mode") as DashboardFilters["dateMode"]) ?? "monthly",
    dateRange: start && end ? { startDate: start, endDate: end } : null,
  };
}

function buildTitlesUrl(
  filters: DashboardFilters,
  periodMode: TitlePeriodMode,
  period: string,
): string {
  const params = new URLSearchParams();
  if (filters.countries.length > 0) params.set("countries", filters.countries.join(","));
  if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","));
  if (filters.goals.length > 0) params.set("goals", filters.goals.join(","));
  if (filters.dateMode !== "monthly") params.set("mode", filters.dateMode);
  if (filters.dateRange) {
    params.set("start", filters.dateRange.startDate);
    params.set("end", filters.dateRange.endDate);
  }
  if (periodMode !== "all") params.set("periodMode", periodMode);
  if (period !== "all") params.set("period", period);
  return `/dashboard/titles${params.size > 0 ? `?${params.toString()}` : ""}`;
}

function buildReportParams(
  filters: DashboardFilters,
  periodMode: TitlePeriodMode,
  period: string,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.countries.length > 0) params.set("countries", filters.countries.join(","));
  if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","));
  if (filters.goals.length > 0) params.set("goals", filters.goals.join(","));
  if (filters.dateRange) {
    params.set("startDate", filters.dateRange.startDate);
    params.set("endDate", filters.dateRange.endDate);
  } else if (filters.months.length > 0) {
    params.set("months", filters.months.join(","));
  }
  params.set("periodMode", periodMode);
  params.set("period", period);
  return params;
}

function replaceBrowserUrl(url: string): void {
  if (typeof window === "undefined") return;
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl === url) return;
  window.history.replaceState(null, "", url);
}

function getSortValue(row: GroupRow, key: SortKey): string | number | null {
  if (key === "country") return row.country;
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
    <Card className="border-white/[0.08] bg-white/[0.03] backdrop-blur-[12px]">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="truncate text-xl">{value}</CardTitle>
      </CardHeader>
      {description ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
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

function RankingTable({
  title,
  description,
  rows,
  mode = "full",
  maxRows = 20,
}: {
  title: string;
  description: string;
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
        direction:
          key === "cpa" || key === "name" || key === "country" ? "asc" : "desc",
      };
    });
  }, []);

  const sortedRows = React.useMemo(() => {
    return [...rows]
      .sort((a, b) =>
        compareSortValues(
          getSortValue(a, sort.key),
          getSortValue(b, sort.key),
          sort.direction,
        ),
      )
      .slice(0, maxRows);
  }, [maxRows, rows, sort]);

  return (
    <Card className="border-white/[0.08] bg-white/[0.03] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
                  <SortableHead label="국가" sortKey="country" align="left" sort={sort} onSort={handleSort} />
                  <SortableHead label="작품" sortKey="name" align="left" sort={sort} onSort={handleSort} />
                  <SortableHead label="광고비" sortKey="adSpend" sort={sort} onSort={handleSort} />
                  <SortableHead label="CTR" sortKey="ctr" sort={sort} onSort={handleSort} />
                  {mode !== "pay" ? (
                    <SortableHead label="가입" sortKey="signups" sort={sort} onSort={handleSort} />
                  ) : null}
                  {mode !== "pay" ? (
                    <SortableHead label="CPA" sortKey="cpa" sort={sort} onSort={handleSort} />
                  ) : null}
                  {mode !== "signup" ? (
                    <SortableHead label="결제금액" sortKey="revenue" sort={sort} onSort={handleSort} />
                  ) : null}
                  {mode !== "signup" ? (
                    <SortableHead label="ROAS" sortKey="roas" sort={sort} onSort={handleSort} />
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={`${row.country}-${row.name}`}>
                    <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                      {row.country}
                    </TableCell>
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
                        <span
                          className={
                            row.roas >= 100
                              ? "text-[hsl(160,60%,45%)]"
                              : "text-[hsl(0,72%,51%)]"
                          }
                        >
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

export function TitleOverviewView({
  initialData,
  filterOptions,
  initialReport,
  initialRequestKey,
}: TitleOverviewViewProps) {
  const searchParams = useSearchParams();
  const latestDataDate = React.useMemo(() => {
    const dates = initialData.map((row) => row.date).filter(Boolean).sort();
    return dates[dates.length - 1];
  }, [initialData]);
  const [filters, setFilters] = React.useState<DashboardFilters>(() =>
    readFiltersFromUrl(new URLSearchParams(searchParams.toString())),
  );
  const [report, setReport] = React.useState(initialReport);
  const [isLoading, setIsLoading] = React.useState(false);
  const loadedRequestKeyRef = React.useRef(initialRequestKey);
  const [periodMode, setPeriodMode] = React.useState<TitlePeriodMode>(
    initialReport.periodMode,
  );
  const [period, setPeriod] = React.useState(initialReport.period);
  const periodOptions = report.periodOptions;

  React.useEffect(() => {
    replaceBrowserUrl(buildTitlesUrl(filters, periodMode, period));
  }, [filters, period, periodMode]);

  React.useEffect(() => {
    const controller = new AbortController();
    const params = buildReportParams(filters, periodMode, period);
    const requestKey = params.toString();

    if (loadedRequestKeyRef.current === requestKey) {
      setIsLoading(false);
      return () => controller.abort();
    }

    setIsLoading(report.allTitles.length === 0);
    fetch(`/api/reports/titles?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        loadedRequestKeyRef.current = requestKey;
        const nextReport = json as TitlesReport;
        setReport(nextReport);
        setPeriod(nextReport.period);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReport(initialReport);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [filters, initialReport, period, periodMode, report.allTitles.length]);

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

  const allTitles = React.useMemo(
    () => groupRowsFromReport(report.allTitles),
    [report],
  );
  const payTitles = React.useMemo(
    () => groupRowsFromReport(report.payTitles),
    [report],
  );
  const signupTitles = React.useMemo(
    () => groupRowsFromReport(report.signupTitles),
    [report],
  );
  const topSpend = React.useMemo(
    () => (report.topSpend ? groupRowsFromReport([report.topSpend])[0] : null),
    [report],
  );
  const topRoas = React.useMemo(
    () => (report.topRoas ? groupRowsFromReport([report.topRoas])[0] : null),
    [report],
  );
  const topCpa = React.useMemo(
    () => (report.topCpa ? groupRowsFromReport([report.topCpa])[0] : null),
    [report],
  );

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div>
          <Badge
            variant="outline"
            className="mb-3 border-white/[0.08] text-muted-foreground"
          >
            글로벌 분석
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">작품 종합</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            현재 필터와 기간 기준으로 작품 성과를 집계해 확인합니다.
          </p>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        options={filterOptions}
        latestDataDate={latestDataDate}
      />

      {isLoading && report.allTitles.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-3 lg:px-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : report.allTitles.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyBlock />
        </div>
      ) : (
        <>
          <div className="px-4 lg:px-6">
            <Card className="border-white/[0.08] bg-white/[0.03] backdrop-blur-[12px]">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>기간별 작품 랭킹</CardTitle>
                    <CardDescription>
                      전체, 월별, 주차별 단위로 작품 성과를 다시 집계합니다.
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
                    description={
                      topSpend ? formatKrw(topSpend.adSpend) : undefined
                    }
                  />
                  <StatCard
                    label="ROAS 1위"
                    value={topRoas ? topRoas.name : "-"}
                    description={
                      topRoas ? formatPercent(topRoas.roas) : undefined
                    }
                  />
                  <StatCard
                    label="가입 CPA 1위"
                    value={topCpa ? topCpa.name : "-"}
                    description={
                      topCpa?.cpa ? formatKrw(topCpa.cpa) : undefined
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6">
            <RankingTable
              title="결제 캠페인 랭킹"
              description="광고비 100만원 이상 작품을 결제 목표 기준으로 집계합니다."
              rows={payTitles}
              mode="pay"
            />
            <RankingTable
              title="가입 캠페인 랭킹"
              description="광고비 100만원 이상, 가입 100건 이상 작품을 가입 목표 기준으로 집계합니다."
              rows={signupTitles}
              mode="signup"
            />
            <RankingTable
              title="전체 광고비 랭킹"
              description="목표와 무관하게 광고비 집행 규모가 큰 작품을 확인합니다."
              rows={allTitles}
            />
          </div>
        </>
      )}
    </div>
  );
}
