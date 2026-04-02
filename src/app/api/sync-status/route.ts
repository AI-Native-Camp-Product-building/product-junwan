import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sheet_sync_latest")
      .select(
        "sync_id, sheet_source_id, sheet_name, status, rows_fetched, rows_upserted, started_at, finished_at, duration_ms, error_message",
      );

    if (error) {
      return NextResponse.json(
        { error: "QueryError", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sheets: data ?? [],
      queriedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "ServerError",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
