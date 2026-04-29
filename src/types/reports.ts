export interface ReportFilters {
  countries: string[];
  mediums: string[];
  goals: string[];
  startDate?: string;
  endDate?: string;
}

export interface ReportBucket {
  adSpend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  signups: number;
  conversions: number;
  ctr: number;
  roas: number;
  signupCpa: number | null;
}

export interface ReportGroupRow extends ReportBucket {
  name: string;
  country?: string;
  goal?: string;
}

export interface WeeklyReportRow extends ReportBucket {
  week: string;
}

export interface LocaleReport {
  locale: string;
  filters: ReportFilters;
  total: ReportBucket;
  payTotal: ReportBucket;
  goals: ReportGroupRow[];
  weekly: WeeklyReportRow[];
  allTitles: ReportGroupRow[];
  payTitles: ReportGroupRow[];
  signupTitles: ReportGroupRow[];
  creativeTypes: ReportGroupRow[];
  creativeTypeMatrix: ReportGroupRow[];
  mediums: ReportGroupRow[];
  mediumMatrix: ReportGroupRow[];
  executedAt: string;
}

export type TitlePeriodMode = "all" | "month" | "week";

export interface TitlePeriodOption {
  value: string;
  label: string;
}

export interface TitlesReport {
  filters: ReportFilters;
  periodMode: TitlePeriodMode;
  period: string;
  periodOptions: TitlePeriodOption[];
  allTitles: ReportGroupRow[];
  payTitles: ReportGroupRow[];
  signupTitles: ReportGroupRow[];
  topSpend: ReportGroupRow | null;
  topRoas: ReportGroupRow | null;
  topCpa: ReportGroupRow | null;
  executedAt: string;
}

export interface OverviewLocaleCard extends ReportBucket {
  country: string;
  rank: number;
  spendShare: number;
  payRoas: number | null;
  signupCpaMixed: boolean;
}

export interface OverviewTrendPoint {
  period: string;
  [countryOrTotal: string]: string | number | undefined;
}

export interface OverviewReport {
  filters: ReportFilters;
  kpiSummary: KpiSummary;
  total: ReportBucket;
  localeCards: OverviewLocaleCard[];
  trend: {
    adSpend: OverviewTrendPoint[];
    signups: OverviewTrendPoint[];
    revenue: OverviewTrendPoint[];
    roas: OverviewTrendPoint[];
    signupCpa: OverviewTrendPoint[];
  };
  mediumSpend: ReportGroupRow[];
  mediumSummary: ReportGroupRow[];
  countrySummary: ReportGroupRow[];
  creativeRanking: ReportGroupRow[];
  executedAt: string;
}
import type { KpiSummary } from "@/types/dashboard";
