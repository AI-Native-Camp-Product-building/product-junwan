"use client";

import * as React from "react";
import { IconPlayerPlay, IconDownload, IconSparkles, IconHandFinger } from "@tabler/icons-react";
import { useExploreQuery } from "@/hooks/use-query";
import { isCompareResult } from "@/types/query";
import type { QueryDefinition, CompareQueryResult } from "@/types/query";
import { QuerySentence } from "@/components/explore/query-sentence";
import { ComparePanel } from "@/components/explore/compare-panel";
import { AiQueryInput } from "@/components/explore/ai-query-input";
import { QueryResultTable, CompareResultTable } from "@/components/explore/query-result-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QueryMode = "manual" | "ai";

export default function ExplorePage() {
  const q = useExploreQuery();
  const [mode, setMode] = React.useState<QueryMode>("manual");

  const [pendingAutoExecute, setPendingAutoExecute] = React.useState(false);

  const handleAiQuery = React.useCallback(
    (query: QueryDefinition) => {
      // AI가 생성한 쿼리를 수동 모드 필드에 세팅
      q.setMetrics(query.metrics);
      q.setDimensions(query.dimensions);
      q.setFilters(query.filters);
      q.setDateRange(query.dateRange);
      q.setSort(query.sort);

      if (query.compare) {
        q.setCompareEnabled(true);
        q.setCompare(query.compare);
      } else {
        q.setCompareEnabled(false);
        q.setCompare(undefined);
      }

      // 수동 모드로 전환 + 자동 실행 예약
      setMode("manual");
      setPendingAutoExecute(true);
    },
    [q],
  );

  // 상태 반영 후 자동 실행
  React.useEffect(() => {
    if (pendingAutoExecute && q.metrics.length > 0) {
      setPendingAutoExecute(false);
      q.execute();
    }
  }, [pendingAutoExecute, q.metrics, q.execute]);

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">탐색</h1>

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
              mode === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IconHandFinger className="size-3.5" />
            직접 선택
          </button>
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
              mode === "ai"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IconSparkles className="size-3.5" />
            AI 모드
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {/* AI mode */}
        {mode === "ai" && (
          <AiQueryInput onQueryGenerated={handleAiQuery} />
        )}

        {/* Manual query builder (always visible — AI fills it in) */}
        <QuerySentence
          metrics={q.metrics}
          dimensions={q.dimensions}
          filters={q.filters}
          dateRange={q.dateRange}
          filterValueOptions={q.filterValueOptions}
          onMetricsChange={q.setMetrics}
          onDimensionsChange={q.setDimensions}
          onFiltersChange={q.setFilters}
          onDateRangeChange={q.setDateRange}
        />

        {/* Compare Panel */}
        <ComparePanel
          enabled={q.compareEnabled}
          onEnabledChange={q.setCompareEnabled}
          config={q.compare}
          onConfigChange={q.setCompare}
          baseDateRange={q.dateRange}
          filterValueOptions={q.filterValueOptions}
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            onClick={q.execute}
            disabled={q.isLoading || q.metrics.length === 0}
            className="gap-1.5"
          >
            <IconPlayerPlay className="size-4" />
            {q.isLoading ? "실행 중..." : "실행"}
          </Button>

          {q.result && !isCompareResult(q.result) && q.result.rows.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              const rows = (q.result as { rows: Record<string, unknown>[] }).rows;
              if (rows.length === 0) return;
              const keys = Object.keys(rows[0]);
              const csv = [
                keys.join(","),
                ...rows.map((row) => keys.map((k) => JSON.stringify(row[k] ?? "")).join(",")),
              ].join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `explore-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              <IconDownload className="size-4" />
              CSV
            </Button>
          )}
        </div>

        {/* Error */}
        {q.error && (
          <div className="rounded-lg border border-[hsl(0,72%,51%)/0.3] bg-[hsl(0,72%,51%)/0.05] px-4 py-3 text-sm text-[hsl(0,72%,51%)]">
            {q.error}
          </div>
        )}

        {/* Results */}
        {q.result && !isCompareResult(q.result) && (
          <QueryResultTable
            rows={q.result.rows}
            dimensions={q.dimensions}
            metrics={q.metrics}
            isLoading={q.isLoading}
            defaultSort={q.sort}
            onDimensionsChange={(dims) => {
              q.setDimensions(dims as typeof q.dimensions);
              setPendingAutoExecute(true);
            }}
          />
        )}

        {q.result && isCompareResult(q.result) && (
          <CompareResultTable
            result={q.result as CompareQueryResult}
            dimensions={q.dimensions}
            metrics={q.metrics}
            isLoading={q.isLoading}
            baseLabel={
              q.compare?.type === "period"
                ? `${q.compare.baseRange.start.slice(5, 7)}월`
                : q.compare?.type === "item"
                  ? q.compare.baseValue
                  : "기준"
            }
            compareLabel={
              q.compare?.type === "period"
                ? `${q.compare.compareRange.start.slice(5, 7)}월`
                : q.compare?.type === "item"
                  ? q.compare.compareValue
                  : "비교"
            }
          />
        )}
      </div>
    </div>
  );
}
