// =============================================================================
// Sheets Parser — AdInsight
// Header parsing + row normalization for the Google Sheets → Supabase pipeline.
// Handles per-sheet structural differences (header variations, currency columns).
// =============================================================================

import type { AdRawInsert, ColumnMapping } from "@/types/sync";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HeaderParseError extends Error {
  constructor(
    message: string,
    public readonly sheetName: string,
  ) {
    super(message);
    this.name = "HeaderParseError";
  }
}

// ---------------------------------------------------------------------------
// Header pattern definitions
// ---------------------------------------------------------------------------

// Each entry: [list of possible header strings, target field in ColumnMapping]
// Order matters for disambiguation — more specific patterns come first.
const HEADER_PATTERNS: [string[], keyof ColumnMapping][] = [
  // Month / date / dimensions
  [["월별"], "month_raw"],
  [["일자"], "date_raw"],
  [["매체"], "medium_raw"],
  [["목표"], "goal_raw"],
  [["소재종류"], "creative_type_raw"],
  [["소재 (작품명)", "소재(작품명)", "소재"], "creative_name"],

  // Ad spend — specific currency variants first
  [["광고비(USD)", "광고비(유로)"], "ad_spend_local"],
  [["광고비(KRW)"], "ad_spend_krw"],
  // Generic "광고비" and "원화" are handled in a second pass (see below)

  // Impressions / clicks / performance
  [["노출수"], "impressions"],
  [["클릭"], "clicks"],
  [["CTR"], "ctr_raw"],
  [["회원가입"], "signups"],
  [["가입CPA"], "signup_cpa_raw"],
  [["결제전환"], "conversions"],
  [["ROAS"], "roas_raw"],

  // Revenue — specific currency variants first
  [["결제금액(USD)"], "revenue_local"],
  [["결제금액(KRW)"], "revenue_krw"],
  [["결제금액 원화"], "revenue_krw"],
  // Generic "결제금액" is handled in a second pass
];

// ---------------------------------------------------------------------------
// parseHeaders
// ---------------------------------------------------------------------------

/**
 * Maps header strings to column indices for the given sheet.
 *
 * Handles all known header variations across KR, US, DE, FR, TH, TW, ES sheets.
 * Throws `HeaderParseError` if required columns (month, date, medium) are missing.
 */
export function parseHeaders(
  headerRow: (string | number | null)[],
  sheetName: string,
): ColumnMapping {
  // Normalise header cells to trimmed strings
  const headers = headerRow.map((h) =>
    h != null ? String(h).trim() : "",
  );

  // Result accumulator — start everything at -1 (not found)
  const mapping: Record<keyof ColumnMapping, number> = {
    month_raw: -1,
    date_raw: -1,
    medium_raw: -1,
    goal_raw: -1,
    creative_type_raw: -1,
    creative_name: -1,
    ad_spend_local: -1,
    ad_spend_krw: -1,
    impressions: -1,
    clicks: -1,
    ctr_raw: -1,
    signups: -1,
    signup_cpa_raw: -1,
    conversions: -1,
    revenue_local: -1,
    revenue_krw: -1,
    roas_raw: -1,
  };

  // Assigned columns (so we don't double-map the same column)
  const assigned = new Set<number>();

  // ── First pass: match specific header patterns ──
  for (const [patterns, field] of HEADER_PATTERNS) {
    if (mapping[field] !== -1) continue; // already found
    for (let i = 0; i < headers.length; i++) {
      if (assigned.has(i)) continue;
      if (patterns.includes(headers[i])) {
        mapping[field] = i;
        assigned.add(i);
        break;
      }
    }
  }

  // ── Second pass: handle generic "광고비" and "원화" ──
  // These appear in KR/DE(원화)/FR/TH/TW/ES sheets where the specific
  // (USD)/(KRW)/(유로) suffixes are absent.
  for (let i = 0; i < headers.length; i++) {
    if (assigned.has(i)) continue;

    if (headers[i] === "광고비" && mapping.ad_spend_local === -1) {
      mapping.ad_spend_local = i;
      assigned.add(i);
    } else if (headers[i] === "원화" && mapping.ad_spend_krw === -1) {
      mapping.ad_spend_krw = i;
      assigned.add(i);
    }
  }

  // ── Third pass: handle generic "결제금액" ──
  // If we already have revenue_local from a specific pattern (e.g. 결제금액(USD)),
  // skip. Otherwise the first unassigned "결제금액" becomes revenue_local.
  // If revenue_local is already assigned and another "결제금액" exists, it could
  // be revenue_krw (FR pattern: 결제금액 + 결제금액 원화).
  for (let i = 0; i < headers.length; i++) {
    if (assigned.has(i)) continue;

    if (headers[i] === "결제금액") {
      if (mapping.revenue_local === -1) {
        mapping.revenue_local = i;
        assigned.add(i);
      }
      // Do not assign a second "결제금액" automatically — "결제금액 원화"
      // is already handled in the first pass.
    }
  }

  // ── For KR sheets where 광고비 = 원화 (ad_spend_local == ad_spend_krw) ──
  // If ad_spend_krw is still missing but we're on a KR sheet where 광고비 IS KRW,
  // then ad_spend_local already holds the KRW amount. The 원화 column
  // was found and assigned to ad_spend_krw in the second pass.
  // No extra logic needed — the two-pass approach handles this correctly.

  // ── For sheets without a separate revenue_krw column ──
  // This is expected for KR/DE/TH/TW/ES — revenue_local is in KRW already,
  // or there is no KRW conversion column.

  // ── Validation: required fields ──
  const required: (keyof ColumnMapping)[] = [
    "month_raw",
    "date_raw",
    "medium_raw",
  ];
  const missing = required.filter((f) => mapping[f] === -1);
  if (missing.length > 0) {
    throw new HeaderParseError(
      `Missing required columns [${missing.join(", ")}] in headers: [${headers.join(" | ")}]`,
      sheetName,
    );
  }

  // Warn about missing optional columns (but don't throw)
  const optional: (keyof ColumnMapping)[] = [
    "ad_spend_local",
    "ad_spend_krw",
    "revenue_local",
  ];
  for (const field of optional) {
    if (mapping[field] === -1) {
      console.warn(
        `[sheets-parser] Sheet "${sheetName}": optional column "${field}" not found in headers.`,
      );
    }
  }

  // Convert revenue_krw -1 to null (it's legitimately absent for most sheets)
  const result: ColumnMapping = {
    ...mapping,
    revenue_krw: mapping.revenue_krw === -1 ? null : mapping.revenue_krw,
  };

  return result;
}

