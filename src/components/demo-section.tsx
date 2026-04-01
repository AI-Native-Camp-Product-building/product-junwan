"use client";

import * as React from "react";
import { FilterBar } from "@/components/filter-bar";
import { KpiCards } from "@/components/kpi-cards";
import { RoasAreaChart } from "@/components/area-chart";
import { MediumBarChart } from "@/components/bar-chart";
import { GoalRadialChart } from "@/components/radial-chart";
import { DataTable } from "@/components/data-table";
import { InsightsCard } from "@/components/insights-card";
import { sampleData, getMonths } from "@/data/sample";
import { generateInsights } from "@/lib/insights";

export function DemoSection() {
  const months = getMonths();
  const [country, setCountry] = React.useState("all");
  const [month, setMonth] = React.useState(months[months.length - 1]);
  const [medium, setMedium] = React.useState("all");

  const filteredData = React.useMemo(() => {
    return sampleData.filter((row) => {
      if (country !== "all" && row.country !== country) return false;
      if (medium !== "all" && row.medium !== medium) return false;
      return true;
    });
  }, [country, medium]);

  const currentMonthData = React.useMemo(() => filteredData.filter((r) => r.month === month), [filteredData, month]);

  const previousMonthData = React.useMemo(() => {
    const ms = getMonths();
    const idx = ms.indexOf(month);
    const prev = idx > 0 ? ms[idx - 1] : null;
    if (!prev) return [];
    return filteredData.filter((r) => r.month === prev);
  }, [filteredData, month]);

  const insights = React.useMemo(() => generateInsights(filteredData, month), [filteredData, month]);

  return (
    <section id="demo" className="px-6 pb-10">
      <p className="text-sm text-muted-foreground font-medium mb-4">라이브 데모</p>
      <FilterBar country={country} month={month} medium={medium} onCountryChange={setCountry} onMonthChange={setMonth} onMediumChange={setMedium} />
      <div className="mt-6 grid gap-6">
        <KpiCards currentData={currentMonthData} previousData={previousMonthData} />
        <RoasAreaChart data={filteredData} />
        <div className="grid grid-cols-2 gap-4">
          <MediumBarChart data={currentMonthData} />
          <GoalRadialChart data={currentMonthData} />
        </div>
        <DataTable data={currentMonthData} />
        <InsightsCard insights={insights} />
      </div>
    </section>
  );
}
