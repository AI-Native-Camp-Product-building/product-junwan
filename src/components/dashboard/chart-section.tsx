import type { TrendPoint, MediumSpendPoint } from "@/types/dashboard";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { MediumBarChart } from "@/components/dashboard/medium-bar-chart";

type MetricKey = "adSpend" | "signups" | "revenue" | "roas";

interface ChartSectionProps {
  trendData: Record<MetricKey, TrendPoint[]>;
  mediumSpendData: MediumSpendPoint[];
  countries: string[];
  isLoading: boolean;
}

export function ChartSection({
  trendData,
  mediumSpendData,
  countries,
  isLoading,
}: ChartSectionProps) {
  const hasNoTrendData = Object.values(trendData).every((arr) => arr.length === 0);
  const isEmpty = hasNoTrendData && mediumSpendData.length === 0;

  if (isEmpty && !isLoading) {
    return (
      <div className="flex items-center justify-center px-4 py-16 lg:px-6">
        <p className="text-sm text-muted-foreground">
          차트를 표시할 데이터가 없습니다. 사이드바에서 데이터 동기화를
          실행해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-7 lg:px-6">
      <div className="lg:col-span-4">
        <TrendChart
          trendData={trendData}
          countries={countries}
          isLoading={isLoading}
        />
      </div>
      <div className="lg:col-span-3">
        <MediumBarChart data={mediumSpendData} isLoading={isLoading} />
      </div>
    </div>
  );
}
