// =============================================================================
// GET /api/export — CSV export of filtered dashboard data
// Same filter params as /api/dashboard.
// Returns UTF-8 CSV with BOM for Korean Excel compatibility.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/dashboard-queries";
import type { AdRow, DashboardFilters } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Helpers
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
    const [, month] = m.split("-").map(Number);
    if (month < 1 || month > 12) {
      return `Invalid month value: '${m}'. Month must be 01-12.`;
    }
  }
  return null;
}

/** Escape a CSV field value. Wraps in quotes if it contains comma, quote, or newline. */
function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// CSV Column Definitions
// ---------------------------------------------------------------------------

interface CSVColumn {
  header: string;
  accessor: (row: AdRow) => string | number;
}

const CSV_COLUMNS: CSVColumn[] = [
  { header: "국가", accessor: (r) => r.country },
  { header: "월", accessor: (r) => r.month },
  { header: "일자", accessor: (r) => r.date },
  { header: "매체", accessor: (r) => r.medium },
  { header: "목표", accessor: (r) => r.goal },
  { header: "소재종류", accessor: (r) => r.creativeType },
  { header: "소재(작품명)", accessor: (r) => r.creativeName },
  { header: "광고비(KRW)", accessor: (r) => r.adSpend },
  { header: "광고비(현지)", accessor: (r) => r.adSpendLocal },
  { header: "통화", accessor: (r) => r.currency },
  { header: "노출수", accessor: (r) => r.impressions },
  { header: "클릭", accessor: (r) => r.clicks },
  { header: "CTR", accessor: (r) => r.ctr },
  { header: "회원가입", accessor: (r) => r.signups },
  { header: "가입CPA", accessor: (r) => r.signupCpa },
  { header: "결제전환", accessor: (r) => r.conversions },
  { header: "결제금액(KRW)", accessor: (r) => r.revenue },
  { header: "ROAS", accessor: (r) => r.roas },
];

// ---------------------------------------------------------------------------
// Filename Generation
// ---------------------------------------------------------------------------

function generateFilename(filters: DashboardFilters): string {
  const parts = ["adinsight"];

  if (filters.countries.length > 0 && filters.countries.length <= 3) {
    parts.push(filters.countries.join("_").replace(/\s+/g, ""));
  }

  if (filters.mediums.length > 0 && filters.mediums.length <= 3) {
    parts.push(filters.mediums.join("_"));
  }

  if (filters.months.length > 0) {
    const sorted = [...filters.months].sort();
    if (sorted.length === 1) {
      parts.push(sorted[0]);
    } else {
      // Show range: first~last
      parts.push(`${sorted[0]}~${sorted[sorted.length - 1]}`);
    }
  }

  // Fallback: add date if no meaningful filters
  if (parts.length === 1) {
    parts.push(new Date().toISOString().slice(0, 10));
  }

  return `${parts.join("_")}.csv`;
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const countries = parseCommaSeparated(searchParams.get("countries"));
    const months = parseCommaSeparated(searchParams.get("months"));
    const mediums = parseCommaSeparated(searchParams.get("mediums"));
    const goals = parseCommaSeparated(searchParams.get("goals"));

    // Validate months
    if (months.length > 0) {
      const monthError = validateMonths(months);
      if (monthError) {
        return NextResponse.json(
          { error: "InvalidParams", message: monthError },
          { status: 400 },
        );
      }
    }

    const filters: DashboardFilters = { countries, months, mediums, goals, dateMode: "monthly", dateRange: null };
    const { data } = await fetchDashboardData(filters);

    // Build CSV content
    const headerRow = CSV_COLUMNS.map((col) => escapeCSV(col.header)).join(",");
    const dataRows = data.map((row) =>
      CSV_COLUMNS.map((col) => escapeCSV(col.accessor(row))).join(","),
    );

    // UTF-8 BOM + header + data rows
    const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n");
    const filename = generateFilename(filters);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/export] Error:", message);
    return NextResponse.json(
      { error: "ServerError", message },
      { status: 500 },
    );
  }
}
