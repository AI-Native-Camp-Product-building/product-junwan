// =============================================================================
// GET /api/filters — Distinct filter option values
// Returns FilterOptions for populating dropdown menus.
// Cache: CDN 1 hour (options change only when new data is synced).
// =============================================================================

import { NextResponse } from "next/server";
import { fetchFilterOptions } from "@/lib/dashboard-queries";

export async function GET() {
  try {
    const options = await fetchFilterOptions();

    return NextResponse.json(options, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/filters] Error:", message);
    return NextResponse.json(
      { error: "ServerError", message },
      { status: 500 },
    );
  }
}
