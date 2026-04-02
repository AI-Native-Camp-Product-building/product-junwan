"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdRow, FilterOptions } from "@/types/dashboard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MediumViewProps {
  initialData: AdRow[];
  filterOptions: FilterOptions;
  mediums: string[];
}

export function MediumView({ initialData, filterOptions, mediums }: MediumViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMedium = searchParams.get("medium") ?? "";

  const filteredData = React.useMemo(() => {
    if (!currentMedium) return initialData;
    return initialData.filter((row) => row.medium === currentMedium);
  }, [initialData, currentMedium]);

  const adjustedOptions = React.useMemo<FilterOptions>(() => {
    if (!currentMedium) return filterOptions;
    return { ...filterOptions, mediums: [currentMedium] };
  }, [filterOptions, currentMedium]);

  const handleChange = (value: string | null) => {
    const params = new URLSearchParams();
    if (value) params.set("medium", value);
    const qs = params.toString();
    router.push(qs ? `/dashboard/medium?${qs}` : "/dashboard/medium");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 lg:px-6">
        <Select value={currentMedium} onValueChange={handleChange}>
          <SelectTrigger className="w-full md:w-[240px] bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px] rounded-[10px] text-sm" aria-label="매체 선택">
            <SelectValue placeholder="매체를 선택하세요" />
          </SelectTrigger>
          <SelectContent className="bg-popover/95 backdrop-blur-lg border-white/[0.08]">
            {mediums.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currentMedium ? (
        <DashboardShell key={currentMedium} initialData={filteredData} filterOptions={adjustedOptions} />
      ) : (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          상단에서 매체를 선택하면 해당 매체의 성과 데이터를 확인할 수 있습니다.
        </div>
      )}
    </div>
  );
}
