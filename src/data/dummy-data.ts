// =============================================================================
// Dummy Data for AdInsight Demo Deployment
// Deterministic generation using a simple seeded PRNG.
// =============================================================================

import type { AdRow, FilterOptions } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — deterministic across runs
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260406);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 1): number {
  return parseFloat((rand() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ---------------------------------------------------------------------------
// Dimension values
// ---------------------------------------------------------------------------
const COUNTRIES = [
  "레진 KR",
  "봄툰 KR",
  "US",
  "DE",
  "FR",
  "TH",
  "TW",
  "ES",
] as const;

const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04"] as const;

const MEDIUMS = [
  "Meta",
  "YouTube",
  "Google GDN",
  "X(Twitter)",
  "Pinterest",
  "TikTok",
  "Snapchat",
] as const;

const GOALS = ["결제", "첫결제", "가입", "가입&결제"] as const;

const CREATIVE_TYPES = [
  "이미지",
  "영상",
  "카드뉴스",
  "GIF",
  "캐러셀",
] as const;

const CREATIVE_NAMES = [
  "다이아몬드더스트",
  "블루라이트",
  "렌탈걸즈",
  "하렘의남자",
  "재벌집막내아들",
  "황제의외동딸",
  "나혼자만레벨업",
  "신의탑",
  "갓오브하이스쿨",
  "여신강림",
  "외모지상주의",
  "프리드로우",
  "선천적얼간이들",
  "취사병전설이되다",
  "템빨",
  "전지적독자시점",
  "사신소년",
  "언덕위의제임스",
  "마루는강쥐",
  "호랑이형님",
  "연애혁명",
  "독립일기",
  "바른연애길잡이",
  "퀘스트지상주의",
] as const;

const CURRENCY_MAP: Record<string, string> = {
  "레진 KR": "KRW",
  "봄툰 KR": "KRW",
  US: "USD",
  DE: "EUR",
  FR: "EUR",
  TH: "THB",
  TW: "TWD",
  ES: "EUR",
};

const EXCHANGE_RATES: Record<string, number> = {
  KRW: 1,
  USD: 1350,
  EUR: 1480,
  THB: 38,
  TWD: 43,
};

// ---------------------------------------------------------------------------
// Days per month helper
// ---------------------------------------------------------------------------
function daysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function randomDate(monthStr: string): string {
  const days = daysInMonth(monthStr);
  const day = randInt(1, days);
  return `${monthStr}-${String(day).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Generate rows
// ---------------------------------------------------------------------------
const rows: AdRow[] = [];
let idCounter = 1;

for (let i = 0; i < 300; i++) {
  const country = pick(COUNTRIES);
  const month = pick(MONTHS);
  const date = randomDate(month);
  const medium = pick(MEDIUMS);
  const goal = pick(GOALS);
  const creativeType = pick(CREATIVE_TYPES);
  const creativeName = pick(CREATIVE_NAMES);
  const currency = CURRENCY_MAP[country];
  const exchangeRate = EXCHANGE_RATES[currency];

  // Realistic metric generation
  const adSpendLocal = randInt(10000, 2000000);
  const adSpend = Math.round(adSpendLocal * exchangeRate);
  const impressions = randInt(1000, 500000);
  const clicks = randInt(
    Math.max(1, Math.floor(impressions * 0.005)),
    Math.floor(impressions * 0.08)
  );
  const ctr = randFloat(0.3, 8.0, 2);
  const signups = randInt(0, Math.max(1, Math.floor(clicks * 0.15)));
  const signupCpa = signups > 0 ? Math.round(adSpend / signups) : 0;
  const conversions = randInt(0, Math.max(1, Math.floor(signups * 0.6)));
  const revenue = conversions > 0
    ? randInt(Math.floor(adSpend * 0.3), Math.floor(adSpend * 4.0))
    : 0;
  const roas = adSpend > 0 ? randFloat(0, 500, 1) : 0;

  rows.push({
    id: `demo-${String(idCounter++).padStart(4, "0")}`,
    country,
    month,
    date,
    medium,
    goal,
    creativeType,
    creativeName,
    adSpend,
    adSpendLocal,
    currency,
    impressions,
    clicks,
    ctr,
    signups,
    signupCpa,
    conversions,
    revenue,
    roas,
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const DUMMY_ROWS: AdRow[] = rows;

export const DUMMY_FILTER_OPTIONS: FilterOptions = {
  countries: [...new Set(rows.map((r) => r.country))].sort(),
  months: [...new Set(rows.map((r) => r.month))].sort(),
  mediums: [...new Set(rows.map((r) => r.medium))].sort(),
  goals: [...new Set(rows.map((r) => r.goal))].sort(),
  creativeTypes: [],
  creativeNames: [],
};
