"use client";

import * as React from "react";
import { IconRotateClockwise2, IconX } from "@tabler/icons-react";

import type { DashboardFilters, FilterOptions } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DateRangePickerRefined,
  getDefaultDateRangeForMode,
} from "@/components/dashboard/date-range-picker-refined";

type VisibleFilterKey = "countries" | "mediums" | "goals";

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  options: FilterOptions;
  latestDataDate?: string;
  hiddenFilters?: VisibleFilterKey[];
}

interface MultiSelectFilterProps {
  label: string;
  ariaLabel: string;
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  width?: string;
}

function MultiSelectFilter({
  label,
  ariaLabel,
  options,
  selected,
  onSelectionChange,
  width = "w-[180px]",
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);

  const toggleItem = React.useCallback(
    (item: string) => {
      if (selected.includes(item)) {
        onSelectionChange(selected.filter((value) => value !== item));
        return;
      }

      onSelectionChange([...selected, item]);
    },
    [onSelectionChange, selected],
  );

  const triggerLabel =
    selected.length === 0 ? `${label} 전체` : `${label} (${selected.length})`;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch("");
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            className={`${width} justify-between rounded-[10px] border-white/[0.08] bg-white/[0.03] text-sm font-normal text-foreground/80 backdrop-blur-[12px] hover:border-white/[0.12] hover:bg-white/[0.06]`}
          />
        }
      >
        <span className="truncate">{triggerLabel}</span>
        {selected.length > 0 ? (
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            {selected.length}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg"
        align="start"
      >
        <div className="flex flex-col">
          <input
            type="text"
            placeholder={`${label} 검색`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border-b border-white/[0.06] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem(option)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <span
                      className={
                        isSelected ? "text-foreground" : "text-foreground/70"
                      }
                    >
                      {option}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onSelectionChange([])}
              className="border-t border-white/[0.06] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              선택 해제
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function buildFilterSummary(
  filters: DashboardFilters,
  hiddenFilters: Set<VisibleFilterKey>,
): string {
  const parts: string[] = [];

  if (!hiddenFilters.has("countries") && filters.countries.length > 0) {
    parts.push(filters.countries.join(", "));
  }

  if (filters.dateRange) {
    const { startDate, endDate } = filters.dateRange;
    parts.push(startDate === endDate ? startDate : `${startDate} ~ ${endDate}`);
  } else if (filters.months.length > 0) {
    const sortedMonths = [...filters.months].sort();
    parts.push(
      sortedMonths.length === 1
        ? sortedMonths[0]
        : `${sortedMonths[0]} ~ ${sortedMonths[sortedMonths.length - 1]}`,
    );
  }

  if (!hiddenFilters.has("mediums") && filters.mediums.length > 0) {
    parts.push(filters.mediums.join(", "));
  }

  if (!hiddenFilters.has("goals") && filters.goals.length > 0) {
    parts.push(filters.goals.join(", "));
  }

  return parts.length > 0 ? parts.join(" / ") : "전체 데이터";
}

export function FilterBar({
  filters,
  onFiltersChange,
  options,
  latestDataDate,
  hiddenFilters = [],
}: FilterBarProps) {
  const hiddenFilterSet = React.useMemo(() => new Set(hiddenFilters), [hiddenFilters]);
  const hasActiveFilters =
    (!hiddenFilterSet.has("countries") && filters.countries.length > 0) ||
    filters.months.length > 0 ||
    (!hiddenFilterSet.has("mediums") && filters.mediums.length > 0) ||
    (!hiddenFilterSet.has("goals") && filters.goals.length > 0) ||
    filters.dateRange !== null;

  const filterSummary = React.useMemo(
    () => buildFilterSummary(filters, hiddenFilterSet),
    [filters, hiddenFilterSet],
  );

  // KEYWORD: dashboard-filter-state-update
  const updateArrayFilter = React.useCallback(
    (key: VisibleFilterKey, value: string[]) => {
      onFiltersChange((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [onFiltersChange],
  );

  // KEYWORD: dashboard-filter-date-sync
  const handleModeChange = React.useCallback(
    (dateMode: DashboardFilters["dateMode"]) => {
      onFiltersChange((current) => ({
        ...current,
        dateMode,
      }));
    },
    [onFiltersChange],
  );

  const handleDateRangeChange = React.useCallback(
    (dateRange: DashboardFilters["dateRange"]) => {
      onFiltersChange((current) => ({
        ...current,
        months: [],
        dateRange,
      }));
    },
    [onFiltersChange],
  );

  const resetFilters = React.useCallback(() => {
    onFiltersChange((current) => ({
      ...current,
      countries: [],
      months: [],
      mediums: [],
      goals: [],
      dateMode: "monthly",
      dateRange: getDefaultDateRangeForMode("monthly", latestDataDate),
    }));
  }, [latestDataDate, onFiltersChange]);

  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <DateRangePickerRefined
        mode={filters.dateMode ?? "monthly"}
        onModeChange={handleModeChange}
        value={filters.dateRange ?? null}
        onChange={handleDateRangeChange}
        latestDataDate={latestDataDate}
      />

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        {!hiddenFilterSet.has("countries") ? (
          <MultiSelectFilter
            label="플랫폼"
            ariaLabel="플랫폼 선택"
            options={options.countries}
            selected={filters.countries}
            onSelectionChange={(value) => updateArrayFilter("countries", value)}
            width="w-full md:w-[180px]"
          />
        ) : null}
        {!hiddenFilterSet.has("mediums") ? (
          <MultiSelectFilter
            label="매체"
            ariaLabel="매체 선택"
            options={options.mediums}
            selected={filters.mediums}
            onSelectionChange={(value) => updateArrayFilter("mediums", value)}
            width="w-full md:w-[160px]"
          />
        ) : null}
        {!hiddenFilterSet.has("goals") ? (
          <MultiSelectFilter
            label="목표"
            ariaLabel="목표 선택"
            options={options.goals}
            selected={filters.goals}
            onSelectionChange={(value) => updateArrayFilter("goals", value)}
            width="w-full md:w-[140px]"
          />
        ) : null}
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5 text-muted-foreground hover:text-foreground md:ml-auto"
          >
            <IconRotateClockwise2 className="size-3.5" />
            필터 초기화
          </Button>
        ) : (
          <div className="md:ml-auto">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="gap-1.5 text-muted-foreground/50"
            >
              <IconX className="size-3.5" />
              필터 없음
            </Button>
          </div>
        )}
      </div>

      <p className="truncate text-xs text-muted-foreground/70" aria-live="polite">
        {filterSummary}
      </p>
    </div>
  );
}
