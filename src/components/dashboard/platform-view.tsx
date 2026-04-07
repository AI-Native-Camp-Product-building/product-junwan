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
  // KEYWORD: dashboard-platform-query-fallback
  const currentPlatform = React.useMemo(() => {
    const explicitPlatform = searchParams.get("platform");
    if (explicitPlatform) return explicitPlatform;

    const countryFilters = searchParams
      .get("countries")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return countryFilters?.length === 1 ? countryFilters[0] : "";
  }, [searchParams]);

  const filteredData = React.useMemo(() => {
    if (!currentPlatform) return initialData;
    return initialData.filter((row) => row.country === currentPlatform);
  }, [initialData, currentPlatform]);

  const adjustedOptions = React.useMemo<FilterOptions>(() => {
    if (!currentPlatform) return filterOptions;
    return { ...filterOptions, countries: [currentPlatform] };
  }, [filterOptions, currentPlatform]);

  const lockedFilters = React.useMemo(
    () => (currentPlatform ? { countries: [currentPlatform] } : undefined),
    [currentPlatform],
  );

  const initialFilters = React.useMemo(
    () => (currentPlatform ? { countries: [currentPlatform] } : undefined),
    [currentPlatform],
  );

  const hiddenFilters = React.useMemo(
    () => ["countries"] as Array<"countries" | "mediums" | "goals">,
    [],
  );

  // KEYWORD: dashboard-platform-fixed-filter
  const handleChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("platform", value);
      params.set("countries", value);
    } else {
      params.delete("platform");
      params.delete("countries");
    }

    const queryString = params.toString();
    router.push(
      queryString ? `/dashboard/platform?${queryString}` : "/dashboard/platform",
    );
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
        {currentPlatform ? (
          <p className="mt-2 text-xs text-muted-foreground">
            플랫폼 고정 필터: {currentPlatform}
          </p>
        ) : null}
        {currentPlatform ? (
          <p className="mt-1 text-xs text-muted-foreground/80">
            기간, 매체, 목표를 조정하면서 선택한 플랫폼 안에서만 상세 분석합니다.
          </p>
        ) : null}
      </div>
      {currentPlatform ? (
        <DashboardShell
          key={currentPlatform}
          initialData={filteredData}
          filterOptions={adjustedOptions}
          initialFilters={initialFilters}
          hiddenFilters={hiddenFilters}
          lockedFilters={lockedFilters}
        />
      ) : (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          상단에서 플랫폼을 선택하면 해당 플랫폼의 성과 데이터를 확인할 수 있습니다.
        </div>
      )}
    </div>
  );
}
