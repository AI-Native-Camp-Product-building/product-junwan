import { NextRequest, NextResponse } from "next/server";

import { getDefaultLocale } from "@/lib/locales";
import { fetchLocaleReport } from "@/lib/report-queries";

function parseCommaSeparated(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const locale = getDefaultLocale(searchParams.get("locale"));
    const startDate = searchParams.get("startDate") ?? searchParams.get("start") ?? undefined;
    const endDate = searchParams.get("endDate") ?? searchParams.get("end") ?? undefined;

    const report = await fetchLocaleReport(locale, {
      mediums: parseCommaSeparated(searchParams.get("mediums")),
      goals: parseCommaSeparated(searchParams.get("goals")),
      startDate,
      endDate,
    });

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/reports/locale] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
