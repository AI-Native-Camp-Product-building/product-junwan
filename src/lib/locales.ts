export const LOCALES = [
  "봄툰 KR",
  "레진 KR",
  "US",
  "TW",
  "FR",
  "ES",
  "DE",
  "TH",
] as const;

export type LocaleName = (typeof LOCALES)[number];

export function isKnownLocale(value: string | null | undefined): value is LocaleName {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function getDefaultLocale(value?: string | null): LocaleName {
  return isKnownLocale(value) ? value : "봄툰 KR";
}
