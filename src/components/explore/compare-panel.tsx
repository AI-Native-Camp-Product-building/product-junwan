"use client";

import * as React from "react";
import { IconCalendar } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { DIMENSIONS } from "@/config/query-schema";
import type { CompareConfig, DimensionKey, DateRange } from "@/types/query";
import { InlineValueSelector } from "./inline-selector";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Period presets
// ---------------------------------------------------------------------------

/** Shift a date by N months, clamping to end-of-month to avoid overflow.
 *  e.g. Mar 31 -1 month → Feb 28 (not Mar 3) */
function shiftMonth(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // If the day overflowed into the next month, clamp to last day of target month
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0); // go back to last day of previous month
  }
  return d;
}

function getPresetRange(
  preset: string,
  baseRange: DateRange | null,
): DateRange | null {
  if (!baseRange) return null;

  const start = new Date(baseRange.start);
  const end = new Date(baseRange.end);
  const diff = end.getTime() - start.getTime();

  if (preset === "prev_period") {
    const newEnd = new Date(start.getTime() - 86400000); // day before start
    const newStart = new Date(newEnd.getTime() - diff);
    return {
      start: newStart.toISOString().slice(0, 10),
      end: newEnd.toISOString().slice(0, 10),
    };
  }

  if (preset === "prev_month") {
    const s = shiftMonth(start, -1);
    const e = shiftMonth(end, -1);
    return {
      start: s.toISOString().slice(0, 10),
      end: e.toISOString().slice(0, 10),
    };
  }

  return null;
}

const PRESET_OPTIONS = [
  { value: "prev_period", label: "직전 기간" },
  { value: "prev_month", label: "전월 동기간" },
  { value: "custom", label: "직접 설정" },
];

// ---------------------------------------------------------------------------
// Custom date range picker with Calendar popovers
// ---------------------------------------------------------------------------

function formatDateLabel(iso: string | undefined) {
  if (!iso) return "날짜 선택";
  return format(parseISO(iso), "yyyy.MM.dd (EEE)", { locale: ko });
}

