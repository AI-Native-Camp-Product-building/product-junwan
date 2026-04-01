export type Country = {
  code: string;
  name: string;
  currency: string;
  locale: string;
  sheetUrl: string;
};

export const countries: Country[] = [
  { code: "KR", name: "한국", currency: "KRW", locale: "ko-KR", sheetUrl: "" },
  { code: "JP", name: "일본", currency: "JPY", locale: "ja-JP", sheetUrl: "" },
  { code: "US", name: "미국", currency: "USD", locale: "en-US", sheetUrl: "" },
];
