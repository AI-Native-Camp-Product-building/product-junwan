"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { IconArrowUp, IconArrowDown, IconPlus, IconX } from "@tabler/icons-react";
import { DIMENSIONS, DIMENSION_MAP, METRIC_MAP, METRICS } from "@/config/query-schema";
import type { QueryResultRow, CompareQueryResult, FilterCondition, MetricKey } from "@/types/query";
import { ColumnFilterPopover } from "@/components/explore/column-filter-popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCell(key: string, value: unknown): string {
  if (value == null) return "-";
  const metricMeta = METRIC_MAP.get(key as never);
  if (metricMeta) return metricMeta.format(Number(value));
  return String(value);
}

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** Compute TOTAL row: SUM for base metrics, weighted recalculation for derived. */
function computeTotalRow(
  rows: QueryResultRow[],
  dimensions: string[],
  metrics: string[],
): QueryResultRow {
  const total: QueryResultRow = {};

  // First dimension shows "TOTAL"
  if (dimensions.length > 0) {
    total[dimensions[0]] = "TOTAL";
    for (let i = 1; i < dimensions.length; i++) {
      total[dimensions[i]] = "";
    }
  }

  // Sum all base (non-derived) metrics
  const sums: Record<string, number> = {};
  for (const metric of metrics) {
    sums[metric] = 0;
  }
  for (const row of rows) {
    for (const metric of metrics) {
      sums[metric] += Number(row[metric] ?? 0);
    }
  }

  // For derived metrics, recalculate from base sums
  for (const metric of metrics) {
    const meta = METRICS.find((m) => m.key === metric);
    if (!meta?.derived) {
      total[metric] = sums[metric];
      continue;
    }

    // Derived: recalculate from underlying base sums
    if (metric === "roas") {
      const spend = sums["ad_spend_krw"] ?? 0;
      const rev = sums["revenue_krw"] ?? 0;
      total[metric] = spend > 0 ? Math.round((rev / spend) * 100 * 100) / 100 : 0;
    } else if (metric === "ctr") {
      const clicks = sums["clicks"] ?? 0;
      const impr = sums["impressions"] ?? 0;
      total[metric] = impr > 0 ? Math.round((clicks / impr) * 100 * 100) / 100 : 0;
    } else if (metric === "signup_cpa") {
      const spend = sums["ad_spend_krw"] ?? 0;
      const signups = sums["signups"] ?? 0;
      total[metric] = signups > 0 ? Math.round(spend / signups) : 0;
    } else {
      // Fallback: average
      total[metric] = rows.length > 0 ? Math.round((sums[metric] / rows.length) * 100) / 100 : 0;
    }
  }

  return total;
}

// ---------------------------------------------------------------------------
// Column filter helpers
// ---------------------------------------------------------------------------

function getColumnType(key: string, isDimension: boolean): "text" | "number" | "derived" {
  if (isDimension) return "text";
  const meta = METRIC_MAP.get(key as MetricKey);
  if (meta?.derived) return "derived";
  return "number";
}

function getAvailableValues(
  key: string,
  rows: QueryResultRow[],
  filterValueOptions?: Map<string, string[]>,
): string[] {
  const fromOptions = filterValueOptions?.get(key);
  if (fromOptions) return fromOptions;
  const values = new Set<string>();
  for (const row of rows) {
    const val = row[key];
    if (val != null && val !== "") values.add(String(val));
  }
  return Array.from(values).sort();
}

function findFilter(filters: FilterCondition[], field: string): FilterCondition | undefined {
  return filters.find((f) => f.field === field);
}

// ---------------------------------------------------------------------------
// Standard result table
// ---------------------------------------------------------------------------

