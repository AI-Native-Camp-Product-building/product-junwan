"use client";

import * as React from "react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  getWeek,
  parseISO,
} from "date-fns";
import { IconChevronLeft, IconChevronRight, IconCalendar } from "@tabler/icons-react";
import type { DateMode, DateRange } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Monday-start week (Korean locale convention)
const WEEK_OPTS = { weekStartsOn: 1 } as const;

// ─── helpers ───────────────────────────────────────────────────────────────

function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function getWeekRange(date: Date): { startDate: string; endDate: string } {
  return {
    startDate: toISO(startOfWeek(date, WEEK_OPTS)),
    endDate: toISO(endOfWeek(date, WEEK_OPTS)),
  };
}

function getMonthRange(date: Date): { startDate: string; endDate: string } {
  return {
    startDate: toISO(startOfMonth(date)),
    endDate: toISO(endOfMonth(date)),
  };
}

/** "2026.03.24 ~ 03.30 (3월 4주차)" */
function formatWeekLabel(range: DateRange): string {
  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const month = format(start, "M");
  const weekNo = getWeek(start, WEEK_OPTS);

  // Week-of-month approximation
  const weekOfMonth = Math.ceil(start.getDate() / 7);
  const startStr = format(start, "yyyy.MM.dd");
  const endStr = format(end, "MM.dd");
  return `${startStr} ~ ${endStr} (${month}월 ${weekOfMonth}주차)`;
}

/** "2026년 3월" */
function formatMonthLabel(range: DateRange): string {
  const start = parseISO(range.startDate);
  return format(start, "yyyy년 M월");
}

// ─── sub-components ────────────────────────────────────────────────────────

interface NavArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  label: string;
  prevLabel: string;
  nextLabel: string;
}

function NavArrows({
  onPrev,
  onNext,
  canPrev,
  canNext,
  label,
  prevLabel,
  nextLabel,
}: NavArrowsProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.08] backdrop-blur-[12px] p-1"
      role="group"
      aria-label={label}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label={prevLabel}
      >
        <IconChevronLeft className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
        onClick={onNext}
        disabled={!canNext}
        aria-label={nextLabel}
      >
        <IconChevronRight className="size-4" />
      </Button>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────

export interface DateRangePickerProps {
  mode: DateMode;
  onModeChange: (mode: DateMode) => void;
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  /** Optional hint for the latest date with data — used instead of "today" when switching modes. */
  latestDataDate?: string;
}

const MODES: { key: DateMode; label: string }[] = [
  { key: "weekly", label: "주별" },
  { key: "monthly", label: "월별" },
  { key: "custom", label: "직접 설정" },
];

