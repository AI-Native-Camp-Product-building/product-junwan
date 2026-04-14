// =============================================================================
// GET /api/dashboard — Filtered dashboard data
// Returns AdRow[] with metadata. Public endpoint (data is not sensitive).
// Cache: CDN 5 min, stale-while-revalidate 60s.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/dashboard-queries";
import type { DashboardFilters } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// In-memory cache (15 min TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 15 * 60 * 1000;

let cache: { key: string; data: unknown; timestamp: number } | null = null;

function getCached(key: string): unknown | null {
  if (!cache || cache.key !== key) return null;
  if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
    cache = null;
    return null;
  }
  return cache.data;
}

function setCache(key: string, data: unknown): void {
  cache = { key, data, timestamp: Date.now() };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const MONTH_REGEX = /^\d{4}-\d{2}$/;

function parseCommaSeparated(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function validateMonths(months: string[]): string | null {
  for (const m of months) {
    if (!MONTH_REGEX.test(m)) {
      return `Invalid month format: '${m}'. Expected YYYY-MM.`;
    }
    const [year, month] = m.split("-").map(Number);
    if (month < 1 || month > 12) {
      return `Invalid month value: '${m}'. Month must be 01-12.`;
    }
    if (year < 2020 || year > 2030) {
      return `Invalid year value: '${m}'. Year must be 2020-2030.`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse query parameters (comma-separated)
    const countries = parseCommaSeparated(searchParams.get("countries"));
    const months = parseCommaSeparated(searchParams.get("months"));
    const mediums = parseCommaSeparated(searchParams.get("mediums"));
    const goals = parseCommaSeparated(searchParams.get("goals"));

    // Validate months format
    if (months.length > 0) {
      const monthError = validateMonths(months);
      if (monthError) {
        return NextResponse.json(
          { error: "InvalidParams", message: monthError },
          { status: 400 },
        );
      }
    }

    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { error: "InvalidParams", message: `Invalid startDate format: '${startDate}'. Expected YYYY-MM-DD.` },
        { status: 400 },
      );
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { error: "InvalidParams", message: `Invalid endDate format: '${endDate}'. Expected YYYY-MM-DD.` },
        { status: 400 },
      );
    }
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return NextResponse.json(
        { error: "InvalidParams", message: "Both startDate and endDate must be provided together." },
        { status: 400 },
      );
    }
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { error: "InvalidParams", message: "startDate must be before or equal to endDate." },
        { status: 400 },
      );
    }

    const filters: DashboardFilters = { countries, months, mediums, goals, dateMode: "monthly", dateRange: null, startDate, endDate };

    const cacheKey = JSON.stringify(filters);
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120",
          "X-Cache": "HIT",
        },
      });
    }

    const result = await fetchDashboardData(filters);
    setCache(cacheKey, result);

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120",
          "X-Cache": "MISS",
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/dashboard] Error:", message);
    return NextResponse.json(
      { error: "ServerError", message },
      { status: 500 },
    );
  }
}
