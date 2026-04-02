"use client";

import * as React from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAvailableWeeks, type AvailableWeek } from "@/lib/query-views";

interface WeekPickerProps {
  value: { start: string; end: string } | null;
  onChange: (week: { start: string; end: string }) => void;
}

/** Format week as "4월 1주차 (04.01~04.07)" — month-relative week number. */
function formatWeekLabel(week: AvailableWeek): string {
  const start = new Date(week.week_start);
  const month = start.getMonth() + 1;
  const weekOfMonth = Math.ceil(start.getDate() / 7);

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };

  return `${month}월 ${weekOfMonth}주차 (${fmtDate(week.week_start)}~${fmtDate(week.week_end)})`;
}

export function WeekPicker({ value, onChange }: WeekPickerProps) {
  const [weeks, setWeeks] = React.useState<AvailableWeek[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Index of the currently selected week
  const currentIndex = React.useMemo(() => {
    if (!value || weeks.length === 0) return -1;
    return weeks.findIndex(
      (w) => w.week_start === value.start && w.week_end === value.end,
    );
  }, [value, weeks]);

  // Fetch available weeks on mount
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchAvailableWeeks();
        if (cancelled) return;
        // Sort descending so index 0 = most recent
        const sorted = [...data].sort(
          (a, b) => b.week_start.localeCompare(a.week_start),
        );
        setWeeks(sorted);

        // Auto-select the most recent week if no value is set
        if (sorted.length > 0 && !value) {
          onChange({ start: sorted[0].week_start, end: sorted[0].week_end });
        }
      } catch {
        // Silently fail — table will show empty state
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canGoPrev = currentIndex < weeks.length - 1;
  const canGoNext = currentIndex > 0;

  const goPrev = React.useCallback(() => {
    if (canGoPrev) {
      const w = weeks[currentIndex + 1];
      onChange({ start: w.week_start, end: w.week_end });
    }
  }, [canGoPrev, currentIndex, weeks, onChange]);

  const goNext = React.useCallback(() => {
    if (canGoNext) {
      const w = weeks[currentIndex - 1];
      onChange({ start: w.week_start, end: w.week_end });
    }
  }, [canGoNext, currentIndex, weeks, onChange]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        사용 가능한 주차 데이터가 없습니다.
      </div>
    );
  }

  const currentWeek = currentIndex >= 0 ? weeks[currentIndex] : null;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.08] backdrop-blur-[12px] p-1"
      aria-label="주차 선택"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
        onClick={goPrev}
        disabled={!canGoPrev}
        aria-label="이전 주차"
      >
        <IconChevronLeft className="size-4" />
      </Button>

      <span className="px-2 text-sm font-medium text-white/90 whitespace-nowrap tabular-nums">
        {currentWeek ? formatWeekLabel(currentWeek) : "선택 없음"}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
        onClick={goNext}
        disabled={!canGoNext}
        aria-label="다음 주차"
      >
        <IconChevronRight className="size-4" />
      </Button>
    </div>
  );
}
