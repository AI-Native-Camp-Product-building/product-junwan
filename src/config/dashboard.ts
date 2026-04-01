export const dashboardConfig = {
  kpiCards: ["adSpend", "revenue", "roas", "signups"] as const,
  mainChart: {
    type: "area" as const,
    metric: "roas",
    period: 6,
  },
  subCharts: [
    { type: "bar" as const, metric: "adSpend", title: "매체별 성과" },
    { type: "radial" as const, metric: "roas", title: "목표 달성률" },
  ],
  table: {
    columns: ["adSpend", "revenue", "roas", "signupCpa"] as const,
    sortBy: "roas",
  },
};
