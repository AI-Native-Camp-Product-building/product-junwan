// =============================================================================
// AdInsight — Dummy Data Seeder
// Generates fake but realistic-looking ad performance data for all 8 locales.
// Structure matches real Google Sheets exactly. Data is entirely fabricated.
// =============================================================================

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load env
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─── Config ──────────────────────────────────────────────────────────────────

const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04"];

const LOCALES = [
  { name: "레진 KR", mediums: ["메타", "유튜브"], goals: ["결제", "가입&결제"], currency: "KRW", creativeTypes: ["영상(한익게)", "영상(FB)", "영상(추천)", "캐러셀(영화자막)"] },
  { name: "봄툰 KR", mediums: ["메타", "유튜브", "트위터", "핀터레스트"], goals: ["가입", "결제"], currency: "KRW", creativeTypes: ["영상(바이럴)", "영상(한익게)"] },
  { name: "US", mediums: ["Facebook", "TikTok Ads", "Pinterest", "Snapchat"], goals: ["가입", "구매"], currency: "USD", creativeTypes: ["한익게"] },
  { name: "DE", mediums: ["메타"], goals: ["결제"], currency: "EUR", creativeTypes: ["웹툰리뷰", "이미지 (영화자막)"] },
  { name: "FR", mediums: ["Meta", "TikTok Ads"], goals: ["가입", "구매", "첫결제"], currency: "EUR", creativeTypes: ["PV", "그 외 (챌린지 등)"] },
  { name: "TH", mediums: ["메타"], goals: ["결제"], currency: "THB", creativeTypes: ["이미지 (영화자막)"] },
  { name: "TW", mediums: ["구글GDN", "메타"], goals: ["가입", "결제"], currency: "TWD", creativeTypes: ["PV", "웹툰리뷰"] },
  { name: "ES", mediums: ["메타"], goals: ["가입&결제", "결제"], currency: "EUR", creativeTypes: ["영상(PV)"] },
];

// Fake creative names (작품명) pool
const CREATIVE_NAMES = [
  "블루라이트", "스타더스트", "문라이즈", "어반가든", "나이트폴",
  "크림슨타이드", "실버레인", "골든아워", "오션뷰", "스카이워커",
  "윈터소나타", "서머브리즈", "오텀리프", "스프링데이", "미드나잇",
  "새벽의노래", "황혼의빛", "별의시간", "달의그림자", "해의조각",
  "Mr.A's Farm", "Diamond Dust", "Love Remedy", "Backlight", "Toy Daddy",
  "Red Signal", "Ghost Town", "Silver Moon", "Dark Rose", "Crystal Clear",
  "Phantom", "Eclipse", "Nebula", "Cosmos", "Aurora",
  "Zenith", "Horizon", "Twilight", "Vertex", "Prism",
];

// Currency exchange rates (fake but plausible)
const FX_RATES = {
  KRW: 1,
  USD: 1350,
  EUR: 1480,
  THB: 38,
  TWD: 42,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDaysInMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// ─── Generator ───────────────────────────────────────────────────────────────

function generateRows(locale, sheetSourceId, rowsPerMonth = 40) {
  const rows = [];
  let rowNumber = 1;

  for (const month of MONTHS) {
    const daysInMonth = getDaysInMonth(month);
    const count = rand(Math.floor(rowsPerMonth * 0.8), Math.floor(rowsPerMonth * 1.2));

    for (let i = 0; i < count; i++) {
      const day = rand(1, daysInMonth);
      const dateStr = `${month}-${String(day).padStart(2, "0")}`;
      const medium = pick(locale.mediums);
      const goal = pick(locale.goals);
      const creativeType = pick(locale.creativeTypes);
      const creativeName = pick(CREATIVE_NAMES);

      // Generate realistic ad metrics
      const adSpendLocal = rand(10000, 2000000) / (locale.currency === "KRW" ? 1 : FX_RATES[locale.currency]);
      const adSpendKrw = locale.currency === "KRW" ? adSpendLocal : Math.round(adSpendLocal * FX_RATES[locale.currency]);
      const impressions = rand(500, 500000);
      const clicks = rand(Math.floor(impressions * 0.005), Math.floor(impressions * 0.15));
      const ctr = parseFloat(((clicks / impressions) * 100).toFixed(2));
      const signups = rand(0, Math.floor(clicks * 0.3));
      const signupCpa = signups > 0 ? Math.round(adSpendKrw / signups) : 0;
      const conversions = rand(0, Math.floor(signups * 0.8) + 1);
      const revenueLocal = conversions * rand(5000, 50000) / (locale.currency === "KRW" ? 1 : FX_RATES[locale.currency]);
      const revenueKrw = locale.currency === "KRW" ? revenueLocal : Math.round(revenueLocal * FX_RATES[locale.currency]);
      const roas = adSpendKrw > 0 ? parseFloat(((revenueKrw / adSpendKrw) * 100).toFixed(0)) : 0;

      // Format month for 봄툰 KR style
      const monthRaw = locale.name === "봄툰 KR"
        ? `${month.split("-")[0]}년 ${parseInt(month.split("-")[1])}월`
        : month;

      rows.push({
        sheet_source_id: sheetSourceId,
        sheet_row_number: rowNumber++,
        month_raw: monthRaw,
        date_raw: dateStr,
        medium_raw: medium,
        goal_raw: goal,
        creative_type_raw: creativeType,
        creative_name: creativeName,
        ad_spend_local: parseFloat(adSpendLocal.toFixed(2)),
        ad_spend_krw: parseFloat(adSpendKrw.toFixed(2)),
        revenue_local: parseFloat(revenueLocal.toFixed(2)),
        revenue_krw: parseFloat(revenueKrw.toFixed(2)),
        impressions,
        clicks,
        ctr_raw: ctr,
        signups,
        signup_cpa_raw: signupCpa,
        conversions,
        roas_raw: roas,
        sync_run_id: null,
      });
    }
  }

  return rows;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎲 AdInsight Dummy Data Seeder\n");

  // Get sheet_source IDs
  const { data: sources, error: srcErr } = await supabase
    .from("sheet_source")
    .select("id, name")
    .order("id");

  if (srcErr || !sources) {
    console.error("❌ Failed to fetch sheet_source:", srcErr);
    process.exit(1);
  }

  console.log(`📋 Found ${sources.length} sheet sources\n`);

  // Clear existing ad_raw data
  const { error: delErr } = await supabase
    .from("ad_raw")
    .delete()
    .gte("id", 0);

  if (delErr) {
    console.error("⚠️  Warning: Could not clear existing data:", delErr.message);
  } else {
    console.log("🗑️  Cleared existing ad_raw data\n");
  }

  let totalRows = 0;

  for (const source of sources) {
    const locale = LOCALES.find((l) => l.name === source.name);
    if (!locale) {
      console.log(`⏭️  Skipping ${source.name} — no locale config`);
      continue;
    }

    const rowsPerMonth = source.name === "TH" ? 25 : rand(30, 50);
    const rows = generateRows(locale, source.id, rowsPerMonth);

    // Batch insert (500 per batch)
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("ad_raw").upsert(batch, {
        onConflict: "sheet_source_id,sheet_row_number",
      });
      if (error) {
        console.error(`  ❌ Batch error for ${source.name}:`, error.message);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`  ✅ ${source.name}: ${inserted} rows (${locale.currency})`);
    totalRows += inserted;
  }

  console.log(`\n🎉 Done! Total: ${totalRows} dummy rows inserted.`);

  // Quick verification
  const { count } = await supabase
    .from("ad_raw")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Verified: ${count} rows in ad_raw`);
}

main().catch(console.error);
