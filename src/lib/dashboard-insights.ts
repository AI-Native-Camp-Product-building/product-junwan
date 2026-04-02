// =============================================================================
// Dashboard Insights — AdInsight
// Generates structured Insight[] by comparing current and previous period AdRow[].
// =============================================================================

import type { AdRow, Insight } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatKrw(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_0000_0000) return `₩${(value / 1_0000_0000).toFixed(1)}억`;
  if (abs >= 1_0000) return `₩${(value / 1_0000).toFixed(0)}만`;
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

// ---------------------------------------------------------------------------
// Metric config
// ---------------------------------------------------------------------------

type MetricKey = "adSpend" | "revenue" | "roas" | "signups" | "conversions" | "signupCpa";

interface MetricConfig {
  label: string;
  invertedSeverity: boolean; // true = lower is better (signupCpa)
  format: (value: number) => string;
}

const METRIC_CONFIG: Record<MetricKey, MetricConfig> = {
  adSpend:     { label: "광고비",    invertedSeverity: false, format: formatKrw },
  revenue:     { label: "결제금액",  invertedSeverity: false, format: formatKrw },
  roas:        { label: "ROAS",      invertedSeverity: false, format: (v) => `${v.toFixed(1)}%` },
  signups:     { label: "회원가입",  invertedSeverity: false, format: formatNumber },
  conversions: { label: "결제전환",  invertedSeverity: false, format: formatNumber },
  signupCpa:   { label: "가입CPA",   invertedSeverity: true,  format: formatKrw },
};

// ---------------------------------------------------------------------------
// Aggregate helpers
// ---------------------------------------------------------------------------

interface CountryAggregate {
  country: string;
  adSpend: number;
  revenue: number;
  signups: number;
  conversions: number;
  signupCpa: number;
  roas: number;
}

function aggregateByCountry(rows: AdRow[]): Map<string, CountryAggregate> {
  const map = new Map<string, CountryAggregate>();

  for (const row of rows) {
    const existing = map.get(row.country);
    if (existing) {
      existing.adSpend     += row.adSpend;
      existing.revenue     += row.revenue;
      existing.signups     += row.signups;
      existing.conversions += row.conversions;
    } else {
      map.set(row.country, {
        country:     row.country,
        adSpend:     row.adSpend,
        revenue:     row.revenue,
        signups:     row.signups,
        conversions: row.conversions,
        signupCpa:   0, // computed after loop
        roas:        0, // computed after loop
      });
    }
  }

  // Compute derived metrics
  for (const agg of map.values()) {
    agg.signupCpa = agg.signups > 0 ? agg.adSpend / agg.signups : 0;
    agg.roas      = agg.adSpend > 0 ? (agg.revenue / agg.adSpend) * 100 : 0;
  }

  return map;
}

// ---------------------------------------------------------------------------
// Change percent
// ---------------------------------------------------------------------------

function changePercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateDashboardInsights(
  currentData: AdRow[],
  previousData: AdRow[],
): Insight[] {
  const currentAggs  = aggregateByCountry(currentData);
  const previousAggs = aggregateByCountry(previousData);

  const anomalies: Insight[] = [];
  const changes: Array<{ insight: Insight; absChange: number }> = [];

  const METRICS: MetricKey[] = ["adSpend", "revenue", "roas", "signups", "conversions"];

  for (const [country, curr] of currentAggs) {
    const prev = previousAggs.get(country);
    if (!prev) continue;

    // ------------------------------------------------------------------
    // Step 2: Top 3 changes (over non-signupCpa metrics)
    // ------------------------------------------------------------------
    for (const metric of METRICS) {
      const currVal = curr[metric];
      const prevVal = prev[metric];
      const pct     = changePercent(currVal, prevVal);
      const absPct  = Math.abs(pct);

      if (absPct < 5) continue;

      const cfg = METRIC_CONFIG[metric];

      // Severity: invertedSeverity flips positive/warning
      let severity: Insight["severity"];
      if (cfg.invertedSeverity) {
        severity = pct < 0 ? "positive" : "warning";
      } else {
        severity = pct > 0 ? "positive" : "warning";
      }

      const diff    = currVal - prevVal;
      const diffFmt = cfg.format(Math.abs(diff));
      const sign    = diff >= 0 ? "+" : "-";

      const insight: Insight = {
        type:          "change",
        severity,
        title:         `${country} ${cfg.label} ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`,
        description:   `전기대비 ${sign}${diffFmt} ${pct >= 0 ? "증가" : "감소"}`,
        metric,
        country,
        value:         currVal,
        changePercent: pct,
      };

      changes.push({ insight, absChange: absPct });
    }

    // ------------------------------------------------------------------
    // Step 3: Anomaly alerts
    // ------------------------------------------------------------------

    // signupCpa increase
    const signupCpaPct = changePercent(curr.signupCpa, prev.signupCpa);
    if (signupCpaPct >= 30) {
      const severity: Insight["severity"] = signupCpaPct >= 60 ? "danger" : "warning";
      anomalies.push({
        type:          "anomaly",
        severity,
        title:         `${country} 가입CPA 급등 +${signupCpaPct.toFixed(0)}%`,
        description:   `전기대비 ${formatKrw(Math.abs(curr.signupCpa - prev.signupCpa))} 상승 — 효율 저하 주의`,
        metric:        "signupCpa",
        country,
        value:         curr.signupCpa,
        changePercent: signupCpaPct,
      });
    }

    // roas decrease
    const roasPct = changePercent(curr.roas, prev.roas);
    if (roasPct <= -30) {
      const severity: Insight["severity"] = roasPct <= -50 ? "danger" : "warning";
      anomalies.push({
        type:          "anomaly",
        severity,
        title:         `${country} ROAS 급락 ${roasPct.toFixed(0)}%`,
        description:   `전기대비 ${Math.abs(roasPct).toFixed(1)}%p 하락 — ROAS 점검 필요`,
        metric:        "roas",
        country,
        value:         curr.roas,
        changePercent: roasPct,
      });
    }

    // signups decrease
    const signupsPct = changePercent(curr.signups, prev.signups);
    if (signupsPct <= -50) {
      const severity: Insight["severity"] = signupsPct <= -70 ? "danger" : "warning";
      anomalies.push({
        type:          "anomaly",
        severity,
        title:         `${country} 회원가입 급감 ${signupsPct.toFixed(0)}%`,
        description:   `전기대비 ${formatNumber(Math.abs(curr.signups - prev.signups))}명 감소`,
        metric:        "signups",
        country,
        value:         curr.signups,
        changePercent: signupsPct,
      });
    }
  }

  // ------------------------------------------------------------------
  // Step 2 cont: Sort changes, take top 3
  // ------------------------------------------------------------------
  const top3Changes = changes
    .sort((a, b) => b.absChange - a.absChange)
    .slice(0, 3)
    .map((c) => c.insight);

  // ------------------------------------------------------------------
  // Step 4: Merge — anomalies first, then top changes; deduplicate; max 5
  // ------------------------------------------------------------------
  const seen    = new Set<string>();
  const results: Insight[] = [];

  for (const insight of [...anomalies, ...top3Changes]) {
    const key = `${insight.country ?? ""}:${insight.metric}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(insight);
    if (results.length >= 5) break;
  }

  return results;
}
