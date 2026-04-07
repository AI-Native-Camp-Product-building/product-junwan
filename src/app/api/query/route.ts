import { NextRequest, NextResponse } from "next/server";
import { executeQuery, QueryValidationError } from "@/lib/query-engine";
import type { QueryDefinition } from "@/types/query";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QueryDefinition;

    const result = await executeQuery(body);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    if (error instanceof QueryValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/query] Error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
