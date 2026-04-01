import { type Country } from "@/config/countries";

export function formatCurrency(value: number, country: Country): string {
  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    maximumFractionDigits: 0,
    notation: value >= 100_000_000 ? "compact" : "standard",
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatChangeRate(current: number, previous: number): string {
  if (previous === 0) return "N/A";
  const rate = ((current - previous) / previous) * 100;
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}
