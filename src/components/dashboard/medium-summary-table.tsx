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

interface MediumSummaryTableProps {
  data: AdRow[];
  isLoading: boolean;
}

interface MediumAgg {
  medium: string;
  adSpend: number;
  clicks: number;
  signups: number;
  conversions: number;
  revenue: number;
  roas: number;
  ctr: number;
}

const HEATMAP_COLS = ["adSpend", "clicks", "signups", "roas", "ctr"] as const;

function aggregateByMedium(data: AdRow[]): MediumAgg[] {
  const map = new Map<string, { adSpend: number; revenue: number; clicks: number; impressions: number; signups: number; conversions: number }>();
  for (const row of data) {
    const e = map.get(row.medium) ?? { adSpend: 0, revenue: 0, clicks: 0, impressions: 0, signups: 0, conversions: 0 };
    e.adSpend += row.adSpend;
    e.revenue += row.revenue;
    e.clicks += row.clicks;
    e.impressions += row.impressions;
    e.signups += row.signups;
    e.conversions += row.conversions;
    map.set(row.medium, e);
  }

  return [...map.entries()]
    .map(([medium, a]) => ({
      medium,
      adSpend: a.adSpend,
      clicks: a.clicks,
      signups: a.signups,
      conversions: a.conversions,
      revenue: a.revenue,
      roas: a.adSpend > 0 ? (a.revenue / a.adSpend) * 100 : 0,
      ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.adSpend - a.adSpend);
}

function getHeatmapBg(value: number, min: number, max: number): string {
  if (max === min) return "";
  const intensity = (value - min) / (max - min);
  return `hsl(var(--chart-1) / ${(intensity * 0.25).toFixed(3)})`;
}

const exploreUrl = buildExploreUrl({
  dimensions: ["medium"],
  metrics: ["ad_spend_krw", "clicks", "signups", "conversions", "revenue_krw", "roas", "ctr"],
  sort: { field: "ad_spend_krw", direction: "desc" },
});

export function MediumSummaryTable({ data, isLoading }: MediumSummaryTableProps) {
  const mediums = React.useMemo(() => aggregateByMedium(data), [data]);

  const minMax = React.useMemo(() => {
    const result: Record<string, { min: number; max: number }> = {};
    for (const col of HEATMAP_COLS) {
      let min = Infinity, max = -Infinity;
      for (const m of mediums) {
        const v = m[col];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      result[col] = { min, max };
    }
    return result;
  }, [mediums]);

  if (isLoading) {
    return (
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader><CardTitle>매체별 성과 요약</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle>매체별 성과 요약</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>매체</TableHead>
                <TableHead className="text-right">광고비</TableHead>
                <TableHead className="text-right">클릭</TableHead>
                <TableHead className="text-right">가입</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediums.map((m) => (
                <TableRow key={m.medium}>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">{m.medium}</Badge>
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(m.adSpend, minMax.adSpend.min, minMax.adSpend.max) }}
                  >
                    {formatKrw(m.adSpend)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(m.clicks, minMax.clicks.min, minMax.clicks.max) }}
                  >
                    {formatNumber(m.clicks)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(m.signups, minMax.signups.min, minMax.signups.max) }}
                  >
                    {formatNumber(m.signups)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(m.roas, minMax.roas.min, minMax.roas.max) }}
                  >
                    {formatPercent(m.roas)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ backgroundColor: getHeatmapBg(m.ctr, minMax.ctr.min, minMax.ctr.max) }}
                  >
                    {formatPercent(m.ctr)}
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
