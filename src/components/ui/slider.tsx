"use client";

import * as React from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
}: SliderProps) {
  return (
    <BaseSlider.Root
      value={value}
      onValueChange={(v) => onValueChange(v)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
    >
      <BaseSlider.Control className="relative flex h-5 w-full items-center">
        <BaseSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <BaseSlider.Indicator className="absolute h-full bg-primary rounded-full" />
        </BaseSlider.Track>
        <BaseSlider.Thumb className="block h-3.5 w-3.5 rounded-full border-2 border-primary bg-background shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
