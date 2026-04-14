"use client";

import { useState, useMemo } from "react";
import { IconArrowUp, IconArrowDown, IconFilter } from "@tabler/icons-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DERIVED_METRIC_COMPONENTS, METRIC_MAP } from "@/config/query-schema";
import type { FilterCondition, FilterOperator, DimensionKey, MetricKey } from "@/types/query";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ColumnFilterPopoverProps {
  columnKey: string;
  columnLabel: string;
  columnType: "text" | "number" | "derived";
  /** Available values for text columns (checkbox list). */
  availableValues?: string[];
  /** Current filter for this column. */
  currentFilter?: FilterCondition;
  /** Sort state. */
  sortDirection?: "asc" | "desc" | null;
  /** Callbacks */
  onApplyFilter: (
    field: string,
    operator: FilterCondition["operator"],
    value: FilterCondition["value"]
  ) => void;
  onClearFilter: (field: string) => void;
  onSort: (field: string, direction: "asc" | "desc") => void;
  /** For derived metrics: open filter for a base metric. */
  onOpenBaseMetricFilter?: (metricKey: string) => void;
  /** Trigger element (the header content). */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Text filter sub-component
// ---------------------------------------------------------------------------

interface TextFilterProps {
  availableValues: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function TextFilter({ availableValues, selected, onChange }: TextFilterProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      availableValues.filter((v) =>
        v.toLowerCase().includes(search.toLowerCase())
      ),
    [availableValues, search]
  );

  const allSelected = filtered.length > 0 && filtered.every((v) => selected.includes(v));

  function handleToggleAll() {
    if (allSelected) {
      // Deselect all filtered items
      onChange(selected.filter((s) => !filtered.includes(s)));
    } else {
      // Select all filtered items (merge with existing)
      const next = Array.from(new Set([...selected, ...filtered]));
      onChange(next);
    }
  }

  function handleToggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <Input
        placeholder="검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-xs"
      />
      {/* Select all toggle */}
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleToggleAll}
        />
        <span>전체 선택</span>
      </label>
      {/* Value list */}
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">결과 없음</p>
        ) : (
          filtered.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(value)}
                onCheckedChange={() => handleToggle(value)}
              />
              <span className="truncate">{value}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number filter sub-component
// ---------------------------------------------------------------------------

interface NumberFilterProps {
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}

function NumberFilter({ minValue, maxValue, onMinChange, onMaxChange }: NumberFilterProps) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-xs font-medium text-muted-foreground">범위 필터</p>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">최소</label>
        <Input
          type="number"
          placeholder="최솟값"
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">최대</label>
        <Input
          type="number"
          placeholder="최댓값"
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Derived metric info sub-component
// ---------------------------------------------------------------------------

interface DerivedInfoProps {
  columnKey: string;
  onOpenBaseMetricFilter?: (metricKey: string) => void;
}

