"use client";

import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type SampleDataRow } from "@/data/sample";
import { dashboardConfig } from "@/config/dashboard";
import { metrics } from "@/config/metrics";
import { formatNumber, formatPercentage, formatChangeRate } from "@/lib/format";

type KpiCardsProps = { currentData: SampleDataRow[]; previousData: SampleDataRow[] };

function computeKpi(data: SampleDataRow[], metricKey: string): number {
  if (data.length === 0) return 0;
  const values = data.map((d) => d[metricKey as keyof SampleDataRow] as number);
  const metric = metrics.find((m) => m.key === metricKey);
  if (metric?.format === "percentage") return values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + b, 0);
}

function formatKpiValue(value: number, metricKey: string): string {
  const metric = metrics.find((m) => m.key === metricKey);
  if (!metric) return String(value);
  switch (metric.format) {
    case "currency": return `₩${(value / 100000000).toFixed(1)}억`;
    case "percentage": return formatPercentage(value);
    case "number": return formatNumber(value);
  }
}

export function KpiCards({ currentData, previousData }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {dashboardConfig.kpiCards.map((key) => {
        const metric = metrics.find((m) => m.key === key);
        if (!metric) return null;
        const current = computeKpi(currentData, key);
        const previous = computeKpi(previousData, key);
        const change = formatChangeRate(current, previous);
        return (
          <Card key={key}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl font-bold">{formatKpiValue(current, key)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{change}</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
