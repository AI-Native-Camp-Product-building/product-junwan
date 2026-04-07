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
import { DIMENSIONS, DIMENSION_MAP, METRIC_MAP } from "@/config/query-schema";
import type { QueryResultRow, CompareQueryResult } from "@/types/query";
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
}

export function QueryResultTable({
  rows,
  dimensions,
  metrics,
  isLoading,
  defaultSort,
  onDimensionsChange,
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
