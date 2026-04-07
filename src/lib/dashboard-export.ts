import type { AdRow } from "@/types/dashboard";

interface CsvColumn {
  label: string;
  accessor: (row: AdRow) => string | number;
}

function getConversionCpa(row: AdRow): number {
  return row.conversions > 0 ? row.adSpend / row.conversions : 0;
}

function getConversionCvr(row: AdRow): number {
  return row.clicks > 0 ? (row.conversions / row.clicks) * 100 : 0;
}

// KEYWORD: dashboard-csv-derived-metrics
const DASHBOARD_CSV_COLUMNS: CsvColumn[] = [
  { label: "국가", accessor: (row) => row.country },
  { label: "월", accessor: (row) => row.month },
  { label: "일자", accessor: (row) => row.date },
  { label: "매체", accessor: (row) => row.medium },
  { label: "목표", accessor: (row) => row.goal },
  { label: "소재종류", accessor: (row) => row.creativeType },
  { label: "소재명", accessor: (row) => row.creativeName },
  { label: "광고비(KRW)", accessor: (row) => row.adSpend },
  { label: "광고비(현지통화)", accessor: (row) => row.adSpendLocal },
  { label: "통화", accessor: (row) => row.currency },
  { label: "노출수", accessor: (row) => row.impressions },
  { label: "클릭수", accessor: (row) => row.clicks },
  { label: "CTR", accessor: (row) => row.ctr },
  { label: "회원가입", accessor: (row) => row.signups },
  { label: "가입 CPA", accessor: (row) => row.signupCpa },
  { label: "결제전환", accessor: (row) => row.conversions },
  { label: "결제 CPA", accessor: (row) => getConversionCpa(row) },
  { label: "결제 CVR", accessor: (row) => getConversionCvr(row) },
  { label: "결제금액", accessor: (row) => row.revenue },
  { label: "ROAS", accessor: (row) => row.roas },
];

function escapeCsvCell(value: unknown): string {
  const stringValue = String(value ?? "");
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function exportDashboardRowsToCsv(data: AdRow[], filename: string): void {
  const header = DASHBOARD_CSV_COLUMNS.map((column) => column.label).join(",");
  const rows = data.map((row) =>
    DASHBOARD_CSV_COLUMNS.map((column) =>
      escapeCsvCell(column.accessor(row)),
    ).join(","),
  );

  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
