"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type Insight } from "@/lib/insights";

type InsightsCardProps = { insights: Insight[] };

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 인사이트</CardTitle>
        <CardDescription>데이터 기반 자동 분석</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-sm text-muted-foreground">
          {insights.length > 0 ? insights.map((i) => <p key={i.id}>• {i.text}</p>) : <p>선택한 조건에 해당하는 인사이트가 없습니다.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
