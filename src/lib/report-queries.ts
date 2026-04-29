import { addDays, format as formatDate, parseISO, startOfWeek } from "date-fns";

import { executeQuery } from "@/lib/query-engine";
import type {
  DimensionKey,
  FilterCondition,
  MetricKey,
  QueryDefinition,
  QueryResponse,
  QueryResultRow,
} from "@/types/query";
import type {
  LocaleReport,
  OverviewLocaleCard,
  OverviewReport,
  OverviewTrendPoint,
  ReportBucket,
  ReportFilters,
  ReportGroupRow,
  TitlePeriodMode,
  TitlePeriodOption,
  TitlesReport,
  WeeklyReportRow,
} from "@/types/reports";
import type { KpiSummary } from "@/types/dashboard";

const REPORT_METRICS: MetricKey[] = [
  "ad_spend_krw",
  "revenue_krw",
  "impressions",
  "clicks",
  "signups",
  "conversions",
  "roas",
  "ctr",
  "signup_cpa",
];

const PAY_GOALS = ["결제", "첫결제"];
const SIGNUP_GOALS = ["가입"];
const MIXED_GOALS = ["가입&결제"];
const GOAL_ORDER = ["결제", "첫결제", "가입", "가입&결제", "기타"];

const EMPTY_BUCKET: ReportBucket = {
  adSpend: 0,
  revenue: 0,
  impressions: 0,
  clicks: 0,
  signups: 0,
  conversions: 0,
  ctr: 0,
  roas: 0,
  signupCpa: null,
};

