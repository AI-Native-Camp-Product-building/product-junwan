"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  IconArrowUp,
  IconArrowDown,
  IconLayoutColumns,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import type { AdRow } from "@/types/dashboard";
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

const COUNTRY_FLAGS: Record<string, string> = {
  "레진 KR": "\u{1F1F0}\u{1F1F7}",
  "봄툰 KR": "\u{1F1F0}\u{1F1F7}",
  "KR_레진": "\u{1F1F0}\u{1F1F7}",
  "KR_봄툰": "\u{1F1F0}\u{1F1F7}",
  US: "\u{1F1FA}\u{1F1F8}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
  TH: "\u{1F1F9}\u{1F1ED}",
  TW: "\u{1F1F9}\u{1F1FC}",
  ES: "\u{1F1EA}\u{1F1F8}",
};

function formatKrw(value: number): string {
  return `\u{20A9}${new Intl.NumberFormat("ko-KR").format(Math.round(value))}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

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
    accessorKey: "adSpend",
    header: "광고비",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatKrw(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "impressions",
    header: "노출수",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "clicks",
    header: "클릭",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "ctr",
    header: "CTR",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatPercent(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "signups",
    header: "회원가입",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "signupCpa",
    header: "가입CPA",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatKrw(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "conversions",
    header: "결제전환",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(getValue<number>())}</span>
    ),
    enableHiding: true,
  },
  {
    accessorKey: "revenue",
    header: "결제금액",
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatKrw(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "roas",
    header: "ROAS",
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

/** Default hidden columns. */
const DEFAULT_HIDDEN: VisibilityState = {
  goal: false,
  creativeType: false,
  impressions: false,
  clicks: false,
  ctr: false,
  signupCpa: false,
  conversions: false,
};

export function DashboardDataTable({ data, isLoading }: DashboardDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "roas", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(DEFAULT_HIDDEN);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

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
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-4 pb-4 lg:px-6">
          <Input
            placeholder="검색..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm bg-white/[0.03] border-white/[0.08]"
            aria-label="테이블 검색"
          />
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      <div className="flex items-center gap-1">
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
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
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
                      <TableCell key={cell.id} className="whitespace-nowrap">
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
