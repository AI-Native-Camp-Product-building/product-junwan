// =============================================================================
// Sheets Sync Pipeline — AdInsight
// Orchestrates Google Sheets → Supabase ad_raw sync.
// SERVER ONLY — never import from client components.
// =============================================================================

import { createAdminClient } from "@/lib/supabase-admin";
import { readSheet } from "@/lib/sheets-client";
import { parseHeaders, parseRow, isEmptyRow, HeaderParseError } from "@/lib/sheets-parser";
import type {
  AdRawInsert,
  SheetSource,
  SheetSyncResult,
  SyncRunResult,
} from "@/types/sync";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncOptions {
  sheetSourceIds?: number[]; // If provided, sync only these sheets.
  dryRun?: boolean; // If true, parse but do not write to Supabase.
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UPSERT_BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Syncs all active Google Sheets to the `ad_raw` table in Supabase.
 *
 * Steps:
 * 1. Query `sheet_source` for active sheets (or filtered by sheetSourceIds).
 * 2. For each sheet sequentially (to respect Google API rate limits):
 *    a. Insert a `sheet_sync_log` row with status='running'.
 *    b. Read the sheet via Google Sheets API.
 *    c. Parse headers and data rows.
 *    d. Batch upsert into `ad_raw`.
 *    e. Update sync log with final status and counts.
 * 3. Return aggregated results.
 *
 * Error handling: sheet-level isolation — one sheet failing does not stop others.
 * This function never throws; all errors are captured in the result.
 */
export async function syncAllSheets(
  options?: SyncOptions,
): Promise<SyncRunResult> {
  const overallStart = Date.now();
  const adminClient = createAdminClient();

  // 1. Fetch active sheet sources
  let query = adminClient
    .from("sheet_source")
    .select("*")
    .eq("is_active", true)
    .order("id");

  if (options?.sheetSourceIds && options.sheetSourceIds.length > 0) {
    query = query.in("id", options.sheetSourceIds);
  }

  const { data: sheets, error: sheetsError } = await query;

  if (sheetsError || !sheets) {
    console.error("[sheets-sync] Failed to fetch sheet_source:", sheetsError);
    return {
      totalSheets: 0,
      successful: 0,
      failed: 0,
      partial: 0,
      results: [],
      totalDurationMs: Date.now() - overallStart,
    };
  }

  const typedSheets = sheets as SheetSource[];
  console.log(
    `[sheets-sync] Starting sync for ${typedSheets.length} sheet(s)...`,
  );

  // 2. Process each sheet sequentially
  const results: SheetSyncResult[] = [];

  for (const sheet of typedSheets) {
    console.log(`[sheets-sync] Syncing "${sheet.name}" (id=${sheet.id})...`);

    // Insert sync log entry
    const syncRunId = await insertSyncLog(adminClient, sheet.id);

    const result = await syncSingleSheet(
      sheet,
      syncRunId,
      adminClient,
      options?.dryRun,
    );

    // Update sync log
    if (syncRunId != null) {
      await updateSyncLog(adminClient, syncRunId, result);
    }

    results.push(result);
    console.log(
      `[sheets-sync] "${sheet.name}": ${result.status} — ` +
        `fetched=${result.rowsFetched}, upserted=${result.rowsUpserted}, ` +
        `skipped=${result.rowsSkipped}, ${result.durationMs}ms` +
        (result.error ? ` [error: ${result.error}]` : ""),
    );
  }

  // 3. Aggregate results
  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const partial = results.filter((r) => r.status === "partial").length;

  const runResult: SyncRunResult = {
    totalSheets: results.length,
    successful,
    failed,
    partial,
    results,
    totalDurationMs: Date.now() - overallStart,
  };

  console.log(
    `[sheets-sync] Sync complete: ${successful} success, ${failed} failed, ` +
      `${partial} partial — total ${runResult.totalDurationMs}ms`,
  );

  return runResult;
}

// ---------------------------------------------------------------------------
// Single sheet sync
// ---------------------------------------------------------------------------

/**
 * Syncs a single sheet source to `ad_raw`.
 * Isolated error handling — errors are captured in the result, never thrown.
 */
export async function syncSingleSheet(
  sheetSource: SheetSource,
  syncRunId: number | null,
  adminClient: SupabaseClient,
  dryRun?: boolean,
): Promise<SheetSyncResult> {
  const start = Date.now();
  let rowsFetched = 0;
  let rowsUpserted = 0;
  let rowsSkipped = 0;

  try {
    // Step 1: Read the sheet from Google Sheets API
    const sheetData = await readSheet({
      spreadsheetId: sheetSource.sheet_id,
      tabName: sheetSource.tab_name,
    });

    rowsFetched = sheetData.totalRows;

    if (sheetData.values.length === 0) {
      return {
        sheetSourceId: sheetSource.id,
        sheetName: sheetSource.name,
        status: "success",
        rowsFetched: 0,
        rowsUpserted: 0,
        rowsSkipped: 0,
        durationMs: Date.now() - start,
      };
    }

    // Step 2: Extract header row (header_row is 1-indexed, array is 0-indexed)
    const headerRowIndex = sheetSource.header_row - 1;
    if (headerRowIndex >= sheetData.values.length) {
      throw new Error(
        `Header row ${sheetSource.header_row} exceeds sheet data length (${sheetData.values.length} rows).`,
      );
    }

    const headerRow = sheetData.values[headerRowIndex];

    // Step 3: Parse headers to build column mapping
    const mapping = parseHeaders(headerRow, sheetSource.name);
    console.log(
      `[sheets-sync] "${sheetSource.name}": header mapping resolved at row ${sheetSource.header_row}.`,
    );

    // Step 4: Parse data rows (everything after the header row)
    const dataRows = sheetData.values.slice(headerRowIndex + 1);
    const parsedRows: AdRawInsert[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      // Row number in sheet: header_row + 1 (first data row) + i
      const sheetRowNumber = sheetSource.header_row + 1 + i;

      if (isEmptyRow(row)) {
        rowsSkipped++;
        continue;
      }

      try {
        const parsed = parseRow(
          row,
          mapping,
          sheetSource.id,
          sheetRowNumber,
          syncRunId,
        );
        if (parsed) {
          parsedRows.push(parsed);
        } else {
          rowsSkipped++;
        }
      } catch (rowErr) {
        // Individual row parse failure — skip and continue
        rowsSkipped++;
        console.warn(
          `[sheets-sync] "${sheetSource.name}" row ${sheetRowNumber}: parse error — ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`,
        );
      }
    }

    console.log(
      `[sheets-sync] "${sheetSource.name}": parsed ${parsedRows.length} rows, skipped ${rowsSkipped}.`,
    );

    // Step 5: Delete existing rows + insert fresh (unless dry run)
    if (dryRun) {
      return {
        sheetSourceId: sheetSource.id,
        sheetName: sheetSource.name,
        status: "success",
        rowsFetched,
        rowsUpserted: 0,
        rowsSkipped,
        durationMs: Date.now() - start,
      };
    }

    // Delete stale rows for this sheet before inserting fresh data
    const { error: deleteError } = await adminClient
      .from("ad_raw")
      .delete()
      .eq("sheet_source_id", sheetSource.id);

    if (deleteError) {
      console.warn(
        `[sheets-sync] "${sheetSource.name}": failed to delete old rows — ${deleteError.message}`,
      );
    }

    let hasPartialError = false;

    for (let i = 0; i < parsedRows.length; i += UPSERT_BATCH_SIZE) {
      const batch = parsedRows.slice(i, i + UPSERT_BATCH_SIZE);
      const { upserted, errors } = await upsertBatch(adminClient, batch);
      rowsUpserted += upserted;

      if (errors.length > 0) {
        hasPartialError = true;
        console.warn(
          `[sheets-sync] "${sheetSource.name}" batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1}: ${errors.length} error(s) — ${errors[0]}`,
        );
      }
    }

    return {
      sheetSourceId: sheetSource.id,
      sheetName: sheetSource.name,
      status: hasPartialError ? "partial" : "success",
      rowsFetched,
      rowsUpserted,
      rowsSkipped,
      durationMs: Date.now() - start,
      error: hasPartialError ? "Some rows failed to upsert" : undefined,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    console.error(
      `[sheets-sync] "${sheetSource.name}" FAILED: ${errorMessage}`,
    );

    return {
      sheetSourceId: sheetSource.id,
      sheetName: sheetSource.name,
      status: "failed",
      rowsFetched,
      rowsUpserted,
      rowsSkipped,
      durationMs: Date.now() - start,
      error: errorMessage,
    };
  }
}

// ---------------------------------------------------------------------------
// Batch upsert
// ---------------------------------------------------------------------------

/**
 * Upserts a batch of rows into `ad_raw` using the
 * `(sheet_source_id, sheet_row_number)` unique constraint for dedup.
 *
 * Returns the count of successfully upserted rows and any error messages.
 */
async function upsertBatch(
  adminClient: SupabaseClient,
  rows: AdRawInsert[],
): Promise<{ upserted: number; errors: string[] }> {
  if (rows.length === 0) {
    return { upserted: 0, errors: [] };
  }

  const { data, error } = await adminClient
    .from("ad_raw")
    .upsert(rows, {
      onConflict: "sheet_source_id,sheet_row_number",
      ignoreDuplicates: false, // update on conflict
    })
    .select("id");

  if (error) {
    return {
      upserted: 0,
      errors: [error.message],
    };
  }

  return {
    upserted: data?.length ?? rows.length,
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Sync log helpers
// ---------------------------------------------------------------------------

/**
 * Inserts a new `sheet_sync_log` entry with status='running'.
 * Returns the generated sync log ID.
 */
async function insertSyncLog(
  adminClient: SupabaseClient,
  sheetSourceId: number,
): Promise<number | null> {
  const { data, error } = await adminClient
    .from("sheet_sync_log")
    .insert({
      sheet_source_id: sheetSourceId,
      status: "running",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      `[sheets-sync] Failed to insert sync log for sheet ${sheetSourceId}:`,
      error,
    );
    return null; // fallback — sync can still proceed without a log ID
  }

  return data.id;
}

/**
 * Updates a `sheet_sync_log` entry with the final result.
 */
async function updateSyncLog(
  adminClient: SupabaseClient,
  syncRunId: number,
  result: SheetSyncResult,
): Promise<void> {
  if (syncRunId === -1) return; // no log row was created

  const { error } = await adminClient
    .from("sheet_sync_log")
    .update({
      status: result.status,
      rows_fetched: result.rowsFetched,
      rows_upserted: result.rowsUpserted,
      rows_skipped: result.rowsSkipped,
      error_message: result.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", syncRunId);

  if (error) {
    console.error(
      `[sheets-sync] Failed to update sync log ${syncRunId}:`,
      error,
    );
  }
}