function num(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function createBucket(): ReportBucket {
  return { ...EMPTY_BUCKET };
}

function addBucket(target: ReportBucket, source: ReportBucket): void {
  target.adSpend += source.adSpend;
  target.revenue += source.revenue;
  target.impressions += source.impressions;
  target.clicks += source.clicks;
  target.signups += source.signups;
  target.conversions += source.conversions;
  refreshDerivedMetrics(target);
}

function refreshDerivedMetrics(bucket: ReportBucket): ReportBucket {
  bucket.ctr =
    bucket.impressions > 0 ? (bucket.clicks / bucket.impressions) * 100 : 0;
  bucket.roas =
    bucket.adSpend > 0 ? (bucket.revenue / bucket.adSpend) * 100 : 0;
  bucket.signupCpa =
    bucket.signups > 0 ? bucket.adSpend / bucket.signups : null;
  return bucket;
}

function bucketFromRow(row?: QueryResultRow | null): ReportBucket {
  const bucket = {
    adSpend: num(row?.ad_spend_krw),
    revenue: num(row?.revenue_krw),
    impressions: num(row?.impressions),
    clicks: num(row?.clicks),
    signups: num(row?.signups),
    conversions: num(row?.conversions),
    ctr: num(row?.ctr),
    roas: num(row?.roas),
    signupCpa: row?.signup_cpa == null ? null : num(row.signup_cpa),
  };

  return refreshDerivedMetrics(bucket);
}

function emptyKpiSummary(): KpiSummary {
  return {
    adSpend: 0,
    revenue: 0,
    roas: 0,
    signups: 0,
    conversions: 0,
    adSpendChange: 0,
    revenueChange: 0,
    roasChange: 0,
    signupsChange: 0,
    conversionsChange: 0,
    adSpendDelta: 0,
    revenueDelta: 0,
    roasDelta: 0,
    signupsDelta: 0,
    conversionsDelta: 0,
  };
}

function change(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function previousRange(filters: ReportFilters): Pick<ReportFilters, "startDate" | "endDate"> | null {
  if (!filters.startDate || !filters.endDate) return null;
  const start = parseISO(filters.startDate);
  const end = parseISO(filters.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return {
    startDate: formatDate(prevStart, "yyyy-MM-dd"),
    endDate: formatDate(prevEnd, "yyyy-MM-dd"),
  };
}

function buildKpiSummary(current: ReportBucket, previous: ReportBucket): KpiSummary {
  const summary = emptyKpiSummary();
  summary.adSpend = current.adSpend;
  summary.revenue = current.revenue;
  summary.roas = current.roas;
  summary.signups = current.signups;
  summary.conversions = current.conversions;
  summary.adSpendChange = change(current.adSpend, previous.adSpend);
  summary.revenueChange = change(current.revenue, previous.revenue);
  summary.roasChange = current.roas - previous.roas;
  summary.signupsChange = change(current.signups, previous.signups);
  summary.conversionsChange = change(current.conversions, previous.conversions);
  summary.adSpendDelta = current.adSpend - previous.adSpend;
  summary.revenueDelta = current.revenue - previous.revenue;
  summary.roasDelta = current.roas - previous.roas;
  summary.signupsDelta = current.signups - previous.signups;
  summary.conversionsDelta = current.conversions - previous.conversions;
  return summary;
}

function rowsFromResult(result: QueryResponse): QueryResultRow[] {
  if ("rows" in result) return result.rows;
  return result.base.rows;
}

function dateRangeFromFilters(filters: ReportFilters) {
  return filters.startDate && filters.endDate
    ? { start: filters.startDate, end: filters.endDate }
    : null;
}

function buildFilters(filters: ReportFilters): FilterCondition[] {
  const result: FilterCondition[] = [];
  if (filters.countries.length === 1) {
    result.push({ field: "country", operator: "eq", value: filters.countries[0] });
  } else if (filters.countries.length > 1) {
    result.push({ field: "country", operator: "in", value: filters.countries });
  }
  if (filters.mediums.length === 1) {
    result.push({ field: "medium", operator: "eq", value: filters.mediums[0] });
  } else if (filters.mediums.length > 1) {
    result.push({ field: "medium", operator: "in", value: filters.mediums });
  }
  if (filters.goals.length === 1) {
    result.push({ field: "goal", operator: "eq", value: filters.goals[0] });
  } else if (filters.goals.length > 1) {
    result.push({ field: "goal", operator: "in", value: filters.goals });
  }
  return result;
}

function withGoals(
  filters: ReportFilters,
  goals: string[],
): ReportFilters {
  return { ...filters, goals };
}

async function aggregate(
  filters: ReportFilters,
  dimensions: DimensionKey[],
  options?: {
    sortField?: string;
    sortDirection?: "asc" | "desc";
    limit?: number;
  },
): Promise<QueryResultRow[]> {
  const query: QueryDefinition = {
    dimensions,
    metrics: REPORT_METRICS,
    filters: buildFilters(filters),
    dateRange: dateRangeFromFilters(filters),
    sort: options?.sortField
      ? { field: options.sortField, direction: options.sortDirection ?? "desc" }
      : undefined,
    limit: options?.limit ?? 5000,
  };

  return rowsFromResult(await executeQuery(query));
}

function toGroupRows(
  rows: QueryResultRow[],
  nameField: string,
  extra?: (row: QueryResultRow) => Partial<ReportGroupRow>,
): ReportGroupRow[] {
  return rows
    .map((row) => ({
      name: String(row[nameField] ?? "미분류"),
      ...bucketFromRow(row),
      ...extra?.(row),
    }))
    .sort((a, b) => b.adSpend - a.adSpend);
}

function normalizeGoal(goal: string): string {
  return GOAL_ORDER.includes(goal) ? goal : "기타";
}

function getWeekKey(value: string): string {
  return formatDate(startOfWeek(parseISO(value), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function groupDailyRowsByWeek(rows: QueryResultRow[]): WeeklyReportRow[] {
  const map = new Map<string, ReportBucket>();

  for (const row of rows) {
    const date = String(row.date ?? "");
    if (!date) continue;
    const week = getWeekKey(date);
    const bucket = map.get(week) ?? createBucket();
    addBucket(bucket, bucketFromRow(row));
    map.set(week, bucket);
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, bucket]) => ({ week, ...bucket }));
}

function buildPeriodOptions(
  rows: QueryResultRow[],
  mode: TitlePeriodMode,
): TitlePeriodOption[] {
  if (mode === "all") {
    return [{ value: "all", label: "현재 선택 기간 전체" }];
  }

  const values = new Set<string>();
  for (const row of rows) {
    if (mode === "month") {
      const month = String(row.month ?? "");
      if (month) values.add(month);
    } else {
      const date = String(row.date ?? "");
      if (date) values.add(getWeekKey(date));
    }
  }

  return [...values]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({
      value,
      label: mode === "month" ? value : `${value} 주차`,
    }));
}

function applyTitlePeriod(
  filters: ReportFilters,
  mode: TitlePeriodMode,
  period: string,
): ReportFilters {
  if (mode !== "week" || period === "all") return filters;

  const end = formatDate(addDays(parseISO(period), 6), "yyyy-MM-dd");
  const startDate =
    filters.startDate && filters.startDate > period ? filters.startDate : period;
  const endDate = filters.endDate && filters.endDate < end ? filters.endDate : end;

  return { ...filters, startDate, endDate };
}

export async function fetchLocaleReport(
  locale: string,
  inputFilters: Omit<ReportFilters, "countries">,
): Promise<LocaleReport> {
  const filters: ReportFilters = {
    ...inputFilters,
    countries: [locale],
  };

  const [
    totalRows,
    payRows,
    goalRows,
    dailyRows,
    allTitleRows,
    payTitleRows,
    signupTitleRows,
    creativeTypeRows,
    creativeTypeMatrixRows,
    mediumRows,
    mediumMatrixRows,
  ] = await Promise.all([
    aggregate(filters, []),
    aggregate(withGoals(filters, PAY_GOALS), []),
    aggregate(filters, ["goal"], { sortField: "ad_spend_krw" }),
    aggregate(filters, ["date"], { sortField: "date", sortDirection: "asc" }),
    aggregate(filters, ["creative_name"], { sortField: "ad_spend_krw" }),
    aggregate(withGoals(filters, PAY_GOALS), ["creative_name"], { sortField: "ad_spend_krw" }),
    aggregate(withGoals(filters, SIGNUP_GOALS), ["creative_name"], { sortField: "ad_spend_krw" }),
    aggregate(filters, ["creative_type"], { sortField: "ad_spend_krw" }),
    aggregate(filters, ["creative_type", "goal"], { sortField: "ad_spend_krw" }),
    aggregate(filters, ["medium"], { sortField: "ad_spend_krw" }),
    aggregate(filters, ["medium", "goal"], { sortField: "ad_spend_krw" }),
  ]);

  const goals = toGroupRows(goalRows, "goal").map((row) => ({
    ...row,
    name: normalizeGoal(row.name),
  }));
  goals.sort(
    (a, b) => GOAL_ORDER.indexOf(a.name) - GOAL_ORDER.indexOf(b.name),
  );

  return {
    locale,
    filters,
    total: bucketFromRow(totalRows[0]),
    payTotal: bucketFromRow(payRows[0]),
    goals,
    weekly: groupDailyRowsByWeek(dailyRows),
    allTitles: toGroupRows(allTitleRows, "creative_name"),
    payTitles: toGroupRows(payTitleRows, "creative_name"),
    signupTitles: toGroupRows(signupTitleRows, "creative_name"),
    creativeTypes: toGroupRows(creativeTypeRows, "creative_type"),
    creativeTypeMatrix: toGroupRows(creativeTypeMatrixRows, "creative_type", (row) => ({
      goal: normalizeGoal(String(row.goal ?? "")),
      name: `${String(row.creative_type ?? "미분류")} · ${normalizeGoal(String(row.goal ?? ""))}`,
    })),
    mediums: toGroupRows(mediumRows, "medium"),
    mediumMatrix: toGroupRows(mediumMatrixRows, "medium", (row) => ({
      goal: normalizeGoal(String(row.goal ?? "")),
      name: `${String(row.medium ?? "미분류")} · ${normalizeGoal(String(row.goal ?? ""))}`,
    })),
    executedAt: new Date().toISOString(),
  };
}

export async function fetchTitlesReport(
  filters: ReportFilters,
  periodMode: TitlePeriodMode,
  period: string,
): Promise<TitlesReport> {
  const optionDimensions: DimensionKey[] =
    periodMode === "month" ? ["month"] : periodMode === "week" ? ["date"] : [];
  const optionRows =
    optionDimensions.length > 0 ? await aggregate(filters, optionDimensions) : [];
  const periodOptions = buildPeriodOptions(optionRows, periodMode);
  const effectivePeriod =
    period === "all" || periodOptions.some((option) => option.value === period)
      ? period
      : periodOptions[0]?.value ?? "all";
  const periodFilters =
    periodMode === "month" && effectivePeriod !== "all"
      ? { ...filters, months: [], goals: filters.goals }
      : filters;
  const scopedFilters =
    periodMode === "month" && effectivePeriod !== "all"
      ? filters
      : applyTitlePeriod(periodFilters, periodMode, effectivePeriod);

  const finalFilters =
    periodMode === "month" && effectivePeriod !== "all"
      ? scopedFilters
      : scopedFilters;
  const titleFilters =
    periodMode === "month" && effectivePeriod !== "all"
      ? {
          ...finalFilters,
          goals: finalFilters.goals,
        }
      : finalFilters;
  const monthFilter: FilterCondition | null =
    periodMode === "month" && effectivePeriod !== "all"
      ? { field: "month", operator: "eq", value: effectivePeriod }
      : null;

  async function titleRows(goals?: string[]) {
    const scoped = goals ? withGoals(titleFilters, goals) : titleFilters;
    const rows = await executeQuery({
      dimensions: ["country", "creative_name"],
      metrics: REPORT_METRICS,
      filters: [
        ...buildFilters(scoped),
        ...(monthFilter ? [monthFilter] : []),
      ],
      dateRange: dateRangeFromFilters(scoped),
      sort: { field: "ad_spend_krw", direction: "desc" },
      limit: 5000,
    });
    return toGroupRows(rowsFromResult(rows), "creative_name", (row) => ({
      country: String(row.country ?? ""),
    }));
  }

  const [allTitlesRaw, payTitlesRaw, signupTitlesRaw] = await Promise.all([
    titleRows(),
    titleRows(PAY_GOALS),
    titleRows(SIGNUP_GOALS),
  ]);

  const allTitles = allTitlesRaw.sort((a, b) => b.adSpend - a.adSpend);
  const payTitles = payTitlesRaw.filter((row) => row.adSpend >= 1_000_000);
  const signupTitles = signupTitlesRaw.filter(
    (row) => row.adSpend >= 1_000_000 && row.signups >= 100,
  );
  const topSpend = allTitles[0] ?? null;
  const topRoas = [...payTitles].sort((a, b) => b.roas - a.roas)[0] ?? null;
  const topCpa =
    [...signupTitles].sort(
      (a, b) =>
        (a.signupCpa ?? Number.MAX_SAFE_INTEGER) -
        (b.signupCpa ?? Number.MAX_SAFE_INTEGER),
    )[0] ?? null;

  return {
    filters,
    periodMode,
    period: effectivePeriod,
    periodOptions:
      periodMode === "all"
        ? [{ value: "all", label: "현재 선택 기간 전체" }]
        : periodOptions,
    allTitles,
    payTitles,
    signupTitles,
    topSpend,
    topRoas,
    topCpa,
    executedAt: new Date().toISOString(),
  };
}

function makeTrend(rows: QueryResultRow[], metric: keyof ReportBucket): OverviewTrendPoint[] {
  const map = new Map<string, Map<string, ReportBucket>>();

  for (const row of rows) {
    const period = String(row.date ?? "");
    const country = String(row.country ?? "");
    if (!period || !country) continue;
    const periodMap = map.get(period) ?? new Map<string, ReportBucket>();
    periodMap.set(country, bucketFromRow(row));
    map.set(period, periodMap);
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, countryMap]) => {
      const point: OverviewTrendPoint = { period };
      const total = createBucket();
      for (const [country, bucket] of countryMap) {
        point[country] = bucket[metric] ?? 0;
        addBucket(total, bucket);
      }
      point["전체"] = total[metric] ?? 0;
      return point;
    });
}

export async function fetchOverviewReport(
  filters: ReportFilters,
): Promise<OverviewReport> {
  const prevRange = previousRange(filters);
  const previousFilters = prevRange ? { ...filters, ...prevRange } : null;
  const [
    totalRows,
    previousTotalRows,
    countryRows,
    payCountryRows,
    signupCountryRows,
    mixedCountryRows,
    dailyCountryRows,
    mediumRows,
    creativeRows,
  ] = await Promise.all([
    aggregate(filters, []),
    previousFilters ? aggregate(previousFilters, []) : Promise.resolve([]),
    aggregate(filters, ["country"], { sortField: "ad_spend_krw" }),
    aggregate(withGoals(filters, PAY_GOALS), ["country"]),
    aggregate(withGoals(filters, SIGNUP_GOALS), ["country"]),
    aggregate(withGoals(filters, MIXED_GOALS), ["country"]),
    aggregate(filters, ["date", "country"], { sortField: "date", sortDirection: "asc" }),
    aggregate(filters, ["medium"], { sortField: "ad_spend_krw" }),
    aggregate(filters, ["creative_name"], { sortField: "ad_spend_krw", limit: 100 }),
  ]);

  const total = bucketFromRow(totalRows[0]);
  const previousTotal = bucketFromRow(previousTotalRows[0]);
  const payByCountry = new Map(
    payCountryRows.map((row) => [String(row.country ?? ""), bucketFromRow(row)]),
  );
  const signupByCountry = new Map(
    signupCountryRows.map((row) => [String(row.country ?? ""), bucketFromRow(row)]),
  );
  const mixedByCountry = new Map(
    mixedCountryRows.map((row) => [String(row.country ?? ""), bucketFromRow(row)]),
  );

  const localeCards: OverviewLocaleCard[] = toGroupRows(countryRows, "country")
    .map((row, index) => {
      const pay = payByCountry.get(row.name);
      const signup = signupByCountry.get(row.name);
      const mixed = mixedByCountry.get(row.name);
      const signupSource = signup && signup.signups > 0 ? signup : mixed;

      return {
        ...row,
        country: row.name,
        rank: index + 1,
        spendShare: total.adSpend > 0 ? (row.adSpend / total.adSpend) * 100 : 0,
        payRoas: pay && pay.adSpend > 0 ? pay.roas : null,
        signupCpa: signupSource?.signupCpa ?? null,
        signupCpaMixed: !(signup && signup.signups > 0) && Boolean(mixed && mixed.signups > 0),
      };
    });

  const mediumSpend = toGroupRows(mediumRows, "medium");

  return {
    filters,
    kpiSummary: buildKpiSummary(total, previousTotal),
    total,
    localeCards,
    trend: {
      adSpend: makeTrend(dailyCountryRows, "adSpend"),
      signups: makeTrend(dailyCountryRows, "signups"),
      revenue: makeTrend(dailyCountryRows, "revenue"),
      roas: makeTrend(dailyCountryRows, "roas"),
      signupCpa: makeTrend(dailyCountryRows, "signupCpa"),
    },
    mediumSpend,
    mediumSummary: mediumSpend,
    countrySummary: toGroupRows(countryRows, "country"),
    creativeRanking: toGroupRows(creativeRows, "creative_name"),
    executedAt: new Date().toISOString(),
  };
}
