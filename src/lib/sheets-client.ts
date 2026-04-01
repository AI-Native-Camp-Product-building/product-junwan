// =============================================================================
// Google Sheets API Client — AdInsight
// Authenticates with a GCP service account and reads sheet data.
// SERVER ONLY — never import from client components.
// =============================================================================

import { google, sheets_v4 } from "googleapis";
import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SheetReadOptions {
  spreadsheetId: string;
  tabName: string;
  range?: string; // A1 notation override. Default: entire tab.
}

export interface SheetReadResult {
  values: (string | number | null)[][]; // 2D cell values from Sheets API
  totalRows: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SheetsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetsAuthError";
  }
}

export class SheetsReadError extends Error {
  constructor(
    message: string,
    public readonly sheetId?: string,
  ) {
    super(message);
    this.name = "SheetsReadError";
  }
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * Creates an authenticated Google Sheets API v4 client using a service account.
 *
 * Reads the service account JSON from the path specified by
 * `GOOGLE_SERVICE_ACCOUNT_PATH` env var, falling back to
 * `credentials/service-account.json` at the project root.
 *
 * The client is scoped to read-only access.
 * A fresh client is created per call (suitable for serverless contexts).
 */
export async function createSheetsClient(): Promise<sheets_v4.Sheets> {
  const credPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
    join(process.cwd(), "credentials", "service-account.json");

  let credentials: Record<string, unknown>;
  try {
    const raw = readFileSync(credPath, "utf-8");
    credentials = JSON.parse(raw);
  } catch (err) {
    throw new SheetsAuthError(
      `Failed to read service account credentials from ${credPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new SheetsAuthError(
      "Service account JSON is missing client_email or private_key.",
    );
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email as string,
    key: credentials.private_key as string,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  try {
    await auth.authorize();
  } catch (err) {
    throw new SheetsAuthError(
      `Service account authorization failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return google.sheets({ version: "v4", auth });
}

// ---------------------------------------------------------------------------
// Sheet reader
// ---------------------------------------------------------------------------

/**
 * Reads all cell values from a specified sheet tab.
 *
 * Uses `UNFORMATTED_VALUE` so numbers come back as numbers (not
 * locale-formatted strings with commas), and `FORMATTED_STRING` for
 * date/time rendering so dates remain human-readable strings.
 *
 * Returns an empty result (not an error) for empty sheets.
 * Throws `SheetsReadError` with sheet context on API failure.
 */
export async function readSheet(
  options: SheetReadOptions,
): Promise<SheetReadResult> {
  const { spreadsheetId, tabName, range } = options;

  const sheetsClient = await createSheetsClient();
  const a1Range = range ? `'${tabName}'!${range}` : `'${tabName}'`;

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: a1Range,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const values = response.data.values ?? [];
    return {
      values,
      totalRows: values.length,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Sheets API error";
    throw new SheetsReadError(
      `Failed to read sheet "${tabName}" (${spreadsheetId}): ${message}`,
      spreadsheetId,
    );
  }
}
