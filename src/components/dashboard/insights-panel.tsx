"use client";

import * as React from "react";
import type { AdRow, Insight } from "@/types/dashboard";
import { generateDashboardInsights } from "@/lib/dashboard-insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SEVERITY_STYLES: Record<Insight["severity"], { badge: string; border: string; icon: string }> = {
  positive: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", border: "border-emerald-500/20", icon: "\u2191" },
  warning: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/20", border: "border-amber-500/20", icon: "\u26A0" },
  danger: { badge: "bg-red-500/15 text-red-400 border-red-500/20", border: "border-red-500/20", icon: "\u2193" },
};

const TYPE_LABELS: Record<Insight["type"], string> = { change: "\uBCC0\uD654", anomaly: "\uC774\uC0C1 \uAC10\uC9C0" };

interface InsightsPanelProps {
  currentData: AdRow[];
  previousData: AdRow[];
  isLoading?: boolean;
}

export function InsightsPanel({ currentData, previousData, isLoading }: InsightsPanelProps) {
  const insights = React.useMemo(
    () => generateDashboardInsights(currentData, previousData),
    [currentData, previousData],
  );

  if (isLoading) {
    return (
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base">AI Insights</CardTitle>
          <CardDescription>데이터 분석 중...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-white/[0.04]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base">AI Insights</CardTitle>
          <CardDescription>비교 기간 데이터가 부족하여 인사이트를 생성할 수 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-white/[0.08] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-base">AI Insights</CardTitle>
        <CardDescription>전기대비 주요 변화 및 이상 감지 ({insights.length}건)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {insights.map((insight, idx) => {
            const style = SEVERITY_STYLES[insight.severity];
            return (
              <div key={`${insight.metric}-${insight.country}-${idx}`} className={`flex items-start gap-3 rounded-lg border p-3 bg-white/[0.02] ${style.border}`}>
                <span className="mt-0.5 text-lg leading-none">{style.icon}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{insight.title}</span>
                    <Badge variant="outline" className={`text-xs ${style.badge}`}>{TYPE_LABELS[insight.type]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
