"use client";

import * as React from "react";
import { QueryViewTabs, type ViewKey } from "./query-view-tabs";
import { WeekPicker } from "./week-picker";
import { QueryViewTable } from "./query-view-table";
import {
  fetchWeeklyByLocale,
  fetchWeeklyByMedium,
  fetchWeeklyByGoal,
  fetchMonthlyByLocale,
  fetchCreativeRoasRanking,
  fetchCreativeCpaRanking,
  fetchWeeklyMaster,
  fetchAvailableMonths,
} from "@/lib/query-views";

type WeekValue = { start: string; end: string } | null;

/** Views that use the weekly period picker. */
const WEEKLY_VIEWS = new Set<ViewKey>([
  "주간_로케일별",
  "주간_매체별",
  "주간_목표별",
  "작품별_효율",
  "원본_마스터",
]);

export function QueryViewShell() {
  const [activeView, setActiveView] = React.useState<string>("주간_로케일별");
  const [week, setWeek] = React.useState<WeekValue>(null);
  const [data, setData] = React.useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const isWeekly = WEEKLY_VIEWS.has(activeView as ViewKey);

  // Fetch data whenever view or period changes
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      // Weekly views need a selected week
      if (isWeekly && !week) return;

      setIsLoading(true);
      try {
        let result: Record<string, unknown>[] = [];

        switch (activeView as ViewKey) {
          case "주간_로케일별":
            result = (await fetchWeeklyByLocale(week!.start, week!.end)) as unknown as Record<string, unknown>[];
            break;
          case "주간_매체별":
            result = (await fetchWeeklyByMedium(week!.start, week!.end)) as unknown as Record<string, unknown>[];
            break;
          case "주간_목표별":
            result = (await fetchWeeklyByGoal(week!.start, week!.end)) as unknown as Record<string, unknown>[];
            break;
          case "월간_로케일별": {
            // Get the most recent available month
            const months = await fetchAvailableMonths();
            if (months.length > 0) {
              const sorted = [...months].sort((a, b) =>
                b.month_value.localeCompare(a.month_value),
              );
              result = (await fetchMonthlyByLocale(sorted[0].month_value)) as unknown as Record<string, unknown>[];
            }
            break;
          }
          case "작품별_효율": {
            // Fetch both ROAS ranking and CPA ranking, merge with a section marker
            const [roasRows, cpaRows] = await Promise.all([
              fetchCreativeRoasRanking(week!.start, week!.end),
              fetchCreativeCpaRanking(week!.start, week!.end),
            ]);
            // Combine: ROAS rows first, then CPA rows with fallback fields
            const combined = [
              ...roasRows.map((r) => ({ ...r, signups: null, signup_cpa: null })),
              ...cpaRows.map((r) => ({
                ...r,
                revenue_krw: null,
                roas: null,
                conversions: null,
              })),
            ] as unknown as Record<string, unknown>[];
            result = combined;
            break;
          }
          case "원본_마스터":
            result = (await fetchWeeklyMaster(week!.start, week!.end)) as unknown as Record<string, unknown>[];
            break;
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        console.error("QueryViewShell fetch error:", err);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeView, week, isWeekly]);

  return (
    <section className="flex flex-col gap-4 px-4 lg:px-6 pb-6" aria-label="쿼리 뷰">
      {/* Header row: Tabs + Period picker */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <QueryViewTabs activeView={activeView} onViewChange={setActiveView} />
        {isWeekly && <WeekPicker value={week} onChange={setWeek} />}
      </div>

      {/* Table */}
      <QueryViewTable data={data} viewType={activeView} isLoading={isLoading} />
    </section>
  );
}
