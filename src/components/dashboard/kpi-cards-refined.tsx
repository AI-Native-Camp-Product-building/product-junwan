"use client";

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import type { KpiSummary } from "@/types/dashboard";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";
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

interface KpiCardsRefinedProps {
  summary: KpiSummary;
  isLoading: boolean;
}

interface KpiCardDefinition {
  label: string;
  getValue: (summary: KpiSummary) => string;
  getChange: (summary: KpiSummary) => number;
  changeLabel: string;
  neutralPositive?: boolean;
}

// KEYWORD: dashboard-kpi-card-layout
const KPI_CARD_DEFINITIONS: KpiCardDefinition[] = [
  {
    label: "총 광고비",
    getValue: (summary) => formatKrw(summary.adSpend),
    getChange: (summary) => summary.adSpendChange,
    changeLabel: "전월 대비",
    neutralPositive: true,
  },
  {
    label: "총 회원가입",
    getValue: (summary) => formatNumber(summary.signups),
    getChange: (summary) => summary.signupsChange,
    changeLabel: "전월 대비",
  },
  {
    label: "총 결제전환",
    getValue: (summary) => formatNumber(summary.conversions),
    getChange: (summary) => summary.conversionsChange,
    changeLabel: "전월 대비",
  },
  {
    label: "총 결제금액",
    getValue: (summary) => formatKrw(summary.revenue),
    getChange: (summary) => summary.revenueChange,
    changeLabel: "전월 대비",
  },
  {
    label: "평균 ROAS",
    getValue: (summary) => formatPercent(summary.roas),
    getChange: (summary) => summary.roasChange,
    changeLabel: "전월 대비 (pp)",
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

  const isGood = neutralPositive ? false : isPositive;
  const isBad = neutralPositive ? false : !isPositive;

  return (
    <Badge
      variant="outline"
      className={
        isBad
          ? "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] text-[hsl(0,72%,51%)]"
          : isGood
            ? "border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.1)] text-[hsl(160,60%,45%)]"
            : ""
      }
    >
      <Icon className="size-3" />
      {displayValue}
    </Badge>
  );
}

export function KpiCardsRefined({
  summary,
  isLoading,
}: KpiCardsRefinedProps) {
  const isEmpty =
    summary.adSpend === 0 &&
    summary.revenue === 0 &&
    summary.signups === 0 &&
    summary.conversions === 0;

  if (isEmpty && !isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 lg:px-6">
        {KPI_CARD_DEFINITIONS.map((definition) => (
          <Card
            key={definition.label}
            className="@container/card border-white/[0.08] bg-white/[0.03] backdrop-blur-[12px]"
          >
            <CardHeader>
              <CardDescription>{definition.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold text-muted-foreground">
                --
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              데이터 없음
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 lg:px-6 *:data-[slot=card]:shadow-xs">
      {KPI_CARD_DEFINITIONS.map((definition, index) => (
        <Card
          key={definition.label}
          className="@container/card animate-in slide-in-from-bottom-2 fade-in border-white/[0.08] bg-white/[0.03] backdrop-blur-[12px] duration-500 fill-mode-both"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <CardHeader>
            <CardDescription>{definition.label}</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {definition.getValue(summary)}
              </CardTitle>
            )}
            <CardAction>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <ChangeBadge
                  change={definition.getChange(summary)}
                  neutralPositive={definition.neutralPositive}
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
                  {definition.changeLabel}
                  {definition.getChange(summary) >= 0 ? (
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
