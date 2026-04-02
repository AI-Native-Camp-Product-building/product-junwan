"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdRow, FilterOptions } from "@/types/dashboard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlatformViewProps {
  initialData: AdRow[];
  filterOptions: FilterOptions;
  platforms: string[];
}

export function PlatformView({ initialData, filterOptions, platforms }: PlatformViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPlatform = searchParams.get("platform") ?? "";

  const filteredData = React.useMemo(() => {
    if (!currentPlatform) return initialData;
    return initialData.filter((row) => row.country === currentPlatform);
  }, [initialData, currentPlatform]);

  const adjustedOptions = React.useMemo<FilterOptions>(() => {
    if (!currentPlatform) return filterOptions;
    return { ...filterOptions, countries: [currentPlatform] };
  }, [filterOptions, currentPlatform]);

  const handleChange = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("platform", value);
    const qs = params.toString();
    router.push(qs ? `/dashboard/platform?${qs}` : "/dashboard/platform");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 lg:px-6">
        <Select value={currentPlatform} onValueChange={handleChange}>
          <SelectTrigger className="w-full md:w-[240px] bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px] rounded-[10px] text-sm" aria-label="플랫폼 선택">
            <SelectValue placeholder="플랫폼을 선택하세요" />
          </SelectTrigger>
          <SelectContent className="bg-popover/95 backdrop-blur-lg border-white/[0.08]">
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currentPlatform ? (
        <DashboardShell key={currentPlatform} initialData={filteredData} filterOptions={adjustedOptions} />
      ) : (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          상단에서 플랫폼을 선택하면 해당 플랫폼의 성과 데이터를 확인할 수 있습니다.
        </div>
      )}
    </div>
  );
}
