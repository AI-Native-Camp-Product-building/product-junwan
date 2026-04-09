"use client";

import * as React from "react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import type { AdRow } from "@/types/dashboard";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";
import { buildExploreUrl } from "@/lib/explore-link";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const COUNTRY_FLAGS: Record<string, string> = {
  "레진 KR": "\u{1F1F0}\u{1F1F7}",
  "봄툰 KR": "\u{1F1F0}\u{1F1F7}",
  US: "\u{1F1FA}\u{1F1F8}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
  TH: "\u{1F1F9}\u{1F1ED}",
  TW: "\u{1F1F9}\u{1F1FC}",
  ES: "\u{1F1EA}\u{1F1F8}",
};

interface CountrySummaryTableProps {
  data: AdRow[];
  isLoading: boolean;
}

interface CountryAgg {
  country: string;
  adSpend: number;
  signups: number;
  conversions: number;
  revenue: number;
  roas: number;
}

const HEATMAP_COLS = ["adSpend", "signups", "conversions", "roas"] as const;

function aggregateByCountry(data: AdRow[]): CountryAgg[] {
  const map = new Map<string, { adSpend: number; revenue: number; signups: number; conversions: number }>();
  for (const row of data) {
    const e = map.get(row.country) ?? { adSpend: 0, revenue: 0, signups: 0, conversions: 0 };
    e.adSpend += row.adSpend;
    e.revenue += row.revenue;
    e.signups += row.signups;
    e.conversions += row.conversions;
    map.set(row.country, e);
  }

  return [...map.entries()]
    .map(([country, a]) => ({
      country,
      adSpend: a.adSpend,
      signups: a.signups,
      conversions: a.conversions,
      revenue: a.revenue,
      roas: a.adSpend > 0 ? (a.revenue / a.adSpend) * 100 : 0,
    }))
    .sort((a, b) => b.adSpend - a.adSpend);
}

function getHeatmapBg(value: number, min: number, max: number): string {
  if (max === min) return "";
  const intensity = (value - min) / (max - min);
  return `hsl(var(--chart-1) / ${(intensity * 0.25).toFixed(3)})`;
}

const exploreUrl = buildExploreUrl({
  dimensions: ["country"],
  metrics: ["ad_spend_krw", "signups", "conversions", "revenue_krw", "roas"],
  sort: { field: "ad_spend_krw", direction: "desc" },
});

export function CountrySummaryTable({ data, isLoading }: CountrySummaryTableProps) {
  const countries = React.useMemo(() => aggregateByCountry(data), [data]);

  const minMax = React.useMemo(() => {
    const result: Record<string, { min: number; max: number }> = {};
    for (const col of HEATMAP_COLS) {
      let min = Infinity, max = -Infinity;
      for (const c of countries) {
        const v = c[col];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      result[col] = { min, max };
    }
    return result;
  }, [countries]);

  if (isLoading) {
    return (
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader><CardTitle>국가별 성과 요약</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>국가별 성과 요약</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>국가</TableHead>
                <TableHead className="text-right">광고비</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">가입</TableHead>
                <TableHead className="text-right">결제전환</TableHead>
                <TableHead className="text-right">결제금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.map((c) => (
                <TableRow key={c.country}>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 font-normal">
                      <span>{COUNTRY_FLAGS[c.country] ?? ""}</span>
                      <span>{c.country}</span>
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(c.adSpend, minMax.adSpend.min, minMax.adSpend.max) }}
                  >
                    {formatKrw(c.adSpend)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums font-medium"
                    style={{ backgroundColor: getHeatmapBg(c.roas, minMax.roas.min, minMax.roas.max) }}
                  >
                    <span className={c.roas >= 100 ? "text-[hsl(160,60%,45%)]" : "text-[hsl(0,72%,51%)]"}>
                      {formatPercent(c.roas)}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(c.signups, minMax.signups.min, minMax.signups.max) }}
                  >
                    {formatNumber(c.signups)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(c.conversions, minMax.conversions.min, minMax.conversions.max) }}
                  >
                    {formatNumber(c.conversions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKrw(c.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <div className="px-4 pb-3 lg:px-6">
        <Link
          href={exploreUrl}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          탐색에서 자세히 보기
          <IconArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
