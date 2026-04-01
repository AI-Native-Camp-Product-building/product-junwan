export type SampleDataRow = {
  month: string;
  country: string;
  medium: string;
  adSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  signups: number;
  signupCpa: number;
  conversions: number;
  revenue: number;
  roas: number;
};

// 3 countries × 6 months × 2 mediums = 36 rows
// KR: Meta + Google, ROAS 310–380%, adSpend 8M–16M KRW
// JP: Meta + Google, ROAS 275–340%, adSpend 6.5M–11.5M KRW
// US: Meta + TikTok, ROAS 340–470%, adSpend 3.5M–9M KRW
// General upward trend over 2025-10 → 2026-03

export const sampleData: SampleDataRow[] = [
  // ── KR / Meta ──────────────────────────────────────────────────────────
  { month: "2025-10", country: "KR", medium: "Meta",   adSpend: 8_200_000,  impressions: 1_840_000, clicks: 36_800, ctr: 2.0, signups: 820,  signupCpa: 10_000, conversions: 246, revenue: 25_420_000, roas: 310 },
  { month: "2025-11", country: "KR", medium: "Meta",   adSpend: 9_100_000,  impressions: 2_002_000, clicks: 41_000, ctr: 2.0, signups: 910,  signupCpa: 10_000, conversions: 282, revenue: 29_120_000, roas: 320 },
  { month: "2025-12", country: "KR", medium: "Meta",   adSpend: 10_500_000, impressions: 2_310_000, clicks: 47_250, ctr: 2.0, signups: 1_050, signupCpa: 10_000, conversions: 336, revenue: 34_650_000, roas: 330 },
  { month: "2026-01", country: "KR", medium: "Meta",   adSpend: 11_800_000, impressions: 2_596_000, clicks: 53_100, ctr: 2.0, signups: 1_180, signupCpa: 10_000, conversions: 390, revenue: 40_120_000, roas: 340 },
  { month: "2026-02", country: "KR", medium: "Meta",   adSpend: 13_200_000, impressions: 2_904_000, clicks: 59_400, ctr: 2.0, signups: 1_320, signupCpa: 10_000, conversions: 449, revenue: 46_200_000, roas: 350 },
  { month: "2026-03", country: "KR", medium: "Meta",   adSpend: 15_000_000, impressions: 3_300_000, clicks: 67_500, ctr: 2.0, signups: 1_500, signupCpa: 10_000, conversions: 525, revenue: 54_000_000, roas: 360 },

  // ── KR / Google ────────────────────────────────────────────────────────
  { month: "2025-10", country: "KR", medium: "Google", adSpend: 8_500_000,  impressions: 1_190_000, clicks: 42_500, ctr: 3.6, signups: 765,  signupCpa: 11_111, conversions: 263, revenue: 26_775_000, roas: 315 },
  { month: "2025-11", country: "KR", medium: "Google", adSpend: 9_400_000,  impressions: 1_316_000, clicks: 47_000, ctr: 3.6, signups: 846,  signupCpa: 11_111, conversions: 301, revenue: 30_550_000, roas: 325 },
  { month: "2025-12", country: "KR", medium: "Google", adSpend: 10_800_000, impressions: 1_512_000, clicks: 54_000, ctr: 3.6, signups: 972,  signupCpa: 11_111, conversions: 357, revenue: 36_720_000, roas: 340 },
  { month: "2026-01", country: "KR", medium: "Google", adSpend: 12_100_000, impressions: 1_694_000, clicks: 60_500, ctr: 3.6, signups: 1_089, signupCpa: 11_111, conversions: 412, revenue: 42_350_000, roas: 350 },
  { month: "2026-02", country: "KR", medium: "Google", adSpend: 13_700_000, impressions: 1_918_000, clicks: 68_500, ctr: 3.6, signups: 1_233, signupCpa: 11_111, conversions: 479, revenue: 49_320_000, roas: 360 },
  { month: "2026-03", country: "KR", medium: "Google", adSpend: 15_800_000, impressions: 2_212_000, clicks: 79_000, ctr: 3.6, signups: 1_422, signupCpa: 11_111, conversions: 569, revenue: 59_250_000, roas: 375 },

  // ── JP / Meta ──────────────────────────────────────────────────────────
  { month: "2025-10", country: "JP", medium: "Meta",   adSpend: 6_500_000,  impressions: 1_430_000, clicks: 26_000, ctr: 1.8, signups: 585,  signupCpa: 11_111, conversions: 175, revenue: 17_875_000, roas: 275 },
  { month: "2025-11", country: "JP", medium: "Meta",   adSpend: 7_200_000,  impressions: 1_584_000, clicks: 28_800, ctr: 1.8, signups: 648,  signupCpa: 11_111, conversions: 202, revenue: 20_880_000, roas: 290 },
  { month: "2025-12", country: "JP", medium: "Meta",   adSpend: 8_100_000,  impressions: 1_782_000, clicks: 32_400, ctr: 1.8, signups: 729,  signupCpa: 11_111, conversions: 235, revenue: 24_300_000, roas: 300 },
  { month: "2026-01", country: "JP", medium: "Meta",   adSpend: 8_900_000,  impressions: 1_958_000, clicks: 35_600, ctr: 1.8, signups: 801,  signupCpa: 11_111, conversions: 267, revenue: 27_590_000, roas: 310 },
  { month: "2026-02", country: "JP", medium: "Meta",   adSpend: 10_000_000, impressions: 2_200_000, clicks: 40_000, ctr: 1.8, signups: 900,  signupCpa: 11_111, conversions: 310, revenue: 32_000_000, roas: 320 },
  { month: "2026-03", country: "JP", medium: "Meta",   adSpend: 11_000_000, impressions: 2_420_000, clicks: 44_000, ctr: 1.8, signups: 990,  signupCpa: 11_111, conversions: 352, revenue: 36_300_000, roas: 330 },

  // ── JP / Google ────────────────────────────────────────────────────────
  { month: "2025-10", country: "JP", medium: "Google", adSpend: 6_800_000,  impressions:   952_000, clicks: 28_560, ctr: 3.0, signups: 544,  signupCpa: 12_500, conversions: 188, revenue: 19_040_000, roas: 280 },
  { month: "2025-11", country: "JP", medium: "Google", adSpend: 7_500_000,  impressions: 1_050_000, clicks: 31_500, ctr: 3.0, signups: 600,  signupCpa: 12_500, conversions: 217, revenue: 21_750_000, roas: 290 },
  { month: "2025-12", country: "JP", medium: "Google", adSpend: 8_400_000,  impressions: 1_176_000, clicks: 35_280, ctr: 3.0, signups: 672,  signupCpa: 12_500, conversions: 252, revenue: 25_200_000, roas: 300 },
  { month: "2026-01", country: "JP", medium: "Google", adSpend: 9_200_000,  impressions: 1_288_000, clicks: 38_640, ctr: 3.0, signups: 736,  signupCpa: 12_500, conversions: 285, revenue: 28_520_000, roas: 310 },
  { month: "2026-02", country: "JP", medium: "Google", adSpend: 10_300_000, impressions: 1_442_000, clicks: 43_260, ctr: 3.0, signups: 824,  signupCpa: 12_500, conversions: 329, revenue: 33_472_000, roas: 325 },
  { month: "2026-03", country: "JP", medium: "Google", adSpend: 11_500_000, impressions: 1_610_000, clicks: 48_300, ctr: 3.0, signups: 920,  signupCpa: 12_500, conversions: 379, revenue: 38_640_000, roas: 336 },

  // ── US / Meta ──────────────────────────────────────────────────────────
  { month: "2025-10", country: "US", medium: "Meta",   adSpend: 3_500_000,  impressions:   910_000, clicks: 18_200, ctr: 2.0, signups: 350,  signupCpa: 10_000, conversions: 119, revenue: 11_900_000, roas: 340 },
  { month: "2025-11", country: "US", medium: "Meta",   adSpend: 4_200_000,  impressions: 1_092_000, clicks: 21_840, ctr: 2.0, signups: 420,  signupCpa: 10_000, conversions: 147, revenue: 14_700_000, roas: 350 },
  { month: "2025-12", country: "US", medium: "Meta",   adSpend: 5_100_000,  impressions: 1_326_000, clicks: 26_520, ctr: 2.0, signups: 510,  signupCpa: 10_000, conversions: 184, revenue: 18_360_000, roas: 360 },
  { month: "2026-01", country: "US", medium: "Meta",   adSpend: 6_000_000,  impressions: 1_560_000, clicks: 31_200, ctr: 2.0, signups: 600,  signupCpa: 10_000, conversions: 222, revenue: 22_200_000, roas: 370 },
  { month: "2026-02", country: "US", medium: "Meta",   adSpend: 7_200_000,  impressions: 1_872_000, clicks: 37_440, ctr: 2.0, signups: 720,  signupCpa: 10_000, conversions: 274, revenue: 27_936_000, roas: 388 },
  { month: "2026-03", country: "US", medium: "Meta",   adSpend: 8_500_000,  impressions: 2_210_000, clicks: 44_200, ctr: 2.0, signups: 850,  signupCpa: 10_000, conversions: 332, revenue: 34_850_000, roas: 410 },

  // ── US / TikTok ────────────────────────────────────────────────────────
  { month: "2025-10", country: "US", medium: "TikTok", adSpend: 3_800_000,  impressions: 1_900_000, clicks: 28_500, ctr: 1.5, signups: 342,  signupCpa: 11_111, conversions: 130, revenue: 13_300_000, roas: 350 },
  { month: "2025-11", country: "US", medium: "TikTok", adSpend: 4_500_000,  impressions: 2_250_000, clicks: 33_750, ctr: 1.5, signups: 405,  signupCpa: 11_111, conversions: 162, revenue: 16_875_000, roas: 375 },
  { month: "2025-12", country: "US", medium: "TikTok", adSpend: 5_400_000,  impressions: 2_700_000, clicks: 40_500, ctr: 1.5, signups: 486,  signupCpa: 11_111, conversions: 205, revenue: 21_600_000, roas: 400 },
  { month: "2026-01", country: "US", medium: "TikTok", adSpend: 6_300_000,  impressions: 3_150_000, clicks: 47_250, ctr: 1.5, signups: 567,  signupCpa: 11_111, conversions: 252, revenue: 26_460_000, roas: 420 },
  { month: "2026-02", country: "US", medium: "TikTok", adSpend: 7_500_000,  impressions: 3_750_000, clicks: 56_250, ctr: 1.5, signups: 675,  signupCpa: 11_111, conversions: 315, revenue: 33_750_000, roas: 450 },
  { month: "2026-03", country: "US", medium: "TikTok", adSpend: 9_000_000,  impressions: 4_500_000, clicks: 67_500, ctr: 1.5, signups: 810,  signupCpa: 11_111, conversions: 396, revenue: 42_300_000, roas: 470 },
];

export function getMonths(): string[] {
  return [...new Set(sampleData.map((d) => d.month))].sort();
}

export function getMediums(): string[] {
  return [...new Set(sampleData.map((d) => d.medium))].sort();
}
