#!/usr/bin/env node
/**
 * verify-schema.js — Verify that the AdInsight schema was applied to Supabase.
 *
 * Uses the Supabase REST API (service_role key), so no DB password needed.
 *
 * Usage:
 *   node scripts/verify-schema.js
 */

const fs = require("fs");
const path = require("path");

// Load env from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function query(table, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "count=exact",
    },
  });
  const count = res.headers.get("content-range");
  const data = await res.json();
  return { status: res.status, count, data };
}

async function main() {
  console.log("Verifying AdInsight schema on Supabase...\n");
  console.log(`Project: ${SUPABASE_URL}\n`);

  const tables = [
    "sheet_source",
    "ad_raw",
    "medium_map",
    "goal_map",
    "creative_type_map",
    "sheet_sync_log",
  ];

  const views = ["ad_normalized", "sheet_sync_latest"];

  let allOk = true;

  // Check tables
  for (const table of tables) {
    try {
      const { status, count, data } = await query(table, "select=*&limit=0");
      if (status === 200) {
        const total = count ? count.split("/")[1] : "?";
        console.log(`  [OK] ${table} — ${total} rows`);
      } else {
        console.log(`  [FAIL] ${table} — HTTP ${status}: ${JSON.stringify(data)}`);
        allOk = false;
      }
    } catch (e) {
      console.log(`  [FAIL] ${table} — ${e.message}`);
      allOk = false;
    }
  }

  // Check views
  for (const view of views) {
    try {
      const { status, count, data } = await query(view, "select=*&limit=0");
      if (status === 200) {
        const total = count ? count.split("/")[1] : "?";
        console.log(`  [OK] ${view} (view) — ${total} rows`);
      } else {
        console.log(`  [FAIL] ${view} (view) — HTTP ${status}: ${JSON.stringify(data)}`);
        allOk = false;
      }
    } catch (e) {
      console.log(`  [FAIL] ${view} (view) — ${e.message}`);
      allOk = false;
    }
  }

  // Check seed data
  console.log("\nSeed data verification:");
  try {
    const { data: sources } = await query("sheet_source", "select=name,country_code&order=id");
    if (Array.isArray(sources) && sources.length > 0) {
      console.log(`  [OK] sheet_source — ${sources.length} rows:`);
      sources.forEach((s) => console.log(`        ${s.name} (${s.country_code})`));
    } else {
      console.log("  [WARN] sheet_source — no seed data found");
    }
  } catch (e) {
    console.log(`  [FAIL] sheet_source seed check — ${e.message}`);
  }

  try {
    const { data: mediums } = await query("medium_map", "select=raw_value,normalized&order=id");
    console.log(`  [OK] medium_map — ${mediums.length} mappings`);
  } catch (e) {
    console.log(`  [FAIL] medium_map seed check — ${e.message}`);
  }

  try {
    const { data: goals } = await query("goal_map", "select=raw_value,normalized&order=id");
    console.log(`  [OK] goal_map — ${goals.length} mappings`);
  } catch (e) {
    console.log(`  [FAIL] goal_map seed check — ${e.message}`);
  }

  try {
    const { data: creatives } = await query("creative_type_map", "select=raw_value,normalized&order=id");
    console.log(`  [OK] creative_type_map — ${creatives.length} mappings`);
  } catch (e) {
    console.log(`  [FAIL] creative_type_map seed check — ${e.message}`);
  }

  console.log(allOk ? "\nSchema verification PASSED." : "\nSchema verification FAILED. See errors above.");
  process.exit(allOk ? 0 : 1);
}

main();
