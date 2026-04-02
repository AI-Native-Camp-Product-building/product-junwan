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
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewKey } from "./query-view-tabs";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtKrw(value: number | null | undefined): string {
  if (value == null) return "-";
  return `\u{20A9}${new Intl.NumberFormat("ko-KR").format(Math.round(value))}`;
}

function fmtNum(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${Number(value).toFixed(1)}%`;
}

function fmtRoas(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${Number(value).toFixed(0)}%`;
}

// ---------------------------------------------------------------------------
// Change indicator component
// ---------------------------------------------------------------------------

function ChangeIndicator({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;
  const num = Number(value);
  if (num > 0) {
    return (
      <span className="text-[hsl(160,60%,45%)] tabular-nums">
        ↑{Math.abs(num).toFixed(1)}%
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className="text-[hsl(0,72%,51%)] tabular-nums">
        ↓{Math.abs(num).toFixed(1)}%
      </span>
    );
  }
  return <span className="text-muted-foreground tabular-nums">0.0%</span>;
}

function RoasChangeIndicator({ value }: { value: number | string | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;
  const str = String(value);
  // If it's already formatted like "↑11p", render as-is with color
  if (str.startsWith("↑")) {
    return <span className="text-[hsl(160,60%,45%)] tabular-nums">{str}</span>;
  }
  if (str.startsWith("↓")) {
    return <span className="text-[hsl(0,72%,51%)] tabular-nums">{str}</span>;
  }
  const num = Number(value);
  if (isNaN(num)) return <span className="text-muted-foreground">{str}</span>;
  if (num > 0) {
    return (
      <span className="text-[hsl(160,60%,45%)] tabular-nums">
        ↑{Math.abs(num).toFixed(1)}p
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className="text-[hsl(0,72%,51%)] tabular-nums">
        ↓{Math.abs(num).toFixed(1)}p
      </span>
    );
  }
  return <span className="text-muted-foreground tabular-nums">0.0p</span>;
}

// ---------------------------------------------------------------------------
// Locale badge (country flag)
// ---------------------------------------------------------------------------

const COUNTRY_FLAGS: Record<string, string> = {
  "레진 KR": "\u{1F1F0}\u{1F1F7}",
  "봄툰 KR": "\u{1F1F0}\u{1F1F7}",
  "레진KR": "\u{1F1F0}\u{1F1F7}",
  "봄툰KR": "\u{1F1F0}\u{1F1F7}",
  "KR_레진": "\u{1F1F0}\u{1F1F7}",
  "KR_봄툰": "\u{1F1F0}\u{1F1F7}",
  US: "\u{1F1FA}\u{1F1F8}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
  TH: "\u{1F1F9}\u{1F1ED}",
  TW: "\u{1F1F9}\u{1F1FC}",
  ES: "\u{1F1EA}\u{1F1F8}",
  TOTAL: "",
};

function LocaleCell({ value }: { value: string }) {
  const flag = COUNTRY_FLAGS[value] ?? "";
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      {flag && <span>{flag}</span>}
      <span>{value}</span>
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Column definitions per view
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function col(
  key: string,
  header: string,
  cellFn?: (val: unknown) => React.ReactNode,
): ColumnDef<Row> {
  return {
    accessorKey: key,
    header,
    cell: ({ getValue }) => {
      const v = getValue();
      if (cellFn) return cellFn(v);
      return <span className="tabular-nums">{String(v ?? "-")}</span>;
    },
  };
}

const localeCol: ColumnDef<Row> = {
  accessorKey: "sheet_name",
  header: "로케일",
  cell: ({ getValue }) => <LocaleCell value={String(getValue() ?? "")} />,
  enableHiding: false,
};

function buildColumns(viewType: ViewKey): ColumnDef<Row>[] {
  switch (viewType) {
    case "주간_로케일별":
      return [
        localeCol,
        col("ad_spend_krw", "광고비", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("revenue_krw", "결제금액", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("roas", "ROAS", (v) => {
          const n = Number(v);
          return (
            <span className={`tabular-nums font-medium ${n >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}`}>
              {fmtRoas(v as number)}
            </span>
          );
        }),
        col("signups", "회원가입", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("conversions", "결제전환", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("signup_cpa", "가입CPA", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("prev_ad_spend_krw", "광고비(전주)", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("prev_roas", "ROAS(전주)", (v) => <span className="tabular-nums">{fmtRoas(v as number)}</span>),
        col("spend_change_pct", "증감%", (v) => <ChangeIndicator value={v as number} />),
        col("roas_change_pp", "ROAS변화", (v) => <RoasChangeIndicator value={v as number} />),
      ];

    case "주간_매체별":
      return [
        localeCol,
        col("medium", "매체", (v) => (
          <Badge variant="secondary" className="font-normal">{String(v ?? "")}</Badge>
        )),
        col("ad_spend_krw", "광고비", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("revenue_krw", "결제금액", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("roas", "ROAS", (v) => {
          const n = Number(v);
          return (
            <span className={`tabular-nums font-medium ${n >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}`}>
              {fmtRoas(v as number)}
            </span>
          );
        }),
        col("signups", "회원가입", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("conversions", "결제전환", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("signup_cpa", "가입CPA", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
      ];

    case "주간_목표별":
      return [
        localeCol,
        col("goal", "목표", (v) => (
          <Badge variant="secondary" className="font-normal">{String(v ?? "")}</Badge>
        )),
        col("ad_spend_krw", "광고비", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("revenue_krw", "결제금액", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("roas", "ROAS", (v) => {
          const n = Number(v);
          return (
            <span className={`tabular-nums font-medium ${n >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}`}>
              {fmtRoas(v as number)}
            </span>
          );
        }),
        col("signups", "회원가입", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("conversions", "결제전환", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("signup_cpa", "가입CPA", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
      ];

    case "월간_로케일별":
      return [
        localeCol,
        col("ad_spend_krw", "광고비", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("revenue_krw", "결제금액", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("roas", "ROAS", (v) => {
          const n = Number(v);
          return (
            <span className={`tabular-nums font-medium ${n >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}`}>
              {fmtRoas(v as number)}
            </span>
          );
        }),
        col("signups", "회원가입", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("conversions", "결제전환", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("signup_cpa", "가입CPA", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("prev_ad_spend_krw", "광고비(전월)", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("prev_roas", "ROAS(전월)", (v) => <span className="tabular-nums">{fmtRoas(v as number)}</span>),
        col("spend_change_pct", "증감%", (v) => <ChangeIndicator value={v as number} />),
        col("roas_change_pp", "ROAS변화", (v) => <RoasChangeIndicator value={v as number} />),
      ];

    case "작품별_효율":
      return [
        col("rank_num", "순위", (v) => <span className="tabular-nums font-medium">{fmtNum(v as number)}</span>),
        { ...localeCol, accessorKey: "sheet_name" },
        col("creative_name", "작품명", (v) => (
          <span className="max-w-[200px] truncate block" title={String(v ?? "")}>
            {String(v ?? "")}
          </span>
        )),
        col("ad_spend_krw", "광고비", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("revenue_krw", "결제금액", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("roas", "ROAS", (v) => {
          if (v == null) return <span className="text-muted-foreground">-</span>;
          const n = Number(v);
          return (
            <span className={`tabular-nums font-medium ${n >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}`}>
              {fmtRoas(n)}
            </span>
          );
        }),
        col("conversions", "결제전환", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("signups", "회원가입", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("signup_cpa", "가입CPA", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
      ];

    case "원본_마스터":
      return [
        localeCol,
        col("medium", "매체", (v) => (
          <Badge variant="secondary" className="font-normal">{String(v ?? "")}</Badge>
        )),
        col("ad_spend_krw", "광고비", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("revenue_krw", "결제금액", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("roas", "ROAS", (v) => {
          const n = Number(v);
          return (
            <span className={`tabular-nums font-medium ${n >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}`}>
              {fmtRoas(v as number)}
            </span>
          );
        }),
        col("signups", "회원가입", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("conversions", "결제전환", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("signup_cpa", "가입CPA", (v) => <span className="tabular-nums">{fmtKrw(v as number)}</span>),
        col("impressions", "노출", (v) => <span className="tabular-nums">{fmtNum(v as number)}</span>),
        col("avg_ctr", "CTR", (v) => <span className="tabular-nums">{fmtPct(v as number)}</span>),
      ];

    default:
      return [];
  }
}

const VIEW_TITLES: Record<ViewKey, string> = {
  주간_로케일별: "주간 로케일별 성과",
  주간_매체별: "주간 매체별 성과",
  주간_목표별: "주간 목표별 성과",
  월간_로케일별: "월간 로케일별 성과",
  작품별_효율: "작품별 효율 (결제 ROAS / 가입 CPA)",
  원본_마스터: "원본 마스터 데이터",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface QueryViewTableProps {
  data: Record<string, unknown>[];
  viewType: string;
  isLoading: boolean;
}

export function QueryViewTable({ data, viewType, isLoading }: QueryViewTableProps) {
  const vt = viewType as ViewKey;
  const columns = React.useMemo(() => buildColumns(vt), [vt]);

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>{VIEW_TITLES[vt] ?? "데이터"}</CardTitle>
          <CardDescription>데이터를 불러오는 중...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
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
        <CardTitle>{VIEW_TITLES[vt] ?? "데이터"}</CardTitle>
        <CardDescription>
          {data.length > 0 ? `총 ${data.length}건` : "데이터가 없습니다"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap select-none">
                      <button
                        type="button"
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && (
                          <IconArrowUp className="size-3.5" />
                        )}
                        {header.column.getIsSorted() === "desc" && (
                          <IconArrowDown className="size-3.5" />
                        )}
                      </button>
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
                table.getRowModel().rows.map((row) => {
                  const sheetName = String(row.original.sheet_name ?? "");
                  const isTotalRow =
                    sheetName === "TOTAL" || sheetName === "합계" || sheetName === "총합계";

                  return (
                    <TableRow
                      key={row.id}
                      className={isTotalRow ? "font-semibold bg-white/[0.02]" : ""}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
