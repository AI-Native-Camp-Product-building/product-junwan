import { type SampleDataRow } from "@/data/sample";

export type Insight = { id: string; text: string };

export function generateInsights(data: SampleDataRow[], currentMonth: string): Insight[] {
  const months = [...new Set(data.map((d) => d.month))].sort();
  const currentIdx = months.indexOf(currentMonth);
  const previousMonth = currentIdx > 0 ? months[currentIdx - 1] : null;
  const currentData = data.filter((d) => d.month === currentMonth);
  const previousData = previousMonth ? data.filter((d) => d.month === previousMonth) : [];
  const insights: Insight[] = [];

  const countryRoas = avgByCountry(currentData, "roas");
  const sorted = Object.entries(countryRoas).sort(([, a], [, b]) => b - a);
  if (sorted.length > 0) {
    insights.push({ id: "top-roas", text: `${sorted[0][0]} 지역 ROAS ${sorted[0][1].toFixed(1)}%로 전체 1위` });
  }

  if (previousData.length > 0) {
    const curCpa = avgByCountry(currentData, "signupCpa");
    const prevCpa = avgByCountry(previousData, "signupCpa");
    for (const [country, cur] of Object.entries(curCpa)) {
      const prev = prevCpa[country];
      if (!prev) continue;
      const change = ((cur - prev) / prev) * 100;
      if (change < -10) insights.push({ id: `cpa-improve-${country}`, text: `${country} 가입CPA ${Math.abs(change).toFixed(1)}% 개선 — 효율 상승` });
      else if (change > 10) insights.push({ id: `cpa-warn-${country}`, text: `${country} 가입CPA ${change.toFixed(1)}% 상승 — 매체 전략 점검 필요` });
    }
  }

  if (insights.length < 3) {
    const medSpend: Record<string, number> = {};
    for (const r of currentData) medSpend[r.medium] = (medSpend[r.medium] ?? 0) + r.adSpend;
    const top = Object.entries(medSpend).sort(([, a], [, b]) => b - a)[0];
    if (top) insights.push({ id: "top-medium", text: `${top[0]} 매체 광고비 집중 — 전체 지출의 주요 채널` });
  }

  return insights.slice(0, 5);
}

function avgByCountry(data: SampleDataRow[], key: keyof SampleDataRow): Record<string, number> {
  const acc: Record<string, { sum: number; count: number }> = {};
  for (const r of data) {
    if (!acc[r.country]) acc[r.country] = { sum: 0, count: 0 };
    acc[r.country].sum += r[key] as number;
    acc[r.country].count += 1;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v.sum / v.count]));
}
