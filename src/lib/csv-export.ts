import type { AdRow } from "@/types/dashboard";

const CSV_HEADERS: { key: keyof AdRow; label: string }[] = [
  { key: "country", label: "국가" },
  { key: "month", label: "월" },
  { key: "date", label: "일자" },
  { key: "medium", label: "매체" },
  { key: "goal", label: "목표" },
  { key: "creativeType", label: "소재종류" },
  { key: "creativeName", label: "작품명" },
  { key: "adSpend", label: "광고비" },
  { key: "adSpendLocal", label: "원화(외화)" },
  { key: "currency", label: "통화" },
  { key: "impressions", label: "노출수" },
  { key: "clicks", label: "클릭" },
  { key: "ctr", label: "CTR" },
  { key: "signups", label: "회원가입" },
  { key: "signupCpa", label: "가입CPA" },
  { key: "conversions", label: "결제전환" },
  { key: "revenue", label: "결제금액" },
  { key: "roas", label: "ROAS" },
];

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(data: AdRow[], filename: string): void {
  const header = CSV_HEADERS.map((h) => h.label).join(",");
  const rows = data.map((row) =>
    CSV_HEADERS.map((h) => escapeCsvCell(row[h.key])).join(",")
  );

  // UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csv = BOM + [header, ...rows].join("\n");

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
