const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  // Read the SQL and extract the dynamic_aggregate function
  const fullSql = fs.readFileSync("supabase/queries.sql", "utf8");

  // Find the dynamic_aggregate section
  const startMarker = "drop function if exists public.dynamic_aggregate";
  const endMarker = "comment on function public.dynamic_aggregate";

  const startIdx = fullSql.indexOf(startMarker);
  const endIdx = fullSql.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find dynamic_aggregate in queries.sql");
    process.exit(1);
  }

  // Include the comment line too
  const endOfComment = fullSql.indexOf(";", endIdx) + 1;
  const sql = fullSql.substring(startIdx, endOfComment);

  console.log("Deploying dynamic_aggregate RPC...");
  console.log("SQL length:", sql.length, "chars");

  // Use the Supabase SQL endpoint (postgrest doesn't support DDL, use the pg endpoint)
  const res = await fetch(`${url}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({}),
  });

  // Alternative: use the supabase-js query method with raw SQL
  // Since supabase-js doesn't support raw DDL, let's use the pg_net extension or the management API

  // Actually, use the Supabase SQL API (requires service_role)
  const sqlRes = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!sqlRes.ok) {
    const body = await sqlRes.text();
    console.log("exec_sql not available, status:", sqlRes.status);
    console.log("Response:", body.substring(0, 200));
    console.log("\nPlease deploy manually:");
    console.log("1. Go to Supabase Dashboard > SQL Editor");
    console.log("2. Paste the following SQL and run it:");
    console.log("---");
    console.log(sql);
    process.exit(1);
  }

  console.log("Success!");
}

main().catch(console.error);
