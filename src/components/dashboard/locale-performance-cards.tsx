"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { AdRow } from "@/types/dashboard";
import { formatKrw, formatNumber, formatPercent } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LocalePerformanceCardsProps {
  data: AdRow[];
  isLoading: boolean;
}

interface MetricBucket {
  adSpend: number;
  impressions: number;
  clicks: number;
  signups: number;
  revenue: number;
}

interface LocaleCardData extends MetricBucket {
  country: string;
  rank: number;
  spendShare: number;
  ctr: number;
  payRoas: number | null;
  signupCpa: number | null;
  signupCpaMixed: boolean;
}

const EMPTY_BUCKET: MetricBucket = {
  adSpend: 0,
  impressions: 0,
  clicks: 0,
  signups: 0,
  revenue: 0,
};

function createBucket(): MetricBucket {
  return { ...EMPTY_BUCKET };
}

function addRow(bucket: MetricBucket, row: AdRow) {
  bucket.adSpend += row.adSpend;
  bucket.impressions += row.impressions;
  bucket.clicks += row.clicks;
  bucket.signups += row.signups;
  bucket.revenue += row.revenue;
}

function isPayGoal(goal: string): boolean {
  return goal === "결제" || goal === "첫결제";
}

function computeLocaleCards(data: AdRow[]): LocaleCardData[] {
  const totalSpend = data.reduce((sum, row) => sum + row.adSpend, 0);
  const byLocale = new Map<
    string,
    {
      total: MetricBucket;
      pay: MetricBucket;
      signup: MetricBucket;
      mixed: MetricBucket;
    }
  >();

  for (const row of data) {
    const bucket =
      byLocale.get(row.country) ??
      {
        total: createBucket(),
        pay: createBucket(),
        signup: createBucket(),
        mixed: createBucket(),
      };

    addRow(bucket.total, row);

    if (isPayGoal(row.goal)) {
      addRow(bucket.pay, row);
    } else if (row.goal === "가입") {
      addRow(bucket.signup, row);
    } else if (row.goal === "가입&결제") {
      addRow(bucket.mixed, row);
    }

    byLocale.set(row.country, bucket);
  }

  return [...byLocale.entries()]
    .map(([country, bucket]) => {
      const signupSource =
        bucket.signup.signups > 0 ? bucket.signup : bucket.mixed;

      return {
        country,
        rank: 0,
        ...bucket.total,
        spendShare:
          totalSpend > 0 ? (bucket.total.adSpend / totalSpend) * 100 : 0,
        ctr:
          bucket.total.impressions > 0
            ? (bucket.total.clicks / bucket.total.impressions) * 100
            : 0,
        payRoas:
          bucket.pay.adSpend > 0
            ? (bucket.pay.revenue / bucket.pay.adSpend) * 100
            : null,
        signupCpa:
          signupSource.signups > 0
            ? signupSource.adSpend / signupSource.signups
            : null,
        signupCpaMixed:
          bucket.signup.signups === 0 && bucket.mixed.signups > 0,
      };
    })
    .sort((a, b) => b.adSpend - a.adSpend)
    .map((locale, index) => ({ ...locale, rank: index + 1 }));
}

function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-dashed border-white/[0.08] py-2 first:border-t-0">
      <span className="min-w-0 text-sm text-muted-foreground">{label}</span>
      <span
        className={`shrink-0 text-right text-sm font-semibold tabular-nums ${
          valueClassName ?? ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function LocalePerformanceCards({
  data,
  isLoading,
}: LocalePerformanceCardsProps) {
  const locales = React.useMemo(() => computeLocaleCards(data), [data]);
  const searchParams = useSearchParams();

  const buildLocaleHref = React.useCallback(
    (locale: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("locale", locale);
      params.delete("countries");
      params.delete("platform");
      return `/dashboard/locale?${params.toString()}`;
    },
    [searchParams],
  );

  if (isLoading) {
    return (
      <section className="px-4 lg:px-6">
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
          <CardHeader>
            <CardTitle>로케일별 성과</CardTitle>
            <CardDescription>
              현재 필터 기준으로 국가별 핵심 지표를 요약합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-52 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (locales.length === 0) {
    return (
      <section className="px-4 lg:px-6">
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
          <CardHeader>
            <CardTitle>로케일별 성과</CardTitle>
            <CardDescription>
              현재 필터 기준으로 국가별 핵심 지표를 요약합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border/70 py-12 text-sm text-muted-foreground">
              표시할 로케일 데이터가 없습니다.
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="px-4 lg:px-6">
      <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>로케일별 성과</CardTitle>
          <CardDescription>
            현재 필터 기준으로 광고비 비중, CTR, 결제 ROAS, 가입 CPA를
            비교합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {locales.map((locale) => (
                <Link
                  key={locale.country}
                  href={buildLocaleHref(locale.country)}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 shadow-sm backdrop-blur-[12px] transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
                  aria-label={`${locale.country} 로케일 상세 보기`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className="truncate text-lg font-semibold text-foreground"
                      >
                        {locale.country}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        광고비 #{locale.rank} · 전체의{" "}
                        {formatPercent(locale.spendShare)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <StatRow label="광고비" value={formatKrw(locale.adSpend)} />
                    <StatRow label="CTR" value={formatPercent(locale.ctr)} />
                    <StatRow
                      label="결제 ROAS"
                      value={
                        locale.payRoas == null
                          ? "-"
                          : formatPercent(locale.payRoas)
                      }
                      valueClassName={
                        locale.payRoas == null
                          ? ""
                          : locale.payRoas >= 100
                            ? "text-[hsl(160,60%,45%)]"
                            : "text-[hsl(0,72%,51%)]"
                      }
                    />
                    <StatRow
                      label={
                        <span>
                          가입 CPA
                          {locale.signupCpaMixed ? (
                            <span className="ml-1 text-xs font-semibold text-muted-foreground">
                              혼합
                            </span>
                          ) : null}
                        </span>
                      }
                      value={
                        locale.signupCpa == null
                          ? "-"
                          : formatKrw(locale.signupCpa)
                      }
                    />
                    <StatRow
                      label="회원가입"
                      value={`${formatNumber(locale.signups)}건`}
                    />
                  </div>
                </Link>
              ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