export function DateRangePicker({
  mode,
  onModeChange,
  value,
  onChange,
  latestDataDate,
}: DateRangePickerProps) {
  // Today as reference point
  const today = React.useMemo(() => new Date(), []);

  // Reference date for mode switching: use latest data date if provided, otherwise today
  const referenceDate = React.useMemo(
    () => (latestDataDate ? parseISO(latestDataDate) : today),
    [latestDataDate, today]
  );

  // Initialise a range when it's null — prefer referenceDate (latest data) over today
  const ensuredValue = React.useMemo((): DateRange => {
    if (value) return value;
    if (mode === "weekly") return getWeekRange(referenceDate);
    if (mode === "monthly") return getMonthRange(referenceDate);
    return { startDate: toISO(referenceDate), endDate: toISO(referenceDate) };
  }, [value, mode, referenceDate]);

  // ── weekly navigation ─────────────────────────────────────────────────
  const handleWeekPrev = React.useCallback(() => {
    const anchor = parseISO(ensuredValue.startDate);
    onChange(getWeekRange(subWeeks(anchor, 1)));
  }, [ensuredValue, onChange]);

  const handleWeekNext = React.useCallback(() => {
    const anchor = parseISO(ensuredValue.startDate);
    const next = addWeeks(anchor, 1);
    if (next <= today) onChange(getWeekRange(next));
  }, [ensuredValue, onChange, today]);

  const canWeekNext = React.useMemo(() => {
    const anchor = parseISO(ensuredValue.startDate);
    return addWeeks(anchor, 1) <= today;
  }, [ensuredValue, today]);

  // ── monthly navigation ────────────────────────────────────────────────
  const handleMonthPrev = React.useCallback(() => {
    const anchor = parseISO(ensuredValue.startDate);
    onChange(getMonthRange(subMonths(anchor, 1)));
  }, [ensuredValue, onChange]);

  const handleMonthNext = React.useCallback(() => {
    const anchor = parseISO(ensuredValue.startDate);
    const next = addMonths(anchor, 1);
    if (next <= today) onChange(getMonthRange(next));
  }, [ensuredValue, onChange, today]);

  const canMonthNext = React.useMemo(() => {
    const anchor = parseISO(ensuredValue.startDate);
    return addMonths(anchor, 1) <= today;
  }, [ensuredValue, today]);

  // ── custom: popover state ─────────────────────────────────────────────
  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);

  const handleModeChange = (newMode: DateMode) => {
    onModeChange(newMode);
    // Re-derive range for new mode — use referenceDate (latest data) instead of today
    if (newMode === "weekly") {
      onChange(getWeekRange(referenceDate));
    } else if (newMode === "monthly") {
      onChange(getMonthRange(referenceDate));
    }
    // custom: keep existing value or leave parent to set it
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Mode segment control */}
      <div
        className="inline-flex items-center rounded-lg bg-muted p-1 gap-0.5"
        role="tablist"
        aria-label="날짜 선택 모드"
      >
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => handleModeChange(key)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-all",
              mode === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode-specific picker */}
      {mode === "weekly" && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.08] backdrop-blur-[12px] px-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
              onClick={handleWeekPrev}
              aria-label="이전 주"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium text-white/90 whitespace-nowrap tabular-nums">
              {formatWeekLabel(ensuredValue)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
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
          <div className="inline-flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.08] backdrop-blur-[12px] px-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
              onClick={handleMonthPrev}
              aria-label="이전 달"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm font-medium text-white/90 whitespace-nowrap tabular-nums">
              {formatMonthLabel(ensuredValue)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
              onClick={handleMonthNext}
              disabled={!canMonthNext}
              aria-label="다음 달"
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Start date popover */}
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[140px] justify-start bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px] rounded-[10px] text-sm font-normal text-foreground/80 hover:bg-white/[0.06] hover:border-white/[0.12]"
                />
              }
            >
              <IconCalendar className="size-3.5 mr-1 opacity-60" />
              {value?.startDate
                ? format(parseISO(value.startDate), "yyyy.MM.dd")
                : "시작일"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover/95 backdrop-blur-lg border-white/[0.08]" align="start">
              <Calendar
                mode="single"
                selected={
                  value?.startDate ? parseISO(value.startDate) : undefined
                }
                onSelect={(day) => {
                  if (!day) return;
                  const startDate = toISO(day);
                  const endDate =
                    value?.endDate && value.endDate >= startDate
                      ? value.endDate
                      : startDate;
                  onChange({ startDate, endDate });
                  setStartOpen(false);
                }}
                disabled={{ after: today }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground text-sm">~</span>

          {/* End date popover */}
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[140px] justify-start bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px] rounded-[10px] text-sm font-normal text-foreground/80 hover:bg-white/[0.06] hover:border-white/[0.12]"
                />
              }
            >
              <IconCalendar className="size-3.5 mr-1 opacity-60" />
              {value?.endDate
                ? format(parseISO(value.endDate), "yyyy.MM.dd")
                : "종료일"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover/95 backdrop-blur-lg border-white/[0.08]" align="start">
              <Calendar
                mode="single"
                selected={
                  value?.endDate ? parseISO(value.endDate) : undefined
                }
                onSelect={(day) => {
                  if (!day) return;
                  const endDate = toISO(day);
                  const startDate =
                    value?.startDate && value.startDate <= endDate
                      ? value.startDate
                      : endDate;
                  onChange({ startDate, endDate });
                  setEndOpen(false);
                }}
                disabled={{
                  before: value?.startDate
                    ? parseISO(value.startDate)
                    : undefined,
                  after: today,
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
