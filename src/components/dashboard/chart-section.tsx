import type { RoasTrendPoint, MediumSpendPoint } from "@/types/dashboard";
import { RoasAreaChart } from "@/components/dashboard/roas-area-chart";
import { MediumBarChart } from "@/components/dashboard/medium-bar-chart";

interface ChartSectionProps {
  roasTrendData: RoasTrendPoint[];
  mediumSpendData: MediumSpendPoint[];
  countries: string[];
  isLoading: boolean;
}

export function ChartSection({
  roasTrendData,
  mediumSpendData,
  countries,
  isLoading,
}: ChartSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-7 lg:px-6">
      <div className="lg:col-span-4">
        <RoasAreaChart
          data={roasTrendData}
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