// ---------------------------------------------------------------------------
// Numeric parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parses a cell value as a number.
 * - Strips commas and whitespace from strings ("1,234,567" -> 1234567)
 * - Strips trailing % from percentage strings ("3.2%" -> 3.2)
 * - Returns null for empty, non-parseable, or non-numeric values
 * - Passes through numbers directly
 */
function parseNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value === "string") {
    // Strip whitespace, commas, and trailing %
    let cleaned = value.trim().replace(/,/g, "").replace(/%$/, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;

    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Parses a cell value as an integer.
 */
function parseInteger(value: unknown): number | null {
  const num = parseNumeric(value);
  return num != null ? Math.round(num) : null;
}

/**
 * Extracts a string value from a cell. Returns null for empty/whitespace.
 */
function parseString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

/**
 * Parses a date_raw cell. Returns null for placeholders like "." that
 * would fail PostgreSQL date casting in the ad_normalized view.
 */
function parseDateString(value: unknown): string | null {
  const s = parseString(value);
  if (s == null) return null;
  // Only accept YYYY-MM-DD format; reject ".", "-", etc.
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// ---------------------------------------------------------------------------
// Month normalization
// ---------------------------------------------------------------------------

/**
 * Normalises month strings to YYYY-MM format.
 * - "2026년 1월" -> "2026-01"
 * - "2026-01" -> "2026-01" (passthrough)
 * - Anything else -> passthrough as-is
 */
function normalizeMonth(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;

  // Match Korean month format: "2026년 1월" or "2026년 12월"
  const koreanMatch = s.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (koreanMatch) {
    const year = koreanMatch[1];
    const month = koreanMatch[2].padStart(2, "0");
    return `${year}-${month}`;
  }

  return s;
}

// ---------------------------------------------------------------------------
// parseRow
// ---------------------------------------------------------------------------

/**
 * Extracts values from a single sheet row using the column mapping.
 * Returns null for completely empty rows.
 *
 * Numeric cells that are empty or unparseable become null (not 0).
 * CTR and ROAS values are stored as-is (the ad_normalized view handles
 * any further normalization).
 */
export function parseRow(
  row: (string | number | null)[],
  mapping: ColumnMapping,
  sheetSourceId: number,
  rowNumber: number,
  syncRunId: number | null,
): AdRawInsert | null {
  if (isEmptyRow(row)) return null;

  const cell = (idx: number | null): unknown => {
    if (idx == null || idx === -1 || idx >= row.length) return null;
    return row[idx];
  };

  return {
    sheet_source_id: sheetSourceId,
    sheet_row_number: rowNumber,
    month_raw: normalizeMonth(cell(mapping.month_raw)),
    date_raw: parseDateString(cell(mapping.date_raw)),
    medium_raw: parseString(cell(mapping.medium_raw)),
    goal_raw: parseString(cell(mapping.goal_raw)),
    creative_type_raw: parseString(cell(mapping.creative_type_raw)),
    creative_name: parseString(cell(mapping.creative_name)),
    ad_spend_local: parseNumeric(cell(mapping.ad_spend_local)),
    ad_spend_krw: parseNumeric(cell(mapping.ad_spend_krw)),
    revenue_local: parseNumeric(cell(mapping.revenue_local)),
    revenue_krw: mapping.revenue_krw != null
      ? parseNumeric(cell(mapping.revenue_krw))
      : null,
    impressions: parseInteger(cell(mapping.impressions)),
    clicks: parseInteger(cell(mapping.clicks)),
    ctr_raw: parseNumeric(cell(mapping.ctr_raw)),
    signups: parseInteger(cell(mapping.signups)),
    signup_cpa_raw: parseNumeric(cell(mapping.signup_cpa_raw)),
    conversions: parseInteger(cell(mapping.conversions)),
    roas_raw: parseNumeric(cell(mapping.roas_raw)),
    sync_run_id: syncRunId,
  };
}

// ---------------------------------------------------------------------------
// isEmptyRow
// ---------------------------------------------------------------------------

/**
 * Returns true if all cells in the row are empty, null, undefined,
 * or whitespace-only strings. Used to skip blank rows between data sections.
 */
export function isEmptyRow(row: (string | number | null)[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every((cell) => {
    if (cell == null) return true;
    if (typeof cell === "string") return cell.trim() === "";
    return false; // a number (even 0) means the row is not empty
  });
}
