"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type Column,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type ColumnOrderState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  IconArrowUp,
  IconArrowDown,
  IconFilter,
  IconFilterOff,
  IconLayoutColumns,
  IconChevronLeft,
  IconChevronRight,
  IconGripVertical,
  IconDownload,
  IconFlame,
} from "@tabler/icons-react";

import { exportDashboardRowsToCsv } from "@/lib/dashboard-export";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";

import type { AdRow } from "@/types/dashboard";
import { COUNTRY_FLAGS, getHeatmapBg } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardDataTableProps {
  data: AdRow[];
  isLoading: boolean;
}

const HEATMAP_COLUMNS = ["adSpend", "impressions", "clicks", "ctr", "signups", "signupCpa", "conversions", "revenue", "roas"] as const;


// KEYWORD: dashboard-table-derived-metrics
function getConversionCpa(row: AdRow): number {
  return row.conversions > 0 ? row.adSpend / row.conversions : 0;
}

function getConversionCvr(row: AdRow): number {
  return row.clicks > 0 ? (row.conversions / row.clicks) * 100 : 0;
}

// KEYWORD: dashboard-table-columns
const columns: ColumnDef<AdRow>[] = [
  {
    accessorKey: "country",
    header: "국가",
    cell: ({ getValue }) => {
      const country = getValue<string>();
      const flag = COUNTRY_FLAGS[country] ?? "";
      return (
        <Badge variant="outline" className="gap-1 font-normal">
          <span>{flag}</span>
          <span>{country}</span>
        </Badge>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "month",
    header: "월",
  },
  {
    accessorKey: "date",
    header: "일자",
  },
  {
    accessorKey: "medium",
    header: "매체",
    cell: ({ getValue }) => (
      <Badge variant="secondary" className="font-normal">
        {getValue<string>()}
      </Badge>
    ),
  },
  {
    accessorKey: "goal",
    header: "목표",
    enableHiding: true,
  },
  {
    accessorKey: "creativeType",
    header: "소재종류",
    enableHiding: true,
  },
  {
    accessorKey: "creativeName",
    header: "작품명",
    cell: ({ getValue }) => (
      <span className="max-w-[180px] truncate block" title={getValue<string>()}>
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "adSpend",
    header: "광고비",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatKrw(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "impressions",
    header: "노출수",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "clicks",
    header: "클릭",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "ctr",
    header: "CTR",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatPercent(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "signups",
    header: "회원가입",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "signupCpa",
    header: "가입CPA",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatKrw(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "conversions",
    header: "결제전환",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    id: "conversionCpa",
    header: "결제 CPA",
    accessorFn: (row) => getConversionCpa(row),
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatKrw(Number(getValue()))}</span>
    ),
    enableHiding: true,
  },
  {
    id: "conversionCvr",
    header: "결제 CVR",
    accessorFn: (row) => getConversionCvr(row),
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatPercent(Number(getValue()))}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "revenue",
    header: "결제금액",
    sortingFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatKrw(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "roas",
    header: "ROAS",
    sortingFn: "basic",
    cell: ({ getValue }) => {
      const roas = getValue<number>();
      return (
        <span
          className={`tabular-nums font-medium ${
            roas >= 100
              ? "text-[hsl(160,60%,45%)]"
              : "text-[hsl(0,72%,51%)]"
          }`}
        >
          {formatPercent(roas)}
        </span>
      );
    },
  },
];

/** Inline column filter input. */
function ColumnFilterInput({ column }: { column: Column<AdRow, unknown> }) {
  const filterValue = column.getFilterValue();

  return (
    <Input
      placeholder="필터..."
      value={(filterValue as string) ?? ""}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      className="h-6 w-full min-w-[60px] max-w-[120px] bg-white/[0.03] border-white/[0.06] text-xs px-1.5"
      aria-label={`${typeof column.columnDef.header === "string" ? column.columnDef.header : column.id} 필터`}
    />
  );
}

/** Default hidden columns. */
const DEFAULT_HIDDEN: VisibilityState = {
  goal: false,
  creativeType: false,
  impressions: false,
  clicks: false,
  ctr: false,
  signupCpa: false,
  conversions: false,
  conversionCpa: false,
  conversionCvr: true,
};

export function DashboardDataTable({ data, isLoading }: DashboardDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "roas", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(DEFAULT_HIDDEN);
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [showColumnFilters, setShowColumnFilters] = React.useState(false);
  const [draggedCol, setDraggedCol] = React.useState<string | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  const columnMinMax = React.useMemo(() => {
    if (!heatmapEnabled || data.length === 0) return null;
    const result: Record<string, { min: number; max: number }> = {};
    for (const col of HEATMAP_COLUMNS) {
      let min = Infinity, max = -Infinity;
      for (const row of data) {
        const v = row[col] as number;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      result[col] = { min, max };
    }
    return result;
  }, [data, heatmapEnabled]);

  function getHeatmapStyle(columnId: string, value: unknown, minMax: Record<string, { min: number; max: number }> | null): React.CSSProperties | undefined {
    if (!minMax || !(columnId in minMax)) return undefined;
    const num = Number(value);
    if (isNaN(num)) return undefined;
    const { min, max } = minMax[columnId];
    const bg = getHeatmapBg(num, min, max, 0.2);
    return bg ? { backgroundColor: bg } : undefined;
  }

  if (isLoading) {
    return (
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>상세 데이터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px] px-0">
      <CardHeader>
        <CardTitle>상세 데이터</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {/* KEYWORD: dashboard-table-toolbar */}
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-4 pb-4 lg:px-6">
          <Input
            placeholder="검색..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm bg-white/[0.03] border-white/[0.08]"
            aria-label="테이블 검색"
          />
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const visibleRows = table.getFilteredRowModel().rows.map((r) => r.original);
              exportDashboardRowsToCsv(
                visibleRows,
                `aminsight-${new Date().toISOString().slice(0, 10)}.csv`,
              );
            }}
            aria-label="CSV 다운로드"
          >
            <IconDownload className="size-4" />
            CSV
          </Button>
          <Button
            variant={showColumnFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setShowColumnFilters((v) => !v);
              if (showColumnFilters) setColumnFilters([]);
            }}
            aria-label="컬럼 필터 토글"
            aria-pressed={showColumnFilters}
          >
            {showColumnFilters ? <IconFilterOff className="size-4" /> : <IconFilter className="size-4" />}
            필터
          </Button>
          <Button
            variant={heatmapEnabled ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setHeatmapEnabled((v) => !v)}
            aria-label="히트맵 토글"
            aria-pressed={heatmapEnabled}
          >
            <IconFlame className="size-4" />
            히트맵
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="gap-1.5" />
              }
            >
              <IconLayoutColumns className="size-4" />
              컬럼
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`whitespace-nowrap select-none ${draggedCol === header.id ? "opacity-50" : ""}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedCol && draggedCol !== header.id) {
                          const currentOrder = columnOrder.length > 0
                            ? [...columnOrder]
                            : table.getAllLeafColumns().map((c) => c.id);
                          const fromIdx = currentOrder.indexOf(draggedCol);
                          const toIdx = currentOrder.indexOf(header.id);
                          if (fromIdx !== -1 && toIdx !== -1) {
                            currentOrder.splice(fromIdx, 1);
                            currentOrder.splice(toIdx, 0, draggedCol);
                            setColumnOrder(currentOrder);
                          }
                        }
                        setDraggedCol(null);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          draggable
                          onDragStart={(e) => {
                            setDraggedCol(header.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", header.id);
                          }}
                          onDragEnd={() => setDraggedCol(null)}
                          className="cursor-grab active:cursor-grabbing shrink-0"
                        >
                          <IconGripVertical className="size-3 text-muted-foreground/40" />
                        </span>
                        <button
                          type="button"
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getIsSorted() === "asc" && (
                            <IconArrowUp className="size-3.5" />
                          )}
                          {header.column.getIsSorted() === "desc" && (
                            <IconArrowDown className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
              {showColumnFilters && (
                <TableRow className="hover:bg-transparent">
                  {table.getHeaderGroups()[0]?.headers.map((header) => (
                    <TableHead key={`filter-${header.id}`} className="py-1">
                      {header.column.getCanFilter() ? (
                        <ColumnFilterInput column={header.column} />
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="whitespace-nowrap"
                        style={getHeatmapStyle(cell.column.id, cell.getValue(), columnMinMax)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <span className="text-sm text-muted-foreground">
            총 {table.getFilteredRowModel().rows.length}건 중{" "}
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}
            -
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="이전 페이지"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              페이지 {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="다음 페이지"
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
