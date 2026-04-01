"use client";

import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import type { KpiSummary } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardsProps {
  summary: KpiSummary;
  isLoading: boolean;
}

/** Format KRW currency with compact notation for large values. */
function formatKrw(value: number): string {
  if (value >= 1_0000_0000) {
    return `₩${(value / 1_0000_0000).toFixed(1)}억`;
  }
  if (value >= 1_0000) {
    return `₩${(value / 1_0000).toFixed(0)}만`;
  }
  return `₩${new Intl.NumberFormat("ko-KR").format(Math.round(value))}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

interface KpiCardDef {
  label: string;
  getValue: (s: KpiSummary) => string;
  getChange: (s: KpiSummary) => number;
  changeLabel: string;
  /** For ad spend, positive is neutral not positive */
  neutralPositive?: boolean;
}

const kpiDefs: KpiCardDef[] = [
  {
    label: "Total 광고비",
    getValue: (s) => formatKrw(s.adSpend),
    getChange: (s) => s.adSpendChange,
    changeLabel: "전월 대비",
    neutralPositive: true,
  },
  {
    label: "Total 결제금액",
    getValue: (s) => formatKrw(s.revenue),
    getChange: (s) => s.revenueChange,
    changeLabel: "전월 대비",
  },
  {
    label: "평균 ROAS",
    getValue: (s) => formatPercent(s.roas),
    getChange: (s) => s.roasChange,
    changeLabel: "전월 대비 (pp)",
  },
  {
    label: "Total 회원가입",
    getValue: (s) => formatNumber(s.signups),
    getChange: (s) => s.signupsChange,
    changeLabel: "전월 대비",
  },
];

function ChangeBadge({
  change,
  neutralPositive,
}: {
  change: number;
  neutralPositive?: boolean;
}) {
  const isPositive = change >= 0;
  const Icon = isPositive ? IconTrendingUp : IconTrendingDown;
  const sign = isPositive ? "+" : "";
  const displayValue = `${sign}${change.toFixed(1)}%`;

  // Determine badge style
  const isGood = neutralPositive ? false : isPositive;
  const isBad = neutralPositive ? false : !isPositive;

  return (
    <Badge
      variant="outline"
      className={
        isBad
          ? "bg-[rgba(239,68,68,0.1)] text-[hsl(0,72%,51%)] border-[rgba(239,68,68,0.2)]"
          : isGood
            ? "bg-[rgba(16,185,129,0.1)] text-[hsl(160,60%,45%)] border-[rgba(16,185,129,0.2)]"
            : ""
      }
    >
      <Icon className="size-3" />
      {displayValue}
    </Badge>
  );
}

export function KpiCards({ summary, isLoading }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 *:data-[slot=card]:shadow-xs">
      {kpiDefs.map((def, i) => (
        <Card
          key={def.label}
          className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px] animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
          style={{
            animationDelay: `${i * 100}ms`,
          }}
        >
          <CardHeader>
            <CardDescription>{def.label}</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {def.getValue(summary)}
              </CardTitle>
            )}
            <CardAction>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <ChangeBadge
                  change={def.getChange(summary)}
                  neutralPositive={def.neutralPositive}
                />
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {isLoading ? (
                <Skeleton className="h-4 w-40" />
              ) : (
                <>
                  {def.changeLabel}
                  {def.getChange(summary) >= 0 ? (
                    <IconTrendingUp className="size-4 text-[hsl(160,60%,45%)]" />
                  ) : (
                    <IconTrendingDown className="size-4 text-[hsl(0,72%,51%)]" />
                  )}
                </>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
