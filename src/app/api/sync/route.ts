// =============================================================================
// POST /api/sync — Google Sheets → Supabase sync trigger
// Protected by SYNC_API_SECRET bearer token.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { syncAllSheets, type SyncOptions } from "@/lib/sheets-sync";

export const runtime = "nodejs"; // Sheets API requires Node.js (fs, googleapis)
export const maxDuration = 300; // 5 minutes — 8 sheets can take a while

export async function POST(request: NextRequest) {
  // ── Auth check ──
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SYNC_API_SECRET;

  if (!expectedSecret) {
    console.error("[api/sync] SYNC_API_SECRET environment variable is not set.");
    return NextResponse.json(
      { error: "ServerError", message: "Sync secret not configured." },
      { status: 500 },
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing API secret" },
      { status: 401 },
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (token !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing API secret" },
      { status: 401 },
    );
  }

  // ── Parse optional body ──
  let options: SyncOptions = {};
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body === "object") {
      if (Array.isArray(body.sheetSourceIds)) {
        options.sheetSourceIds = body.sheetSourceIds;
      }
      if (typeof body.dryRun === "boolean") {
        options.dryRun = body.dryRun;
      }
    }
  } catch {
    // Empty body is fine — sync all sheets
  }

  // ── Run sync ──
  try {
    console.log("[api/sync] Sync triggered.", options);
    const result = await syncAllSheets(options);

    // Determine HTTP status based on results
    const allFailed = result.totalSheets > 0 && result.failed === result.totalSheets;
    const someFailures = result.failed > 0 && result.successful > 0;

    if (allFailed) {
      return NextResponse.json(
        { error: "SyncFailed", message: "All sheets failed to sync.", partialResult: result },
        { status: 500 },
      );
    }

    // 207 Multi-Status for partial success, 200 for full success
    const status = someFailures || result.partial > 0 ? 207 : 200;

    return NextResponse.json({ success: true, result }, { status });
  } catch (err) {
    console.error("[api/sync] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "SyncFailed",
        message: err instanceof Error ? err.message : "Unexpected sync error",
      },
      { status: 500 },
    );
  }
}
