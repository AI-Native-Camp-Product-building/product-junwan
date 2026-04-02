import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const [platformsRes, mediumsRes] = await Promise.all([
      supabase
        .from("sheet_source")
        .select("name, currency_local, country_code")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("medium_map")
        .select("normalized")
        .neq("normalized", "none"),
    ]);

    if (platformsRes.error) throw new Error(platformsRes.error.message);
    if (mediumsRes.error) throw new Error(mediumsRes.error.message);

    const platformMap = new Map<string, { name: string; currency: string; countryCode: string }>();
    for (const row of platformsRes.data ?? []) {
      const name = String(row.name);
      if (!platformMap.has(name)) {
        platformMap.set(name, {
          name,
          currency: String(row.currency_local ?? "KRW"),
          countryCode: String(row.country_code ?? ""),
        });
      }
    }
    const platforms = [...platformMap.values()].sort((a, b) => a.name.localeCompare(b.name));

    const mediumSet = new Set<string>();
    for (const row of mediumsRes.data ?? []) {
      const val = String(row.normalized ?? "");
      if (val && val !== "none") mediumSet.add(val);
    }
    const mediums = [...mediumSet].sort();

    return NextResponse.json(
      { platforms, mediums },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=120" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "ServerError", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
