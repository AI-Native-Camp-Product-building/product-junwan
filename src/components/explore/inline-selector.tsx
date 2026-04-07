"use client";

import * as React from "react";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InlineSelectorOption {
  value: string;
  label: string;
}

interface InlineSelectorProps {
  options: InlineSelectorOption[];
  selected: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  multiple?: boolean;
  className?: string;
}

export function InlineSelector({
  options,
  selected,
  onSelectionChange,
  placeholder,
  multiple = true,
  className,
}: InlineSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const displayLabel = React.useMemo(() => {
    if (selected.length === 0) return placeholder;
    const labels = selected
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .slice(0, 3);
    const suffix = selected.length > 3 ? ` 외 ${selected.length - 3}개` : "";
    return labels.join(", ") + suffix;
  }, [selected, options, placeholder]);

  const toggle = (value: string) => {
    if (!multiple) {
      onSelectionChange([value]);
      setOpen(false);
      return;
    }
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value));
    } else {
      onSelectionChange([...selected, value]);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-dashed border-[hsl(var(--chart-1)/0.4)] bg-[hsl(var(--chart-1)/0.08)] px-2.5 py-1 text-sm font-medium text-[hsl(var(--chart-1))] transition-colors hover:bg-[hsl(var(--chart-1)/0.15)] cursor-pointer",
              selected.length > 0 && "border-solid",
              className,
            )}
          />
        }
      >
        <span className="truncate max-w-[200px]">{displayLabel}</span>
        <IconChevronDown className="size-3.5 opacity-60 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        className="w-[240px] border-white/[0.08] bg-popover/95 p-0 backdrop-blur-lg"
        align="start"
      >
        <div className="flex flex-col">
          {options.length > 6 && (
            <input
              type="text"
              placeholder="검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-b border-white/[0.06] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          )}
          <div className="max-h-[240px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                결과 없음
              </p>
            ) : (
              filtered.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggle(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.06]",
                      isSelected && "bg-white/[0.04]",
                    )}
                  >
                    {multiple && (
                      <span
                        className={cn(
                          "size-4 rounded border border-white/[0.15] flex items-center justify-center text-[10px]",
                          isSelected && "bg-primary border-primary text-primary-foreground",
                        )}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                    )}
                    <span className={isSelected ? "text-foreground" : "text-foreground/70"}>
                      {option.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {multiple && selected.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectionChange([])}
              className="border-t border-white/[0.06] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              선택 해제
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Simple single-value inline selector styled as a clickable text chip. */
export function InlineValueSelector({
  options,
  value,
  onChange,
  placeholder,
  className,
}: {
  options: InlineSelectorOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <InlineSelector
      options={options}
      selected={value ? [value] : []}
      onSelectionChange={(vals) => onChange(vals[0] ?? "")}
      placeholder={placeholder}
      multiple={false}
      className={className}
    />
  );
}