interface QueryResultTableProps {
  rows: QueryResultRow[];
  dimensions: string[];
  metrics: string[];
  isLoading: boolean;
  defaultSort?: { field: string; direction: "asc" | "desc" };
  /** Callback to add/remove a dimension and re-execute the query. */
  onDimensionsChange?: (dimensions: string[]) => void;
  /** Column filter props — when provided, headers show ColumnFilterPopover. */
  filters?: FilterCondition[];
  filterValueOptions?: Map<string, string[]>;
  onApplyFilter?: (
    field: string,
    operator: FilterCondition["operator"],
    value: FilterCondition["value"],
  ) => void;
  onClearFilter?: (field: string) => void;
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
}

export function QueryResultTable({
  rows,
  dimensions,
  metrics,
  isLoading,
  defaultSort,
  onDimensionsChange,
  filters,
  filterValueOptions,
  onApplyFilter,
  onClearFilter,
  onSortChange,
}: QueryResultTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>(
    defaultSort ? [{ id: defaultSort.field, desc: defaultSort.direction === "desc" }] : [],
  );

  const columns = React.useMemo<ColumnDef<QueryResultRow>[]>(() => {
    const cols: ColumnDef<QueryResultRow>[] = [];

    for (const dim of dimensions) {
      const meta = DIMENSION_MAP.get(dim as never);
      cols.push({
        accessorKey: dim,
        header: meta?.label ?? dim,
        cell: ({ getValue }) => String(getValue() ?? "-"),
      });
    }

    for (const metric of metrics) {
      const meta = METRIC_MAP.get(metric as never);
      cols.push({
        accessorKey: metric,
        header: meta?.label ?? metric,
        cell: ({ getValue }) => (
          <span className="tabular-nums">
            {formatCell(metric, getValue())}
          </span>
        ),
      });
    }

    return cols;
  }, [dimensions, metrics]);

  const totalRow = React.useMemo(
    () => (rows.length > 0 ? computeTotalRow(rows, dimensions, metrics) : null),
    [rows, dimensions, metrics],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        쿼리 실행 중...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        결과가 없습니다. 쿼리를 실행해주세요.
      </div>
    );
  }

  const addableDimensions = DIMENSIONS.filter((d) => !dimensions.includes(d.key));

  return (
    <div className="flex flex-col gap-2">
      {/* Dimension chips: current + addable */}
      {onDimensionsChange && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">컬럼:</span>
          {dimensions.map((dim) => {
            const meta = DIMENSION_MAP.get(dim as never);
            return (
              <button
                key={dim}
                type="button"
                onClick={() => onDimensionsChange(dimensions.filter((d) => d !== dim))}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-white/[0.1]"
              >
                {meta?.label ?? dim}
                <IconX className="size-3 opacity-50" />
              </button>
            );
          })}
          {addableDimensions.map((dim) => (
            <button
              key={dim.key}
              type="button"
              onClick={() => onDimensionsChange([...dimensions, dim.key])}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/[0.1] px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
            >
              <IconPlus className="size-3" />
              {dim.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const colKey = header.column.id;
                  const isDimension = dimensions.includes(colKey);
                  const label =
                    typeof header.column.columnDef.header === "string"
                      ? header.column.columnDef.header
                      : (isDimension
                          ? (DIMENSION_MAP.get(colKey as never)?.label ?? colKey)
                          : (METRIC_MAP.get(colKey as MetricKey)?.label ?? colKey));
                  const activeFilter = findFilter(filters ?? [], colKey);
                  const sortEntry = sorting.find((s) => s.id === colKey);
                  const sortDirection = sortEntry ? (sortEntry.desc ? "desc" : "asc") : null;

                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {onApplyFilter ? (
                        <ColumnFilterPopover
                          columnKey={colKey}
                          columnLabel={label}
                          columnType={getColumnType(colKey, isDimension)}
                          availableValues={
                            isDimension
                              ? getAvailableValues(colKey, rows, filterValueOptions)
                              : undefined
                          }
                          currentFilter={activeFilter}
                          sortDirection={sortDirection}
                          onApplyFilter={onApplyFilter}
                          onClearFilter={onClearFilter!}
                          onSort={(field, dir) => {
                            setSorting([{ id: field, desc: dir === "desc" }]);
                            onSortChange?.(field, dir);
                          }}
                        >
                          <div className="flex items-center gap-1 cursor-pointer select-none">
                            {label}
                            {activeFilter && (
                              <span className="size-1.5 rounded-full bg-primary inline-block" />
                            )}
                            {sortDirection === "asc" && <IconArrowUp className="size-3.5" />}
                            {sortDirection === "desc" && <IconArrowDown className="size-3.5" />}
                          </div>
                        </ColumnFilterPopover>
                      ) : (
                        <div
                          className="flex items-center gap-1 cursor-pointer select-none"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" && <IconArrowUp className="size-3.5" />}
                          {header.column.getIsSorted() === "desc" && <IconArrowDown className="size-3.5" />}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {totalRow && (
            <tfoot>
              <TableRow className="border-t-2 border-white/[0.12] bg-white/[0.04] font-semibold">
                {[...dimensions, ...metrics].map((key) => {
                  const isDim = dimensions.includes(key);
                  const val = totalRow[key];
                  return (
                    <TableCell key={key} className="whitespace-nowrap">
                      {isDim ? (
                        <span className="text-foreground/90">{String(val)}</span>
                      ) : (
                        <span className="tabular-nums">{formatCell(key, val)}</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </tfoot>
          )}
        </Table>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          총 {rows.length}건
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare result table
// ---------------------------------------------------------------------------

interface CompareResultTableProps {
  result: CompareQueryResult;
  dimensions: string[];
  metrics: string[];
  isLoading: boolean;
  baseLabel?: string;
  compareLabel?: string;
}

export function CompareResultTable({
  result,
  dimensions,
  metrics,
  isLoading,
  baseLabel = "기준",
  compareLabel = "비교",
}: CompareResultTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo<ColumnDef<QueryResultRow>[]>(() => {
    const cols: ColumnDef<QueryResultRow>[] = [];

    for (const dim of dimensions) {
      const meta = DIMENSION_MAP.get(dim as never);
      cols.push({
        accessorKey: dim,
        header: meta?.label ?? dim,
        cell: ({ getValue }) => String(getValue() ?? "-"),
      });
    }

    for (const metric of metrics) {
      const meta = METRIC_MAP.get(metric as never);
      const label = meta?.label ?? metric;

      cols.push({
        accessorKey: `${metric}_base`,
        header: `${label}(${baseLabel})`,
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatCell(metric, getValue())}</span>
        ),
      });

      cols.push({
        accessorKey: `${metric}_compare`,
        header: `${label}(${compareLabel})`,
        cell: ({ getValue }) => (
          <span className="tabular-nums text-muted-foreground">{formatCell(metric, getValue())}</span>
        ),
      });

      cols.push({
        accessorKey: `${metric}_change`,
        header: "변화",
        cell: ({ getValue }) => {
          const v = Number(getValue() ?? 0);
          return (
            <span
              className={cn(
                "tabular-nums text-xs font-medium",
                v > 0 && "text-[hsl(160,60%,45%)]",
                v < 0 && "text-[hsl(0,72%,51%)]",
                v === 0 && "text-muted-foreground",
              )}
            >
              {formatChange(v)}
            </span>
          );
        },
      });
    }

    return cols;
  }, [dimensions, metrics, baseLabel, compareLabel]);

  const table = useReactTable({
    data: result.changes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        비교 쿼리 실행 중...
      </div>
    );
  }

  if (result.changes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        비교 결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="whitespace-nowrap cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && <IconArrowUp className="size-3.5" />}
                    {header.column.getIsSorted() === "desc" && <IconArrowDown className="size-3.5" />}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-4 py-2 text-xs text-muted-foreground">
        총 {result.changes.length}건
      </div>
    </div>
  );
}
