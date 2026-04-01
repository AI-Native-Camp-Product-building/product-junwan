"use client";

import * as React from "react";
import { IconX } from "@tabler/icons-react";
import type { DashboardFilters, FilterOptions } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  options: FilterOptions;
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

  const toggleItem = (item: string) => {
    if (selected.includes(item)) {
      onSelectionChange(selected.filter((s) => s !== item));
    } else {
      onSelectionChange([...selected, item]);
    }
  };

  const displayText =
    selected.length === 0
      ? "전체"
      : `${label} (${selected.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            className={`${width} justify-between bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px] rounded-[10px] text-sm font-normal text-foreground/80 hover:bg-white/[0.06] hover:border-white/[0.12]`}
          />
        }
      >
        <span className="truncate">{displayText}</span>
        {selected.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            {selected.length}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0 bg-popover/95 backdrop-blur-lg border-white/[0.08]"
        align="start"
      >
        <Command>
          <CommandInput placeholder={`${label} 검색...`} />
          <CommandList>
            <CommandEmpty>결과 없음</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => toggleItem(option)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <span>{option}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function buildFilterSummary(filters: DashboardFilters): string {
  const parts: string[] = [];
  if (filters.countries.length > 0) parts.push(filters.countries.join(", "));
  if (filters.months.length > 0) {
    const sorted = [...filters.months].sort();
    if (sorted.length === 1) {
      parts.push(sorted[0]);
    } else {
      parts.push(`${sorted[0]}~${sorted[sorted.length - 1]}`);
    }
  }
  if (filters.mediums.length > 0) parts.push(filters.mediums.join(", "));
  if (filters.goals.length > 0) parts.push(filters.goals.join(", "));
  return parts.length > 0 ? parts.join(" / ") : "전체 데이터";
}

export function FilterBar({ filters, onFiltersChange, options }: FilterBarProps) {
  const hasActiveFilters =
    filters.countries.length > 0 ||
    filters.months.length > 0 ||
    filters.mediums.length > 0 ||
    filters.goals.length > 0;

  const filterSummary = buildFilterSummary(filters);

  const resetFilters = () => {
    onFiltersChange({
      countries: [],
      months: [],
      mediums: [],
      goals: [],
    });
  };

  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6">
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      <MultiSelectFilter
        label="국가"
        ariaLabel="국가 선택"
        options={options.countries}
        selected={filters.countries}
        onSelectionChange={(countries) =>
          onFiltersChange({ ...filters, countries })
        }
        width="w-full md:w-[180px]"
      />
      <MultiSelectFilter
        label="월"
        ariaLabel="월 선택"
        options={options.months}
        selected={filters.months}
        onSelectionChange={(months) =>
          onFiltersChange({ ...filters, months })
        }
        width="w-full md:w-[200px]"
      />
      <MultiSelectFilter
        label="매체"
        ariaLabel="매체 선택"
        options={options.mediums}
        selected={filters.mediums}
        onSelectionChange={(mediums) =>
          onFiltersChange({ ...filters, mediums })
        }
        width="w-full md:w-[160px]"
      />
      <MultiSelectFilter
        label="목표"
        ariaLabel="목표 선택"
        options={options.goals}
        selected={filters.goals}
        onSelectionChange={(goals) =>
          onFiltersChange({ ...filters, goals })
        }
        width="w-full md:w-[140px]"
      />
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="text-muted-foreground hover:text-foreground md:ml-auto"
        >
          <IconX className="size-3.5" />
          초기화
        </Button>
      )}
    </div>
    <p className="text-xs text-muted-foreground/70 truncate" aria-live="polite">
      {filterSummary}
    </p>
    </div>
  );
}
