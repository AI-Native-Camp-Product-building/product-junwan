"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

import type { DateMode, DateRange } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function resolveReferenceDate(latestDataDate?: string): Date {
  return latestDataDate ? parseISO(latestDataDate) : new Date();
}

function getDayRange(date: Date): DateRange {
  const iso = toIso(date);
  return { startDate: iso, endDate: iso };
}

function getWeekRange(date: Date): DateRange {
  return {
    startDate: toIso(startOfWeek(date, WEEK_OPTIONS)),
    endDate: toIso(endOfWeek(date, WEEK_OPTIONS)),
  };
}

function getMonthRange(date: Date): DateRange {
  return {
    startDate: toIso(startOfMonth(date)),
    endDate: toIso(endOfMonth(date)),
  };
}

// KEYWORD: dashboard-date-mode-defaults
export function getDefaultDateRangeForMode(
  mode: DateMode,
  latestDataDate?: string,
): DateRange {
  const referenceDate = resolveReferenceDate(latestDataDate);

  if (mode === "daily") {
    return getDayRange(referenceDate);
  }

  if (mode === "weekly") {
    return getWeekRange(referenceDate);
  }

  if (mode === "monthly") {
    return getMonthRange(referenceDate);
  }

  return {
    startDate: toIso(referenceDate),
    endDate: toIso(referenceDate),
  };
}

function getAnchorDate(value: DateRange | null, latestDataDate?: string): Date {
  if (value?.startDate) {
    return parseISO(value.startDate);
  }

  return resolveReferenceDate(latestDataDate);
}

function formatWeekLabel(range: DateRange): string {
  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const weekOfMonth = Math.ceil(start.getDate() / 7);

  return `${format(start, "yyyy.MM.dd")} ~ ${format(end, "MM.dd")} (${format(
    start,
    "M",
  )}월 ${weekOfMonth}주차)`;
}

function formatMonthLabel(range: DateRange): string {
  return format(parseISO(range.startDate), "yyyy년 M월");
}

interface DateRangePickerRefinedProps {
  mode: DateMode;
  onModeChange: (mode: DateMode) => void;
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  latestDataDate?: string;
}

const MODES: Array<{ key: DateMode; label: string }> = [
  { key: "weekly", label: "주별" },
  { key: "monthly", label: "월별" },
  { key: "custom", label: "직접설정" },
];

