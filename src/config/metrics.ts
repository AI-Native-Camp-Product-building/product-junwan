export type MetricFormat = "currency" | "percentage" | "number";

export type Metric = {
  key: string;
  label: string;
  format: MetricFormat;
  currencyAware: boolean;
};

export const metrics: Metric[] = [
  { key: "adSpend", label: "광고비", format: "currency", currencyAware: true },
  { key: "revenue", label: "결제금액", format: "currency", currencyAware: true },
  { key: "roas", label: "ROAS", format: "percentage", currencyAware: false },
  { key: "signups", label: "회원가입", format: "number", currencyAware: false },
  { key: "signupCpa", label: "가입CPA", format: "currency", currencyAware: true },
  { key: "impressions", label: "노출수", format: "number", currencyAware: false },
  { key: "clicks", label: "클릭", format: "number", currencyAware: false },
  { key: "ctr", label: "CTR", format: "percentage", currencyAware: false },
  { key: "conversions", label: "결제전환", format: "number", currencyAware: false },
];
