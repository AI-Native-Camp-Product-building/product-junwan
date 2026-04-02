// =============================================================================
// Query Views — AdInsight
// TypeScript wrappers for the 6 summary view RPC functions in queries.sql.
// Uses the anon Supabase client (RLS allows public read).
// =============================================================================

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Base metrics shared across most views. */
interface BaseMetrics {
  sheet_name: string;
  ad_spend_krw: number;
  revenue_krw: number;
  roas: number;
  signups: number;
  conversions: number;
  signup_cpa: number;
}

/** Comparison columns for WoW / MoM views. */
interface ComparisonMetrics {
  prev_ad_spend_krw: number;
  prev_revenue_krw: number;
  prev_roas: number;
  prev_signups: number;
  prev_conversions: number;
  prev_signup_cpa: number;
  spend_change_pct: number | null;
  roas_change_pp: number | null;
}

// ---------------------------------------------------------------------------
// View 1: 주간_로케일별
// ---------------------------------------------------------------------------

export interface WeeklyByLocaleRow extends BaseMetrics, ComparisonMetrics {}

export async function fetchWeeklyByLocale(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyByLocaleRow[]> {
  const { data, error } = await supabase.rpc("weekly_by_locale", {
    p_week_start: weekStart,
    p_week_end: weekEnd,
  });

  if (error) {
    throw new Error(`weekly_by_locale error: ${error.message}`);
  }

  return (data ?? []) as WeeklyByLocaleRow[];
}

// ---------------------------------------------------------------------------
// View 2: 주간_매체별
// ---------------------------------------------------------------------------

export interface WeeklyByMediumRow extends BaseMetrics {
  medium: string;
}

export async function fetchWeeklyByMedium(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyByMediumRow[]> {
  const { data, error } = await supabase.rpc("weekly_by_medium", {
    p_week_start: weekStart,
    p_week_end: weekEnd,
  });

  if (error) {
    throw new Error(`weekly_by_medium error: ${error.message}`);
  }

  return (data ?? []) as WeeklyByMediumRow[];
}

// ---------------------------------------------------------------------------
// View 3: 주간_목표별
// ---------------------------------------------------------------------------

export interface WeeklyByGoalRow extends BaseMetrics {
  goal: string;
}

export async function fetchWeeklyByGoal(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyByGoalRow[]> {
  const { data, error } = await supabase.rpc("weekly_by_goal", {
    p_week_start: weekStart,
    p_week_end: weekEnd,
  });

  if (error) {
    throw new Error(`weekly_by_goal error: ${error.message}`);
  }

  return (data ?? []) as WeeklyByGoalRow[];
}

// ---------------------------------------------------------------------------
// View 4: 월간_로케일별
// ---------------------------------------------------------------------------

export interface MonthlyByLocaleRow extends BaseMetrics, ComparisonMetrics {}

export async function fetchMonthlyByLocale(
  month: string,
): Promise<MonthlyByLocaleRow[]> {
  const { data, error } = await supabase.rpc("monthly_by_locale", {
    p_month: month,
  });

  if (error) {
    throw new Error(`monthly_by_locale error: ${error.message}`);
  }

  return (data ?? []) as MonthlyByLocaleRow[];
}

// ---------------------------------------------------------------------------
// View 5a: 작품별_효율 — 결제 캠페인 ROAS 상위
// ---------------------------------------------------------------------------

export interface CreativeRoasRow {
  rank_num: number;
  sheet_name: string;
  creative_name: string;
  ad_spend_krw: number;
  revenue_krw: number;
  roas: number;
  conversions: number;
}

export async function fetchCreativeRoasRanking(
  weekStart: string,
  weekEnd: string,
  limit = 50,
): Promise<CreativeRoasRow[]> {
  const { data, error } = await supabase.rpc("creative_roas_ranking", {
    p_week_start: weekStart,
    p_week_end: weekEnd,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`creative_roas_ranking error: ${error.message}`);
  }

  return (data ?? []) as CreativeRoasRow[];
}

// ---------------------------------------------------------------------------
// View 5b: 작품별_효율 — 가입 캠페인 CPA 현황
// ---------------------------------------------------------------------------

export interface CreativeCpaRow {
  rank_num: number;
  sheet_name: string;
  creative_name: string;
  ad_spend_krw: number;
  signups: number;
  signup_cpa: number;
}

export async function fetchCreativeCpaRanking(
  weekStart: string,
  weekEnd: string,
  limit = 50,
): Promise<CreativeCpaRow[]> {
  const { data, error } = await supabase.rpc("creative_cpa_ranking", {
    p_week_start: weekStart,
    p_week_end: weekEnd,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`creative_cpa_ranking error: ${error.message}`);
  }

  return (data ?? []) as CreativeCpaRow[];
}

// ---------------------------------------------------------------------------
// View 6: 원본_마스터
// ---------------------------------------------------------------------------

export interface WeeklyMasterRow extends BaseMetrics {
  medium: string;
  impressions: number;
  avg_ctr: number;
}

export async function fetchWeeklyMaster(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyMasterRow[]> {
  const { data, error } = await supabase.rpc("weekly_master", {
    p_week_start: weekStart,
    p_week_end: weekEnd,
  });

  if (error) {
    throw new Error(`weekly_master error: ${error.message}`);
  }

  return (data ?? []) as WeeklyMasterRow[];
}

// ---------------------------------------------------------------------------
// Utility: Available weeks
// ---------------------------------------------------------------------------

export interface AvailableWeek {
  week_start: string;
  week_end: string;
  week_label: string;
  row_count: number;
}

export async function fetchAvailableWeeks(): Promise<AvailableWeek[]> {
  const { data, error } = await supabase.rpc("available_weeks");

  if (error) {
    throw new Error(`available_weeks error: ${error.message}`);
  }

  return (data ?? []) as AvailableWeek[];
}

// ---------------------------------------------------------------------------
// Utility: Available months
// ---------------------------------------------------------------------------

export interface AvailableMonth {
  month_value: string;
  row_count: number;
}

export async function fetchAvailableMonths(): Promise<AvailableMonth[]> {
  const { data, error } = await supabase.rpc("available_months");

  if (error) {
    throw new Error(`available_months error: ${error.message}`);
  }

  return (data ?? []) as AvailableMonth[];
}

// ---------------------------------------------------------------------------
// Convenience: Fetch all weekly views for a given week at once
// ---------------------------------------------------------------------------

export interface WeeklyReport {
  byLocale: WeeklyByLocaleRow[];
  byMedium: WeeklyByMediumRow[];
  byGoal: WeeklyByGoalRow[];
  creativeRoas: CreativeRoasRow[];
  creativeCpa: CreativeCpaRow[];
  master: WeeklyMasterRow[];
}

/**
 * Fetch all 6 weekly views in parallel for a given date range.
 * Useful for pre-loading the full summary dashboard.
 */
export async function fetchWeeklyReport(
  weekStart: string,
  weekEnd: string,
): Promise<WeeklyReport> {
  const [byLocale, byMedium, byGoal, creativeRoas, creativeCpa, master] =
    await Promise.all([
      fetchWeeklyByLocale(weekStart, weekEnd),
      fetchWeeklyByMedium(weekStart, weekEnd),
      fetchWeeklyByGoal(weekStart, weekEnd),
      fetchCreativeRoasRanking(weekStart, weekEnd),
      fetchCreativeCpaRanking(weekStart, weekEnd),
      fetchWeeklyMaster(weekStart, weekEnd),
    ]);

  return { byLocale, byMedium, byGoal, creativeRoas, creativeCpa, master };
}
