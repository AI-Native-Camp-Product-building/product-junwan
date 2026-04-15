// =============================================================================
// Query Schema — AdInsight Explore
// Metadata for dimensions & metrics: labels, DB columns, types, formatters.
// Shared between the UI (pickers) and server (query engine).
// =============================================================================

import type { DimensionKey, MetricKey } from "@/types/query";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";

// ---------------------------------------------------------------------------
// Dimension metadata
// ---------------------------------------------------------------------------

export interface DimensionMeta {
  key: DimensionKey;
  label: string;
  dbColumn: string; // Column name in ad_normalized view
  type: "string" | "date";
}

export const DIMENSIONS: DimensionMeta[] = [
  { key: "country", label: "국가", dbColumn: "sheet_name", type: "string" },
  { key: "month", label: "월", dbColumn: "month", type: "string" },
  { key: "date", label: "일자", dbColumn: "ad_date", type: "date" },
  { key: "week", label: "주간", dbColumn: "date_trunc('week', ad_date)::date", type: "date" },
  { key: "medium", label: "매체", dbColumn: "medium", type: "string" },
  { key: "goal", label: "목표", dbColumn: "goal", type: "string" },
  { key: "creative_type", label: "소재종류", dbColumn: "creative_type", type: "string" },
  { key: "creative_name", label: "작품명", dbColumn: "creative_name", type: "string" },
];

export const DIMENSION_MAP = new Map(DIMENSIONS.map((d) => [d.key, d]));

// ---------------------------------------------------------------------------
// Metric metadata
// ---------------------------------------------------------------------------

export interface MetricMeta {
  key: MetricKey;
  label: string;
  /** SQL expression for aggregation. Uses column names from ad_normalized. */
  sqlExpr: string;
  /** Whether this metric is derived (computed from other aggregates, not a simple SUM). */
  derived: boolean;
  format: (value: number) => string;
}

export const METRICS: MetricMeta[] = [
  // Base metrics (SUM)
  {
    key: "ad_spend_krw",
    label: "광고비",
    sqlExpr: "SUM(CASE WHEN sheet_name = '봄툰 KR' THEN ad_spend_local ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END)",
    derived: false,
    format: formatKrw,
  },
  {
    key: "revenue_krw",
    label: "결제금액",
    sqlExpr: "COALESCE(SUM(revenue_krw), SUM(revenue_local))",
    derived: false,
    format: formatKrw,
  },
  {
    key: "impressions",
    label: "노출수",
    sqlExpr: "SUM(impressions)",
    derived: false,
    format: formatNumber,
  },
  {
    key: "clicks",
    label: "클릭",
    sqlExpr: "SUM(clicks)",
    derived: false,
    format: formatNumber,
  },
  {
    key: "signups",
    label: "회원가입",
    sqlExpr: "SUM(signups)",
    derived: false,
    format: formatNumber,
  },
  {
    key: "conversions",
    label: "결제전환",
    sqlExpr: "SUM(conversions)",
    derived: false,
    format: formatNumber,
  },
  // Derived metrics (computed from base sums)
  {
    key: "roas",
    label: "ROAS",
    sqlExpr: "ROUND(COALESCE(SUM(revenue_krw), SUM(revenue_local)) * 100.0 / NULLIF(SUM(CASE WHEN sheet_name = '봄툰 KR' THEN ad_spend_local ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END), 0), 2)",
    derived: true,
    format: formatPercent,
  },
  {
    key: "ctr",
    label: "CTR",
    sqlExpr: "ROUND(SUM(clicks) * 100.0 / NULLIF(SUM(impressions), 0), 2)",
    derived: true,
    format: formatPercent,
  },
  {
    key: "signup_cpa",
    label: "가입 CPA",
    sqlExpr: "ROUND(SUM(CASE WHEN sheet_name = '봄툰 KR' THEN ad_spend_local ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END) * 1.0 / NULLIF(SUM(signups), 0), 0)",
    derived: true,
    format: formatKrw,
  },
];

export const METRIC_MAP = new Map(METRICS.map((m) => [m.key, m]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get DB column name for a dimension key. Throws if invalid. */
export function getDimensionColumn(key: DimensionKey): string {
  const meta = DIMENSION_MAP.get(key);
  if (!meta) throw new Error(`Unknown dimension: ${key}`);
  return meta.dbColumn;
}

/** Get SQL expression for a metric key. Throws if invalid. */
export function getMetricSqlExpr(key: MetricKey): string {
  const meta = METRIC_MAP.get(key);
  if (!meta) throw new Error(`Unknown metric: ${key}`);
  return meta.sqlExpr;
}

/** Validate that all dimension keys are known. */
export function validateDimensions(keys: string[]): keys is DimensionKey[] {
  return keys.every((k) => DIMENSION_MAP.has(k as DimensionKey));
}

/** Validate that all metric keys are known. */
export function validateMetrics(keys: string[]): keys is MetricKey[] {
  return keys.every((k) => METRIC_MAP.has(k as MetricKey));
}

// ---------------------------------------------------------------------------
// Derived metric component mapping
// ---------------------------------------------------------------------------

/** Maps derived metrics to their component base metrics for filtering. */
export const DERIVED_METRIC_COMPONENTS: Record<string, { label: string; components: MetricKey[] }> = {
  roas: { label: "ROAS = 결제금액 ÷ 광고비", components: ["revenue_krw", "ad_spend_krw"] },
  ctr: { label: "CTR = 클릭 ÷ 노출수", components: ["clicks", "impressions"] },
  signup_cpa: { label: "가입 CPA = 광고비 ÷ 가입수", components: ["ad_spend_krw", "signups"] },
};
