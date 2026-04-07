"use client";

import * as React from "react";
import { IconPlus, IconX, IconCalendar } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { DIMENSIONS, METRICS } from "@/config/query-schema";
import type {
  DimensionKey,
  MetricKey,
  FilterCondition,
  FilterOperator,
  DateRange,
} from "@/types/query";
import { InlineSelector, InlineValueSelector } from "./inline-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ---------------------------------------------------------------------------
// Option builders
// ---------------------------------------------------------------------------

const DIMENSION_OPTIONS = DIMENSIONS.map((d) => ({
  value: d.key,
  label: d.label,
}));

const METRIC_OPTIONS = METRICS.map((m) => ({
  value: m.key,
  label: m.label,
}));

const OPERATOR_OPTIONS = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "in", label: "포함" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "like", label: "검색" },
];

// ---------------------------------------------------------------------------
// Filter row component
// ---------------------------------------------------------------------------

function FilterRow({
  condition,
  index,
  filterValueOptions,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  index: number;
  filterValueOptions: Map<string, string[]>;
  onChange: (index: number, updated: FilterCondition) => void;
  onRemove: (index: number) => void;
}) {
  const fieldOptions = [...DIMENSION_OPTIONS, ...METRIC_OPTIONS];
  const valueOptions = filterValueOptions.get(condition.field);

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <InlineValueSelector
        options={fieldOptions}
        value={condition.field}
        onChange={(field) =>
          onChange(index, { ...condition, field: field as DimensionKey | MetricKey, value: "" })
        }
        placeholder="필드"
      />
      <InlineValueSelector
        options={OPERATOR_OPTIONS}
        value={condition.operator}
        onChange={(op) =>
          onChange(index, { ...condition, operator: op as FilterOperator })
        }
        placeholder="조건"
      />
      {valueOptions ? (
        <InlineSelector
          options={valueOptions.map((v) => ({ value: v, label: v }))}
          selected={
            Array.isArray(condition.value)
              ? (condition.value as string[])
              : condition.value
                ? [String(condition.value)]
                : []
          }
          onSelectionChange={(vals) =>
            onChange(index, {
              ...condition,
              value: condition.operator === "in" || condition.operator === "not_in" ? vals : vals[0] ?? "",
            })
          }
          placeholder="값 선택"
          multiple={condition.operator === "in" || condition.operator === "not_in"}
        />
      ) : (
        <Input
          value={String(condition.value ?? "")}
          onChange={(e) => onChange(index, { ...condition, value: e.target.value })}
          placeholder="값 입력"
          className="h-7 w-[120px] bg-white/[0.03] border-white/[0.08] text-sm px-2"
        />
      )}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-muted-foreground/50 hover:text-foreground transition-colors"
        aria-label="필터 삭제"
      >
        <IconX className="size-3.5" />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface QuerySentenceProps {
  metrics: MetricKey[];
  dimensions: DimensionKey[];
  filters: FilterCondition[];
  dateRange: DateRange | null;
  filterValueOptions: Map<string, string[]>;
  onMetricsChange: (metrics: MetricKey[]) => void;
  onDimensionsChange: (dimensions: DimensionKey[]) => void;
  onFiltersChange: (filters: FilterCondition[]) => void;
  onDateRangeChange: (range: DateRange | null) => void;
}

export function QuerySentence({
  metrics,
  dimensions,
  filters,
  dateRange,
  filterValueOptions,
  onMetricsChange,
  onDimensionsChange,
  onFiltersChange,
  onDateRangeChange,
}: QuerySentenceProps) {
  const addFilter = () => {
    onFiltersChange([
      ...filters,
      { field: "country", operator: "eq", value: "" },
    ]);
  };

  const updateFilter = (index: number, updated: FilterCondition) => {
    const next = [...filters];
    next[index] = updated;
    onFiltersChange(next);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);

  const formatDateLabel = (iso: string | undefined) => {
    if (!iso) return "날짜 선택";
    return format(parseISO(iso), "yyyy.MM.dd (EEE)", { locale: ko });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-[12px]">
      {/* 1. 지표 + 차원 */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-foreground/80">
        <InlineSelector
          options={METRIC_OPTIONS}
          selected={metrics}
          onSelectionChange={(vals) => onMetricsChange(vals as MetricKey[])}
          placeholder="지표 선택"
        />
        <span className="text-muted-foreground">를</span>
        <InlineSelector
          options={DIMENSION_OPTIONS}
          selected={dimensions}
          onSelectionChange={(vals) => onDimensionsChange(vals as DimensionKey[])}
          placeholder="차원 선택"
        />
        <span className="text-muted-foreground">별로 나눠서 보여줘</span>
      </div>

      {/* 2. 필터 */}
      {filters.length > 0 && (
        <div className="flex flex-col gap-2">
          {filters.map((condition, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5 text-sm text-foreground/80">
              {i === 0 ? (
                <span className="text-muted-foreground text-xs">필터:</span>
              ) : (
                <span className="text-muted-foreground text-xs">그리고</span>
              )}
              <FilterRow
                condition={condition}
                index={i}
                filterValueOptions={filterValueOptions}
                onChange={updateFilter}
                onRemove={removeFilter}
              />
            </div>
          ))}
        </div>
      )}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={addFilter}
          className="gap-1 text-muted-foreground hover:text-foreground text-xs h-7"
        >
          <IconPlus className="size-3" />
          필터 추가
        </Button>
      </div>

      {/* 3. 날짜 (맨 아래) */}
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-foreground/80">
        <span className="text-muted-foreground text-xs">기간:</span>
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
            {formatDateLabel(dateRange?.start)}
          </PopoverTrigger>
          <PopoverContent className="w-auto border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg" align="start">
            <Calendar
              mode="single"
              selected={dateRange?.start ? parseISO(dateRange.start) : undefined}
              onSelect={(day) => {
                if (!day) return;
                const iso = format(day, "yyyy-MM-dd");
                onDateRangeChange({
                  start: iso,
                  end: dateRange?.end && dateRange.end >= iso ? dateRange.end : iso,
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
            {formatDateLabel(dateRange?.end)}
          </PopoverTrigger>
          <PopoverContent className="w-auto border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg" align="start">
            <Calendar
              mode="single"
              selected={dateRange?.end ? parseISO(dateRange.end) : undefined}
              onSelect={(day) => {
                if (!day) return;
                const iso = format(day, "yyyy-MM-dd");
                onDateRangeChange({
                  start: dateRange?.start && dateRange.start <= iso ? dateRange.start : iso,
                  end: iso,
                });
                setEndOpen(false);
              }}
              disabled={dateRange?.start ? { before: parseISO(dateRange.start) } : undefined}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