export function DateRangePickerRefined({
  mode,
  onModeChange,
  value,
  onChange,
  latestDataDate,
}: DateRangePickerRefinedProps) {
  const maxSelectableDate = React.useMemo(
    () => resolveReferenceDate(latestDataDate),
    [latestDataDate],
  );

  const ensuredValue = React.useMemo(() => {
    return value ?? getDefaultDateRangeForMode(mode, latestDataDate);
  }, [latestDataDate, mode, value]);

  // KEYWORD: dashboard-date-mode-navigation
  const handleDayPrev = React.useCallback(() => {
    onChange(getDayRange(subDays(parseISO(ensuredValue.startDate), 1)));
  }, [ensuredValue.startDate, onChange]);

  const handleDayNext = React.useCallback(() => {
    const nextDay = addDays(parseISO(ensuredValue.startDate), 1);
    if (nextDay <= maxSelectableDate) {
      onChange(getDayRange(nextDay));
    }
  }, [ensuredValue.startDate, maxSelectableDate, onChange]);

  const canDayNext = React.useMemo(() => {
    return addDays(parseISO(ensuredValue.startDate), 1) <= maxSelectableDate;
  }, [ensuredValue.startDate, maxSelectableDate]);

  const handleWeekPrev = React.useCallback(() => {
    onChange(getWeekRange(subWeeks(parseISO(ensuredValue.startDate), 1)));
  }, [ensuredValue.startDate, onChange]);

  const handleWeekNext = React.useCallback(() => {
    const nextStart = addWeeks(parseISO(ensuredValue.startDate), 1);
    if (nextStart <= maxSelectableDate) {
      onChange(getWeekRange(nextStart));
    }
  }, [ensuredValue.startDate, maxSelectableDate, onChange]);

  const canWeekNext = React.useMemo(() => {
    return addWeeks(parseISO(ensuredValue.startDate), 1) <= maxSelectableDate;
  }, [ensuredValue.startDate, maxSelectableDate]);

  const handleMonthPrev = React.useCallback(() => {
    onChange(getMonthRange(subMonths(parseISO(ensuredValue.startDate), 1)));
  }, [ensuredValue.startDate, onChange]);

  const handleMonthNext = React.useCallback(() => {
    const nextStart = addMonths(parseISO(ensuredValue.startDate), 1);
    if (nextStart <= maxSelectableDate) {
      onChange(getMonthRange(nextStart));
    }
  }, [ensuredValue.startDate, maxSelectableDate, onChange]);

  const canMonthNext = React.useMemo(() => {
    return addMonths(parseISO(ensuredValue.startDate), 1) <= maxSelectableDate;
  }, [ensuredValue.startDate, maxSelectableDate]);

  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);

  const handleModeSelect = React.useCallback(
    (nextMode: DateMode) => {
      const anchorDate = getAnchorDate(value, latestDataDate);

      onModeChange(nextMode);

      // KEYWORD: dashboard-date-mode-preserve-range
      if (nextMode === "custom") {
        onChange(
          value ??
            getDefaultDateRangeForMode(
              mode,
              format(anchorDate, "yyyy-MM-dd"),
            ),
        );
        return;
      }

      onChange(
        getDefaultDateRangeForMode(
          nextMode,
          format(anchorDate, "yyyy-MM-dd"),
        ),
      );
    },
    [latestDataDate, mode, onChange, onModeChange, value],
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1"
        role="tablist"
        aria-label="날짜 선택 모드"
      >
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => handleModeSelect(key)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-all",
              mode === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "daily" && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-1 py-1 backdrop-blur-[12px]">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              onClick={handleDayPrev}
              aria-label="이전 일"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium whitespace-nowrap text-white/90 tabular-nums">
              {format(parseISO(ensuredValue.startDate), "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              onClick={handleDayNext}
              disabled={!canDayNext}
              aria-label="다음 일"
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {mode === "weekly" && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-1 py-1 backdrop-blur-[12px]">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              onClick={handleWeekPrev}
              aria-label="이전 주"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium whitespace-nowrap text-white/90 tabular-nums">
              {formatWeekLabel(ensuredValue)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              onClick={handleWeekNext}
              disabled={!canWeekNext}
              aria-label="다음 주"
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {mode === "monthly" && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-1 py-1 backdrop-blur-[12px]">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              onClick={handleMonthPrev}
              aria-label="이전 월"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium whitespace-nowrap text-white/90 tabular-nums">
              {formatMonthLabel(ensuredValue)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              onClick={handleMonthNext}
              disabled={!canMonthNext}
              aria-label="다음 월"
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[150px] justify-start rounded-[10px] border-white/[0.08] bg-white/[0.03] text-sm font-normal text-foreground/80 backdrop-blur-[12px] hover:border-white/[0.12] hover:bg-white/[0.06]"
                />
              }
            >
              <IconCalendar className="mr-1 size-3.5 opacity-60" />
              {format(parseISO(ensuredValue.startDate), "yyyy.MM.dd")}
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg"
              align="start"
            >
              <Calendar
                mode="single"
                selected={parseISO(ensuredValue.startDate)}
                onSelect={(day) => {
                  if (!day) return;
                  const startDate = toIso(day);
                  const endDate =
                    ensuredValue.endDate >= startDate
                      ? ensuredValue.endDate
                      : startDate;
                  onChange({ startDate, endDate });
                  setStartOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm text-muted-foreground">~</span>

          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[150px] justify-start rounded-[10px] border-white/[0.08] bg-white/[0.03] text-sm font-normal text-foreground/80 backdrop-blur-[12px] hover:border-white/[0.12] hover:bg-white/[0.06]"
                />
              }
            >
              <IconCalendar className="mr-1 size-3.5 opacity-60" />
              {format(parseISO(ensuredValue.endDate), "yyyy.MM.dd")}
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg"
              align="start"
            >
              <Calendar
                mode="single"
                selected={parseISO(ensuredValue.endDate)}
                onSelect={(day) => {
                  if (!day) return;
                  const endDate = toIso(day);
                  const startDate =
                    ensuredValue.startDate <= endDate
                      ? ensuredValue.startDate
                      : endDate;
                  onChange({ startDate, endDate });
                  setEndOpen(false);
                }}
                disabled={{
                  before: parseISO(ensuredValue.startDate),
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
