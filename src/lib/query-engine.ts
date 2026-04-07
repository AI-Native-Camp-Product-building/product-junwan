// =============================================================================
// Query Engine — AdInsight Explore
// Transforms QueryDefinition → Supabase RPC calls → QueryResponse.
// SERVER ONLY — never import from client components.
// =============================================================================

import { createAdminClient } from "@/lib/supabase-admin";
import { validateDimensions, validateMetrics } from "@/config/query-schema";
import type {
  QueryDefinition,
  QueryResult,
  CompareQueryResult,
  QueryResponse,
  QueryResultRow,
  FilterCondition,
  DateRange,
} from "@/types/query";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export class QueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryValidationError";
  }
}

function validateQuery(query: QueryDefinition): void {
  if (!query.metrics || query.metrics.length === 0) {
    throw new QueryValidationError("최소 1개의 지표를 선택해주세요.");
  }

  if (!validateDimensions(query.dimensions)) {
    throw new QueryValidationError("유효하지 않은 차원이 포함되어 있습니다.");
  }

  if (!validateMetrics(query.metrics)) {
    throw new QueryValidationError("유효하지 않은 지표가 포함되어 있습니다.");
  }

  if (query.limit != null && (query.limit < 1 || query.limit > 5000)) {
    throw new QueryValidationError("limit은 1~5000 사이여야 합니다.");
  }
}

// ---------------------------------------------------------------------------
// Core execution
// ---------------------------------------------------------------------------

async function executeAggregate(
  dimensions: string[],
  metrics: string[],
  filters: FilterCondition[],
  dateRange: DateRange | null,
  sort?: { field: string; direction: string },
  limit?: number,
): Promise<QueryResult> {
  const adminClient = createAdminClient();

  const rpcFilters = filters.map((f) => ({
    field: f.field,
    operator: f.operator,
    value: f.value,
  }));

  const { data, error } = await adminClient.rpc("dynamic_aggregate", {
    p_dimensions: dimensions,
    p_metrics: metrics,
    p_filters: rpcFilters,
    p_start_date: dateRange?.start ?? null,
    p_end_date: dateRange?.end ?? null,
    p_sort_field: sort?.field ?? null,
    p_sort_dir: sort?.direction ?? "desc",
    p_limit: limit ?? 1000,
  });

  if (error) {
    throw new Error(`Query execution failed: ${error.message}`);
  }

  const rows = (data ?? []) as QueryResultRow[];

  return {
    rows,
    totalRows: rows.length,
    executedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Compare: compute change rows
// ---------------------------------------------------------------------------

function computeChanges(
  baseRows: QueryResultRow[],
  compareRows: QueryResultRow[],
  dimensions: string[],
  metrics: string[],
): QueryResultRow[] {
  // Build a lookup map keyed by dimension values
  const keyFn = (row: QueryResultRow) =>
    dimensions.map((d) => String(row[d] ?? "")).join("||");

  const compareMap = new Map<string, QueryResultRow>();
  for (const row of compareRows) {
    compareMap.set(keyFn(row), row);
  }

  return baseRows.map((baseRow) => {
    const key = keyFn(baseRow);
    const compRow = compareMap.get(key);
    const changeRow: QueryResultRow = {};

    // Copy dimension values
    for (const dim of dimensions) {
      changeRow[dim] = baseRow[dim];
    }

    // Compute changes for each metric
    for (const metric of metrics) {
      const baseVal = Number(baseRow[metric] ?? 0);
      const compVal = compRow ? Number(compRow[metric] ?? 0) : 0;
      const diff = baseVal - compVal;
      const pctChange = compVal !== 0 ? (diff / Math.abs(compVal)) * 100 : 0;

      changeRow[`${metric}_base`] = baseVal;
      changeRow[`${metric}_compare`] = compVal;
      changeRow[`${metric}_diff`] = Math.round(diff * 100) / 100;
      changeRow[`${metric}_change`] = Math.round(pctChange * 100) / 100;
    }

    return changeRow;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a QueryDefinition and return aggregated results.
 * Handles both regular queries and compare queries (period/item).
 */
export async function executeQuery(query: QueryDefinition): Promise<QueryResponse> {
  validateQuery(query);

  // Regular (non-compare) query
  if (!query.compare) {
    return executeAggregate(
      query.dimensions,
      query.metrics,
      query.filters,
      query.dateRange,
      query.sort,
      query.limit,
    );
  }

  // Compare: period
  if (query.compare.type === "period") {
    const { baseRange, compareRange } = query.compare;

    const [base, compare] = await Promise.all([
      executeAggregate(query.dimensions, query.metrics, query.filters, baseRange, query.sort, query.limit),
      executeAggregate(query.dimensions, query.metrics, query.filters, compareRange, query.sort, query.limit),
    ]);

    const changes = computeChanges(base.rows, compare.rows, query.dimensions, query.metrics);

    return {
      base,
      compare,
      changes,
      executedAt: new Date().toISOString(),
    } satisfies CompareQueryResult;
  }

  // Compare: item
  if (query.compare.type === "item") {
    const { dimension, baseValue, compareValue } = query.compare;

    const baseFilters: FilterCondition[] = [
      ...query.filters,
      { field: dimension, operator: "eq", value: baseValue },
    ];
    const compareFilters: FilterCondition[] = [
      ...query.filters,
      { field: dimension, operator: "eq", value: compareValue },
    ];

    // Remove the compare dimension from grouping (since we're fixing it)
    const dims = query.dimensions.filter((d) => d !== dimension);

    const [base, compare] = await Promise.all([
      executeAggregate(dims, query.metrics, baseFilters, query.dateRange, query.sort, query.limit),
      executeAggregate(dims, query.metrics, compareFilters, query.dateRange, query.sort, query.limit),
    ]);

    const changes = computeChanges(base.rows, compare.rows, dims, query.metrics);

    return {
      base,
      compare,
      changes,
      executedAt: new Date().toISOString(),
    } satisfies CompareQueryResult;
  }

  throw new QueryValidationError("유효하지 않은 비교 설정입니다.");
}
