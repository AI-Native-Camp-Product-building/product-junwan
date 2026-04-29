// =============================================================================
// Dashboard Types — AdInsight
// Frontend-facing types using camelCase conventions.
// Mirrors the ad_normalized view output and dashboard component props.
// =============================================================================

/**
 * Normalized row from the `ad_normalized` Supabase view.
 * All monetary values are in KRW unless suffixed with `Local`.
 */
export interface AdRow {
  id: string;
  country: string; // sheet_name: "레진 KR" | "봄툰 KR" | "US" | "DE" | "FR" | "TH" | "TW" | "ES"
  month: string; // "2026-01" (YYYY-MM normalized)
  date: string; // "2026-01-15" ISO date
  medium: string; // Normalized: "Meta" | "YouTube" | "Google GDN" | "X(Twitter)" | "Pinterest" | "TikTok" | "Snapchat"
  goal: string; // Normalized: "결제" | "첫결제" | "가입" | "가입&결제"
  creativeType: string; // 소재종류 (normalized)
  creativeName: string; // 소재 (작품명)
  adSpend: number; // KRW (원화 환산 완료)
  adSpendLocal: number; // 원래 통화 금액
  currency: string; // 원래 통화 코드
  impressions: number;
  clicks: number;
  ctr: number; // percentage
  signups: number;
  signupCpa: number; // KRW
  conversions: number; // 결제전환
  revenue: number; // KRW (원화 환산 완료)
  roas: number; // percentage
}

export type DateMode = "daily" | "weekly" | "monthly" | "custom";

export interface DateRange {
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string;   // ISO "YYYY-MM-DD"
}

/**
 * Dashboard filter state. Empty arrays mean "all" (no filter applied).
 */
export interface DashboardFilters {
  countries: string[]; // multi-select, empty = all
  months: string[];        // kept for backward compat
  mediums: string[]; // multi-select, empty = all
  goals: string[]; // multi-select, empty = all
  dateMode: DateMode;      // NEW
  dateRange: DateRange | null; // NEW — null means "all"
  startDate?: string;      // NEW — for API query (YYYY-MM-DD)
  endDate?: string;        // NEW — for API query (YYYY-MM-DD)
}

/**
 * KPI card summary data with month-over-month change rates.
 */
export interface KpiSummary {
  adSpend: number;
  revenue: number;
  roas: number;
  signups: number;
  conversions: number;
  adSpendChange: number; // MoM % change
  revenueChange: number;
  roasChange: number;
  signupsChange: number;
  conversionsChange: number;
  adSpendDelta: number;
  revenueDelta: number;
  roasDelta: number;
  signupsDelta: number;
  conversionsDelta: number;
}

/**
 * Area chart data point for ROAS trend over time.
 * Dynamic keys per country enable multi-line rendering.
 */
export interface RoasTrendPoint {
  month: string; // x-axis
  [country: string]: number | string; // dynamic keys per country for multi-line
}

export interface TrendPoint {
  period: string; // x-axis: "2026-01" or "2026-01-15"
  [countryOrTotal: string]: number | string | undefined;
}

/**
 * Bar chart data point for spend/revenue/ROAS by medium.
 */
export interface MediumSpendPoint {
  medium: string; // x-axis category
  adSpend: number;
  revenue: number;
  roas: number;
}

/**
 * Available filter options derived from the data set.
 * Passed from server component to the client shell.
 */
export interface FilterOptions {
  countries: string[];
  months: string[];
  mediums: string[];
  goals: string[];
  creativeTypes: string[];
  creativeNames: string[];
}

export interface Insight {
  type: "change" | "anomaly";
  severity: "positive" | "warning" | "danger";
  title: string;
  description: string;
  metric: string;
  country?: string;
  value: number;
  changePercent: number;
}
