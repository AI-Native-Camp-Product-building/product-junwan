import { NextResponse } from "next/server";
import { syncAllSheets } from "@/lib/sheets-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await syncAllSheets();
    const allFailed =
      result.totalSheets > 0 && result.failed === result.totalSheets;

    if (allFailed) {
      return NextResponse.json(
        {
          error: "SyncFailed",
          message: "All sheets failed to sync.",
          result,
        },
        { status: 500 },
      );
    }

    const status = result.failed > 0 || result.partial > 0 ? 207 : 200;
    return NextResponse.json({ success: true, result }, { status });
  } catch (err) {
    return NextResponse.json(
      {
        error: "SyncFailed",
        message: err instanceof Error ? err.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
