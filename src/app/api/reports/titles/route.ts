import { NextRequest, NextResponse } from "next/server";

import { fetchTitlesReport } from "@/lib/report-queries";
import type { ReportFilters, TitlePeriodMode } from "@/types/reports";

function parseCommaSeparated(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPeriodMode(value: string | null): TitlePeriodMode {
  return value === "month" || value === "week" ? value : "all";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get("startDate") ?? searchParams.get("start") ?? undefined;
    const endDate = searchParams.get("endDate") ?? searchParams.get("end") ?? undefined;
    const filters: ReportFilters = {
      countries: parseCommaSeparated(searchParams.get("countries")),
      mediums: parseCommaSeparated(searchParams.get("mediums")),
      goals: parseCommaSeparated(searchParams.get("goals")),
      startDate,
      endDate,
    };

    const report = await fetchTitlesReport(
      filters,
      getPeriodMode(searchParams.get("periodMode")),
      searchParams.get("period") ?? "all",
    );

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/reports/titles] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