function DerivedInfo({ columnKey, onOpenBaseMetricFilter }: DerivedInfoProps) {
  const derivedInfo = DERIVED_METRIC_COMPONENTS[columnKey];

  if (!derivedInfo) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <p className="text-xs text-muted-foreground">파생 지표입니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-xs font-medium">{derivedInfo.label}</p>
      <p className="text-xs text-muted-foreground">
        파생 지표는 직접 필터 불가합니다.
        <br />
        구성 지표에 필터를 적용하세요.
      </p>
      <div className="flex flex-col gap-1">
        {derivedInfo.components.map((metricKey: MetricKey) => {
          const meta = METRIC_MAP.get(metricKey);
          const label = meta?.label ?? metricKey;
          return (
            <Button
              key={metricKey}
              variant="outline"
              size="sm"
              className="justify-start text-xs"
              onClick={() => onOpenBaseMetricFilter?.(metricKey)}
            >
              <IconFilter className="size-3" />
              {label} 필터
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ColumnFilterPopover({
  columnKey,
  columnLabel,
  columnType,
  availableValues = [],
  currentFilter,
  sortDirection,
  onApplyFilter,
  onClearFilter,
  onSort,
  onOpenBaseMetricFilter,
  children,
}: ColumnFilterPopoverProps) {
  // --- Text filter state ---
  const initialSelected = useMemo<string[]>(() => {
    if (
      currentFilter?.operator === "in" &&
      Array.isArray(currentFilter.value) &&
      currentFilter.value.every((v) => typeof v === "string")
    ) {
      return currentFilter.value as string[];
    }
    return [];
  }, [currentFilter]);

  const [selectedValues, setSelectedValues] = useState<string[]>(initialSelected);

  // --- Number filter state ---
  const initialMin = useMemo<string>(() => {
    if (currentFilter?.operator === "gte" && typeof currentFilter.value === "number") {
      return String(currentFilter.value);
    }
    return "";
  }, [currentFilter]);

  const initialMax = useMemo<string>(() => {
    if (currentFilter?.operator === "lte" && typeof currentFilter.value === "number") {
      return String(currentFilter.value);
    }
    return "";
  }, [currentFilter]);

  const [minValue, setMinValue] = useState<string>(initialMin);
  const [maxValue, setMaxValue] = useState<string>(initialMax);

  // --- Has active filter indicator ---
  const hasFilter = Boolean(currentFilter);

  // --- Apply handler ---
  function handleApply() {
    if (columnType === "text") {
      if (selectedValues.length === 0) {
        onClearFilter(columnKey);
      } else {
        onApplyFilter(columnKey, "in" as FilterOperator, selectedValues);
      }
    } else if (columnType === "number") {
      const min = minValue !== "" ? Number(minValue) : null;
      const max = maxValue !== "" ? Number(maxValue) : null;

      if (min === null && max === null) {
        onClearFilter(columnKey);
      } else if (min !== null && max === null) {
        onApplyFilter(columnKey, "gte" as FilterOperator, min);
      } else if (min === null && max !== null) {
        onApplyFilter(columnKey, "lte" as FilterOperator, max);
      } else if (min !== null && max !== null) {
        // Apply min (gte) — TODO: range (between) support when addOrUpdateFilter supports multi-filter per field
        onApplyFilter(columnKey, "gte" as FilterOperator, min);
      }
    }
  }

  // --- Clear handler ---
  function handleClear() {
    setSelectedValues([]);
    setMinValue("");
    setMaxValue("");
    onClearFilter(columnKey);
  }

  const showActions = columnType === "text" || columnType === "number";

  return (
    <Popover>
      <PopoverTrigger>
        <span className="flex items-center gap-1">
          {children}
          {hasFilter && (
            <IconFilter className="size-3 text-primary" />
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 p-0">
        {/* Header */}
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-foreground">{columnLabel}</p>
        </div>

        {/* Sort section */}
        <div className="flex flex-col border-b border-border">
          <button
            className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted ${
              sortDirection === "asc" ? "font-semibold text-primary" : "text-foreground"
            }`}
            onClick={() => onSort(columnKey, "asc")}
          >
            <IconArrowUp className="size-3.5" />
            오름차순 정렬
          </button>
          <button
            className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted ${
              sortDirection === "desc" ? "font-semibold text-primary" : "text-foreground"
            }`}
            onClick={() => onSort(columnKey, "desc")}
          >
            <IconArrowDown className="size-3.5" />
            내림차순 정렬
          </button>
        </div>

        {/* Filter section */}
        <div className={showActions ? "border-b border-border" : ""}>
          {columnType === "text" && (
            <TextFilter
              availableValues={availableValues}
              selected={selectedValues}
              onChange={setSelectedValues}
            />
          )}
          {columnType === "number" && (
            <NumberFilter
              minValue={minValue}
              maxValue={maxValue}
              onMinChange={setMinValue}
              onMaxChange={setMaxValue}
            />
          )}
          {columnType === "derived" && (
            <DerivedInfo
              columnKey={columnKey}
              onOpenBaseMetricFilter={onOpenBaseMetricFilter}
            />
          )}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex items-center justify-between gap-2 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleClear}
            >
              초기화
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={handleApply}
            >
              적용
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Re-export the type alias so consumers can import it from one place
export type { DimensionKey, MetricKey };
