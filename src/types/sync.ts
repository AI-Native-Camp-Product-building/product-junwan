// =============================================================================
// Sync Types — AdInsight
// Types for the Google Sheets -> Supabase sync pipeline.
// DB-facing types use snake_case to match schema.sql column names exactly.
// =============================================================================

/**
 * Insert payload for the `ad_raw` table.
 * Column names match `supabase/schema.sql` exactly (snake_case).
 */
export interface AdRawInsert {
  sheet_source_id: number;
  sheet_row_number: number;
  month_raw: string | null;
  date_raw: string | null;
  medium_raw: string | null;
  goal_raw: string | null;
  creative_type_raw: string | null;
  creative_name: string | null;
  ad_spend_local: number | null;
  ad_spend_krw: number | null;
  revenue_local: number | null;
  revenue_krw: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr_raw: number | null;
  signups: number | null;
  signup_cpa_raw: number | null;
  conversions: number | null;
  roas_raw: number | null;
  sync_run_id: number | null;
}

/**
 * Maps header positions (0-indexed column indices) for a parsed sheet.
 * Each value is the column index where that field was found in the header row.
 */
export interface ColumnMapping {
  month_raw: number;
  date_raw: number;
  medium_raw: number;
  goal_raw: number;
  creative_type_raw: number;
  creative_name: number;
  ad_spend_local: number;
  ad_spend_krw: number;
  impressions: number;
  clicks: number;
  ctr_raw: number;
  signups: number;
  signup_cpa_raw: number;
  conversions: number;
  revenue_local: number;
  revenue_krw: number | null; // null if sheet has no separate KRW revenue column
  roas_raw: number;
}

/**
 * Result of syncing a single Google Sheet to `ad_raw`.
 */
export interface SheetSyncResult {
  sheetSourceId: number;
  sheetName: string;
  status: "success" | "failed" | "partial";
  rowsFetched: number;
  rowsUpserted: number;
  rowsSkipped: number;
  durationMs: number;
  error?: string;
}

/**
 * Aggregated result of a full sync run across all sheets.
 */
export interface SyncRunResult {
  totalSheets: number;
  successful: number;
  failed: number;
  partial: number;
  results: SheetSyncResult[];
  totalDurationMs: number;
}

/**
 * Row from the `sheet_source` table.
 * Column names match `supabase/schema.sql` exactly (snake_case).
 */
export interface SheetSource {
  id: number;
  name: string;
  sheet_id: string;
  tab_name: string;
  header_row: number;
  country_code: string;
  currency_local: string;
  is_active: boolean;
  created_at: string; // ISO timestamptz
  updated_at: string; // ISO timestamptz
}
