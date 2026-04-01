"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type SampleDataRow } from "@/data/sample";
import { countries } from "@/config/countries";
import { dashboardConfig } from "@/config/dashboard";
import { metrics } from "@/config/metrics";
import { formatNumber, formatPercentage } from "@/lib/format";

type DataTableProps = { data: SampleDataRow[] };

function aggregateByCountry(data: SampleDataRow[]) {
  const grouped: Record<string, Record<string, number> & { _count: number }> = {};
  for (const row of data) {
    if (!grouped[row.country]) grouped[row.country] = { _count: 0 } as Record<string, number> & { _count: number };
    for (const col of dashboardConfig.table.columns) {
      grouped[row.country][col] = (grouped[row.country][col] ?? 0) + (row[col as keyof SampleDataRow] as number);
    }
    grouped[row.country]._count += 1;
  }
  for (const values of Object.values(grouped)) {
    for (const col of dashboardConfig.table.columns) {
      const metric = metrics.find((m) => m.key === col);
      if (metric?.format === "percentage") values[col] = values[col] / values._count;
    }
  }
  return grouped;
}

function formatValue(value: number, metricKey: string): string {
  const metric = metrics.find((m) => m.key === metricKey);
  if (!metric) return String(value);
  switch (metric.format) {
    case "currency": return `₩${formatNumber(Math.round(value))}`;
    case "percentage": return formatPercentage(value);
    case "number": return formatNumber(value);
  }
}

export function DataTable({ data }: DataTableProps) {
  const agg = aggregateByCountry(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle>상세 데이터</CardTitle>
        <CardDescription>국가별 핵심 지표 요약</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>국가</TableHead>
              {dashboardConfig.table.columns.map((col) => {
                const m = metrics.find((mt) => mt.key === col);
                return <TableHead key={col} className="text-right">{m?.label ?? col}</TableHead>;
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.map((c) => {
              const vals = agg[c.code];
              if (!vals) return null;
              return (
                <TableRow key={c.code}>
                  <TableCell className="font-medium">{c.code}</TableCell>
                  {dashboardConfig.table.columns.map((col) => (
                    <TableCell key={col} className="text-right text-muted-foreground">{formatValue(vals[col] ?? 0, col)}</TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
