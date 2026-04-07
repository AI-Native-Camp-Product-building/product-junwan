// =============================================================================
// Sheet Scanner — AdInsight Phase 0
// Reads all 8 Google Sheets, collects headers, data samples, mapping gaps.
// Run: npx tsx src/lib/scan-sheets.ts
// =============================================================================

import { google, sheets_v4 } from "googleapis";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SheetSource {
  name: string;
  sheetId: string;
  tabName: string;
  headerRow: number; // 1-based row number where headers live
  currency: string;
}

interface ScanResult {
  name: string;
  sheetId: string;
  configuredTabName: string;
  actualTabs: string[];
  tabMatch: boolean;
  headerRow: number;
  currency: string;
  rawHeaders: string[];
  headerMapping: Record<string, { index: number; matchedHeader: string }>;
  unmappedHeaders: { index: number; header: string }[];
  mappingRate: string; // e.g. "14/17"
  dataRowCount: number;
  totalRowsInSheet: number;
  uniqueMediums: string[];
  uniqueGoals: string[];
  uniqueCreativeTypes: string[];
  monthSamples: string[];
  dateSamples: string[];
  dateRange: { earliest: string | null; latest: string | null };
  sampleRows: Record<string, unknown>[];
  error?: string;
}

interface ScanReport {
  scanTimestamp: string;
  results: ScanResult[];
  unmappedMediums: string[];
  unmappedGoals: string[];
  unmappedCreativeTypes: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SHEET_SOURCES: SheetSource[] = [
  { name: "레진 KR", sheetId: "1HMyzye86YxhgdZ0bG1vYHb7QeJBi-oI_CGYacxXh2hE", tabName: "시트1", headerRow: 11, currency: "KRW" },
  { name: "봄툰 KR", sheetId: "1rr45aW4SP3Dqwd6grMVpDZohNw0RXfXtjWbfKXEUouU", tabName: "봄툰KR", headerRow: 10, currency: "KRW" },
  { name: "US", sheetId: "1xGGd_TY6iFCiyqEoVwMrYzACfpcBMSc8hnBd_qN6vjg", tabName: "시트1", headerRow: 11, currency: "USD" },
  { name: "DE", sheetId: "1eUMAADMhoRt5eZBq4iyIElgDTGxiPW9LFqyNl0VJ0t0", tabName: "시트1", headerRow: 10, currency: "EUR" },
  { name: "FR", sheetId: "1lirrJfP6duAPJB36-ybXR4_tLTFJwPylg6SwdAizc2w", tabName: "시트1", headerRow: 12, currency: "EUR" },
  { name: "TH", sheetId: "1CCisdkklYhSFRhEe1HvN-j9U6bWHAINqyEcP1hfnK0U", tabName: "시트1", headerRow: 10, currency: "THB" },
  { name: "TW", sheetId: "1zH-WAZyx_DGs9_8KykiVHWN-BCNvmODuTP_ean4cGdc", tabName: "시트1", headerRow: 10, currency: "TWD" },
  { name: "ES", sheetId: "1V_EpN-LfmKNnIuxJfRf8MJz304uZch4L27D-HCHezbw", tabName: "시트1", headerRow: 11, currency: "EUR" },
];

// Header patterns from sheets-parser.ts
const HEADER_PATTERNS: [string[], string][] = [
  [["월별"], "month_raw"],
  [["일자"], "date_raw"],
  [["매체"], "medium_raw"],
  [["목표"], "goal_raw"],
  [["소재종류"], "creative_type_raw"],
  [["소재 (작품명)", "소재(작품명)", "소재"], "creative_name"],
  [["광고비(USD)", "광고비(유로)"], "ad_spend_local"],
  [["광고비(KRW)"], "ad_spend_krw"],
  [["원화"], "ad_spend_krw"],
  [["광고비"], "ad_spend_local"],
  [["노출수"], "impressions"],
  [["클릭"], "clicks"],
  [["CTR"], "ctr_raw"],
  [["회원가입"], "signups"],
  [["가입CPA"], "signup_cpa_raw"],
  [["결제전환"], "conversions"],
  [["결제금액(USD)"], "revenue_local"],
  [["결제금액(KRW)"], "revenue_krw"],
  [["결제금액 원화"], "revenue_krw"],
  [["결제금액"], "revenue_local"],
  [["ROAS"], "roas_raw"],
];

// Known mapping values from schema.sql
const KNOWN_MEDIUMS = new Set(["메타", "Meta", "Facebook", "유튜브", "구글GDN", "트위터", "핀터레스트", "Pinterest", "TikTok Ads", "Snapchat", ".", ""]);
const KNOWN_GOALS = new Set(["결제", "구매", "첫결제", "가입", "가입&결제", ".", ""]);
const KNOWN_CREATIVE_TYPES = new Set([
  "영상(한익게)", "한익게", "PV", "영상(PV)", "영상(FB)", "영상(추천)", "영상(바이럴)",
  "이미지 (영화자막)", "캐러셀(영화자막)", "웹툰리뷰", "그 외 (챌린지 등)",
]);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function createSheetsClient(): Promise<sheets_v4.Sheets> {
  const credPath = join(process.cwd(), "credentials", "service-account.json");
  const raw = readFileSync(credPath, "utf-8");
  const credentials = JSON.parse(raw);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

// ---------------------------------------------------------------------------
// Header mapping logic
// ---------------------------------------------------------------------------

function mapHeaders(headerRow: string[]): {
  mapped: Record<string, { index: number; matchedHeader: string }>;
  unmapped: { index: number; header: string }[];
} {
  const mapped: Record<string, { index: number; matchedHeader: string }> = {};
  const assigned = new Set<number>();
  const assignedFields = new Set<string>();

  for (const [patterns, field] of HEADER_PATTERNS) {
    if (assignedFields.has(field)) continue;
    for (let i = 0; i < headerRow.length; i++) {
      if (assigned.has(i)) continue;
      const h = headerRow[i].trim();
      if (patterns.includes(h)) {
        mapped[field] = { index: i, matchedHeader: h };
        assigned.add(i);
        assignedFields.add(field);
        break;
      }
    }
  }

  const unmapped: { index: number; header: string }[] = [];
  for (let i = 0; i < headerRow.length; i++) {
    if (!assigned.has(i) && headerRow[i].trim() !== "") {
      unmapped.push({ index: i, header: headerRow[i].trim() });
    }
  }

  return { mapped, unmapped };
}

// ---------------------------------------------------------------------------
// Unique value collection
// ---------------------------------------------------------------------------

function collectUniques(
  rows: (string | number | null)[][],
  colIndex: number | undefined,
): string[] {
  if (colIndex === undefined || colIndex < 0) return [];
  const values = new Set<string>();
  for (const row of rows) {
    if (colIndex < row.length) {
      const v = row[colIndex];
      if (v != null && String(v).trim() !== "") {
        values.add(String(v).trim());
      }
    }
  }
  return Array.from(values).sort();
}

// ---------------------------------------------------------------------------
// Date range extraction
// ---------------------------------------------------------------------------

function extractDateRange(
  rows: (string | number | null)[][],
  dateColIndex: number | undefined,
  monthColIndex: number | undefined,
): { earliest: string | null; latest: string | null } {
  const dates: string[] = [];

  const colIdx = dateColIndex !== undefined && dateColIndex >= 0 ? dateColIndex : monthColIndex;
  if (colIdx === undefined || colIdx < 0) return { earliest: null, latest: null };

  for (const row of rows) {
    if (colIdx < row.length) {
      const v = row[colIdx];
      if (v != null && String(v).trim() !== "") {
        dates.push(String(v).trim());
      }
    }
  }

  if (dates.length === 0) return { earliest: null, latest: null };
  dates.sort();
  return { earliest: dates[0], latest: dates[dates.length - 1] };
}

// ---------------------------------------------------------------------------
// Sample collection (first few unique values from date/month columns)
// ---------------------------------------------------------------------------

function collectSamples(
  rows: (string | number | null)[][],
  colIndex: number | undefined,
  maxSamples: number = 10,
): string[] {
  if (colIndex === undefined || colIndex < 0) return [];
  const seen = new Set<string>();
  const samples: string[] = [];
  for (const row of rows) {
    if (colIndex < row.length) {
      const v = row[colIndex];
      if (v != null) {
        const s = String(v).trim();
        if (s !== "" && !seen.has(s)) {
          seen.add(s);
          samples.push(s);
          if (samples.length >= maxSamples) break;
        }
      }
    }
  }
  return samples;
}

// ---------------------------------------------------------------------------
// Scan a single sheet
// ---------------------------------------------------------------------------

async function scanSheet(
  client: sheets_v4.Sheets,
  source: SheetSource,
): Promise<ScanResult> {
  const result: ScanResult = {
    name: source.name,
    sheetId: source.sheetId,
    configuredTabName: source.tabName,
    actualTabs: [],
    tabMatch: false,
    headerRow: source.headerRow,
    currency: source.currency,
    rawHeaders: [],
    headerMapping: {},
    unmappedHeaders: [],
    mappingRate: "0/0",
    dataRowCount: 0,
    totalRowsInSheet: 0,
    uniqueMediums: [],
    uniqueGoals: [],
    uniqueCreativeTypes: [],
    monthSamples: [],
    dateSamples: [],
    dateRange: { earliest: null, latest: null },
    sampleRows: [],
  };

  try {
    // Step 1: Get spreadsheet metadata (tab names)
    const meta = await client.spreadsheets.get({
      spreadsheetId: source.sheetId,
      fields: "sheets.properties.title",
    });

    result.actualTabs = (meta.data.sheets ?? []).map(
      (s) => s.properties?.title ?? "<unknown>",
    );
    result.tabMatch = result.actualTabs.includes(source.tabName);

    if (!result.tabMatch) {
      result.error = `Tab "${source.tabName}" not found. Available: [${result.actualTabs.join(", ")}]`;
      // Try first tab as fallback for scanning
      if (result.actualTabs.length === 0) return result;
    }

    const tabToRead = result.tabMatch ? source.tabName : result.actualTabs[0];

    // Step 2: Read header row + up to 200 data rows
    // headerRow is 1-based. We read from row 1 to get full context.
    const maxDataRows = 200;
    const endRow = source.headerRow + maxDataRows;
    const range = `'${tabToRead}'!A1:ZZ${endRow}`;

    const response = await client.spreadsheets.values.get({
      spreadsheetId: source.sheetId,
      range,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const allRows = response.data.values ?? [];
    result.totalRowsInSheet = allRows.length;

    // Header row (0-indexed in array)
    const headerIdx = source.headerRow - 1;
    if (headerIdx >= allRows.length) {
      result.error = `Header row ${source.headerRow} exceeds sheet data (${allRows.length} rows)`;
      return result;
    }

    const rawHeaders = allRows[headerIdx].map((h: unknown) =>
      h != null ? String(h).trim() : "",
    );
    result.rawHeaders = rawHeaders;

    // Step 3: Map headers
    const { mapped, unmapped } = mapHeaders(rawHeaders);
    result.headerMapping = mapped;
    result.unmappedHeaders = unmapped;

    const totalNonEmpty = rawHeaders.filter((h: string) => h !== "").length;
    const mappedCount = Object.keys(mapped).length;
    result.mappingRate = `${mappedCount}/${totalNonEmpty}`;

    // Step 4: Data rows (everything after header)
    const dataRows = allRows.slice(headerIdx + 1).filter((row: unknown[]) => {
      // Skip completely empty rows
      return row.some((cell: unknown) => cell != null && String(cell).trim() !== "");
    });
    result.dataRowCount = dataRows.length;

    // Step 5: Collect unique values for dimension columns
    const mediumIdx = mapped["medium_raw"]?.index;
    const goalIdx = mapped["goal_raw"]?.index;
    const creativeTypeIdx = mapped["creative_type_raw"]?.index;
    const monthIdx = mapped["month_raw"]?.index;
    const dateIdx = mapped["date_raw"]?.index;

    result.uniqueMediums = collectUniques(dataRows, mediumIdx);
    result.uniqueGoals = collectUniques(dataRows, goalIdx);
    result.uniqueCreativeTypes = collectUniques(dataRows, creativeTypeIdx);

    // Step 6: Date/month samples
    result.monthSamples = collectSamples(dataRows, monthIdx);
    result.dateSamples = collectSamples(dataRows, dateIdx);
    result.dateRange = extractDateRange(dataRows, dateIdx, monthIdx);

    // Step 7: Sample rows (first 3 data rows as key-value objects)
    const sampleCount = Math.min(3, dataRows.length);
    for (let i = 0; i < sampleCount; i++) {
      const row = dataRows[i];
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < rawHeaders.length; j++) {
        if (rawHeaders[j] !== "") {
          obj[rawHeaders[j]] = j < row.length ? row[j] : null;
        }
      }
      result.sampleRows.push(obj);
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== AdInsight Sheet Scanner ===");
  console.log(`Scanning ${SHEET_SOURCES.length} sheets...\n`);

  const client = await createSheetsClient();
  console.log("Authenticated with Google Sheets API.\n");

  const results: ScanResult[] = [];

  for (const source of SHEET_SOURCES) {
    console.log(`Scanning: ${source.name} ...`);
    const result = await scanSheet(client, source);
    results.push(result);

    if (result.error) {
      console.log(`  ERROR: ${result.error}`);
    } else {
      console.log(`  Tab match: ${result.tabMatch}`);
      console.log(`  Headers: ${result.mappingRate} mapped`);
      console.log(`  Data rows: ${result.dataRowCount}`);
      console.log(`  Mediums: [${result.uniqueMediums.join(", ")}]`);
    }
    console.log();
  }

  // Aggregate unmapped values across all sheets
  const allMediums = new Set<string>();
  const allGoals = new Set<string>();
  const allCreativeTypes = new Set<string>();

  for (const r of results) {
    r.uniqueMediums.forEach((v) => allMediums.add(v));
    r.uniqueGoals.forEach((v) => allGoals.add(v));
    r.uniqueCreativeTypes.forEach((v) => allCreativeTypes.add(v));
  }

  const unmappedMediums = Array.from(allMediums).filter((v) => !KNOWN_MEDIUMS.has(v)).sort();
  const unmappedGoals = Array.from(allGoals).filter((v) => !KNOWN_GOALS.has(v)).sort();
  const unmappedCreativeTypes = Array.from(allCreativeTypes).filter((v) => !KNOWN_CREATIVE_TYPES.has(v)).sort();

  const report: ScanReport = {
    scanTimestamp: new Date().toISOString(),
    results,
    unmappedMediums,
    unmappedGoals,
    unmappedCreativeTypes,
  };

  // Write JSON output
  const outDir = join(process.cwd(), "docs", "superpowers", "specs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "sheet-scan-raw.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nJSON output written to: ${outPath}`);

  // Summary
  console.log("\n=== SUMMARY ===");
  console.log(`Total sheets scanned: ${results.length}`);
  console.log(`Successful: ${results.filter((r) => !r.error).length}`);
  console.log(`Errors: ${results.filter((r) => r.error).length}`);
  console.log(`Unmapped mediums: [${unmappedMediums.join(", ")}]`);
  console.log(`Unmapped goals: [${unmappedGoals.join(", ")}]`);
  console.log(`Unmapped creative types: [${unmappedCreativeTypes.join(", ")}]`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