function CustomDateRangePicker({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);

  // End calendar defaults to the same month as the start date
  const endDefaultMonth = React.useMemo(() => {
    if (range.start) return parseISO(range.start);
    return undefined;
  }, [range.start]);

  return (
    <div className="flex items-center gap-2 text-sm pl-8">
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-sm text-foreground/80 transition-colors hover:bg-white/[0.06] cursor-pointer"
            />
          }
        >
          <IconCalendar className="size-3.5 opacity-60" />
          {formatDateLabel(range.start)}
        </PopoverTrigger>
        <PopoverContent className="w-auto border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg" align="start">
          <Calendar
            mode="single"
            selected={range.start ? parseISO(range.start) : undefined}
            onSelect={(day) => {
              if (!day) return;
              const iso = format(day, "yyyy-MM-dd");
              onChange({
                start: iso,
                end: range.end && range.end >= iso ? range.end : iso,
              });
              setStartOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">~</span>

      <Popover open={endOpen} onOpenChange={setEndOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-sm text-foreground/80 transition-colors hover:bg-white/[0.06] cursor-pointer"
            />
          }
        >
          <IconCalendar className="size-3.5 opacity-60" />
          {formatDateLabel(range.end)}
        </PopoverTrigger>
        <PopoverContent className="w-auto border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg" align="start">
          <Calendar
            mode="single"
            defaultMonth={endDefaultMonth}
            selected={range.end ? parseISO(range.end) : undefined}
            onSelect={(day) => {
              if (!day) return;
              const iso = format(day, "yyyy-MM-dd");
              onChange({
                start: range.start && range.start <= iso ? range.start : iso,
                end: iso,
              });
              setEndOpen(false);
            }}
            disabled={range.start ? { before: parseISO(range.start) } : undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ComparePanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  config: CompareConfig | undefined;
  onConfigChange: (config: CompareConfig | undefined) => void;
  baseDateRange: DateRange | null;
  filterValueOptions: Map<string, string[]>;
}

export function ComparePanel({
  enabled,
  onEnabledChange,
  config,
  onConfigChange,
  baseDateRange,
  filterValueOptions,
}: ComparePanelProps) {
  const [compareType, setCompareType] = React.useState<"period" | "item">(
    config?.type ?? "period",
  );
  const [periodPreset, setPeriodPreset] = React.useState("prev_period");

  const handleTypeChange = (type: "period" | "item") => {
    setCompareType(type);
    if (type === "period") {
      const compareRange = getPresetRange("prev_period", baseDateRange);
      if (baseDateRange && compareRange) {
        onConfigChange({
          type: "period",
          baseRange: baseDateRange,
          compareRange,
        });
      }
    } else {
      onConfigChange({
        type: "item",
        dimension: "creative_name",
        baseValue: "",
        compareValue: "",
      });
    }
  };

  const handlePresetChange = (preset: string) => {
    setPeriodPreset(preset);
    if (preset !== "custom") {
      const compareRange = getPresetRange(preset, baseDateRange);
      if (baseDateRange && compareRange) {
        onConfigChange({
          type: "period",
          baseRange: baseDateRange,
          compareRange,
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-[12px]">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => {
            const isEnabled = checked === true;
            onEnabledChange(isEnabled);
            if (isEnabled && !config) {
              handleTypeChange("period");
            }
            if (!isEnabled) {
              onConfigChange(undefined);
            }
          }}
        />
        <span className="text-sm font-medium text-foreground/80">비교 모드</span>

        {enabled && (
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => handleTypeChange("period")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                compareType === "period"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              기간 비교
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("item")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                compareType === "item"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              항목 비교
            </button>
          </div>
        )}
      </div>

      {enabled && compareType === "period" && config?.type === "period" && (
        <div className="flex flex-col gap-2 pl-7">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground w-8">기준:</span>
            <span className="text-foreground/80">
              {baseDateRange
                ? `${baseDateRange.start} ~ ${baseDateRange.end}`
                : "기간을 먼저 설정하세요"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground w-8">비교:</span>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
              {PRESET_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePresetChange(p.value)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs transition-all",
                    periodPreset === p.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {periodPreset === "custom" && (
            <CustomDateRangePicker
              range={config.compareRange}
              onChange={(range) =>
                onConfigChange({ ...config, compareRange: range })
              }
            />
          )}
          {periodPreset !== "custom" && config.compareRange && (
            <p className="pl-8 text-xs text-muted-foreground/70">
              {config.compareRange.start} ~ {config.compareRange.end}
            </p>
          )}
        </div>
      )}

      {enabled && compareType === "item" && config?.type === "item" && (
        <div className="flex flex-col gap-2 pl-7">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">비교 차원:</span>
            <InlineValueSelector
              options={DIMENSIONS.map((d) => ({ value: d.key, label: d.label }))}
              value={config.dimension}
              onChange={(dim) =>
                onConfigChange({ ...config, dimension: dim as DimensionKey, baseValue: "", compareValue: "" })
              }
              placeholder="차원 선택"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">항목 A:</span>
            {filterValueOptions.get(config.dimension) ? (
              <InlineValueSelector
                options={(filterValueOptions.get(config.dimension) ?? []).map((v) => ({
                  value: v,
                  label: v,
                }))}
                value={config.baseValue}
                onChange={(val) => onConfigChange({ ...config, baseValue: val })}
                placeholder="선택"
              />
            ) : (
              <Input
                value={config.baseValue}
                onChange={(e) => onConfigChange({ ...config, baseValue: e.target.value })}
                placeholder="입력"
                className="h-7 w-[160px] bg-white/[0.03] border-white/[0.08] text-sm px-2"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">항목 B:</span>
            {filterValueOptions.get(config.dimension) ? (
              <InlineValueSelector
                options={(filterValueOptions.get(config.dimension) ?? []).map((v) => ({
                  value: v,
                  label: v,
                }))}
                value={config.compareValue}
                onChange={(val) => onConfigChange({ ...config, compareValue: val })}
                placeholder="선택"
              />
            ) : (
              <Input
                value={config.compareValue}
                onChange={(e) => onConfigChange({ ...config, compareValue: e.target.value })}
                placeholder="입력"
                className="h-7 w-[160px] bg-white/[0.03] border-white/[0.08] text-sm px-2"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
