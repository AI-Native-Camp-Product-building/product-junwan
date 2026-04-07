// =============================================================================
// Query Types — AdInsight Explore
// Defines the query definition schema for the Amplitude-style query builder.
// =============================================================================

// ---------------------------------------------------------------------------
// Dimension & Metric Keys
// ---------------------------------------------------------------------------

/** Groupable dimensions (maps to ad_normalized columns). */
export type DimensionKey =
  | "country"
  | "month"
  | "date"
  | "medium"
  | "goal"
  | "creative_type"
  | "creative_name";

/** Aggregatable metrics — base metrics are SUM'd, derived metrics are computed from base sums. */
export type MetricKey =
  | "ad_spend_krw"
  | "revenue_krw"
  | "impressions"
  | "clicks"
  | "signups"
  | "conversions"
  // Derived (computed in SQL from base sums):
  | "roas"
  | "ctr"
  | "signup_cpa";

// ---------------------------------------------------------------------------
// Filter Conditions
// ---------------------------------------------------------------------------

export type FilterOperator =
  | "eq"
  | "neq"
  | "in"
  | "not_in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "like";

export interface FilterCondition {
  field: DimensionKey | MetricKey;
  operator: FilterOperator;
  value: string | number | string[] | [number, number];
}

// ---------------------------------------------------------------------------
// Date Range
// ---------------------------------------------------------------------------

export interface DateRange {
  start: string; // ISO "YYYY-MM-DD"
  end: string;   // ISO "YYYY-MM-DD"
}

// ---------------------------------------------------------------------------
// Compare Configurations
// ---------------------------------------------------------------------------

export interface PeriodCompare {
  type: "period";
  baseRange: DateRange;
  compareRange: DateRange;
}

export interface ItemCompare {
  type: "item";
  dimension: DimensionKey;
  baseValue: string;
  compareValue: string;
}

export type CompareConfig = PeriodCompare | ItemCompare;

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Query Definition (the core type)
// ---------------------------------------------------------------------------

export interface QueryDefinition {
  dimensions: DimensionKey[];
  metrics: MetricKey[];
  filters: FilterCondition[];
  dateRange: DateRange | null;
  compare?: CompareConfig;
  sort?: SortConfig;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Query Result
// ---------------------------------------------------------------------------

/** A single row of aggregated query results. Dynamic keys based on selected dimensions + metrics. */
export type QueryResultRow = Record<string, string | number | null>;

/** Standard query response (non-compare). */
export interface QueryResult {
  rows: QueryResultRow[];
  totalRows: number;
  executedAt: string;
}

/** Compare query response — two result sets plus computed changes. */
export interface CompareQueryResult {
  base: QueryResult;
  compare: QueryResult;
  changes: QueryResultRow[]; // Each row has: dimension values + "{metric}_change" (%) for each metric
  executedAt: string;
}

/** Union of possible responses from POST /api/query. */
export type QueryResponse = QueryResult | CompareQueryResult;

/** Type guard for compare results. */
export function isCompareResult(result: QueryResponse): result is CompareQueryResult {
  return "base" in result && "compare" in result;
}
