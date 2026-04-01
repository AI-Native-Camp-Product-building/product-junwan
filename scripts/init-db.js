#!/usr/bin/env node
/**
 * init-db.js — Execute schema.sql against the Supabase PostgreSQL database.
 *
 * Usage (pick one):
 *
 *   Option A: Supabase CLI with access token
 *     export SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx
 *     npx supabase link --project-ref sevvypxiyqhnvgdzdghz
 *     npx supabase db query -f supabase/schema.sql --linked
 *
 *   Option B: Direct PostgreSQL connection (this script)
 *     export DATABASE_URL="postgresql://postgres.sevvypxiyqhnvgdzdghz:[YOUR_DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
 *     node scripts/init-db.js
 *
 *   Option C: Paste into Supabase Dashboard > SQL Editor
 *     Copy the contents of supabase/schema.sql and paste into the SQL Editor at:
 *     https://supabase.com/dashboard/project/sevvypxiyqhnvgdzdghz/sql/new
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      "ERROR: DATABASE_URL environment variable is required.\n\n" +
        "Set it to your Supabase PostgreSQL connection string:\n" +
        '  export DATABASE_URL="postgresql://postgres.sevvypxiyqhnvgdzdghz:[YOUR_DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"\n\n' +
        "You can find the connection string in Supabase Dashboard > Settings > Database.\n" +
        "Alternatively, paste supabase/schema.sql into the SQL Editor at:\n" +
        "  https://supabase.com/dashboard/project/sevvypxiyqhnvgdzdghz/sql/new"
    );
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  console.log(`Read schema from ${schemaPath} (${sql.length} bytes)`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to Supabase PostgreSQL...");
    await client.connect();
    console.log("Connected. Executing schema...");

    await client.query(sql);
    console.log("Schema executed successfully.");

    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log("\nCreated tables:");
    tables.rows.forEach((r) => console.log(`  - ${r.table_name}`));

    const views = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("\nCreated views:");
    views.rows.forEach((r) => console.log(`  - ${r.table_name}`));

    // Verify seed data
    const sheetSources = await client.query(
      "SELECT name, country_code FROM public.sheet_source ORDER BY id"
    );
    console.log("\nSeeded sheet_source rows:");
    sheetSources.rows.forEach((r) =>
      console.log(`  - ${r.name} (${r.country_code})`)
    );

    const mediumCount = await client.query(
      "SELECT count(*) FROM public.medium_map"
    );
    const goalCount = await client.query(
      "SELECT count(*) FROM public.goal_map"
    );
    const creativeCount = await client.query(
      "SELECT count(*) FROM public.creative_type_map"
    );
    console.log(
      `\nSeeded mapping rows: medium_map=${mediumCount.rows[0].count}, goal_map=${goalCount.rows[0].count}, creative_type_map=${creativeCount.rows[0].count}`
    );

    console.log("\nDone. All tables, views, indexes, RLS policies, and seed data are in place.");
  } catch (err) {
    console.error("ERROR executing schema:", err.message);
    if (err.position) {
      const pos = parseInt(err.position, 10);
      const context = sql.substring(Math.max(0, pos - 100), pos + 100);
      console.error(`\nContext around error position ${pos}:\n...${context}...`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
