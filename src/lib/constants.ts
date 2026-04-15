/** Country name → flag emoji mapping. Single source of truth. */
export const COUNTRY_FLAGS: Record<string, string> = {
  "레진 KR": "\u{1F1F0}\u{1F1F7}",
  "봄툰 KR": "\u{1F1F0}\u{1F1F7}",
  "KR_레진": "\u{1F1F0}\u{1F1F7}",
  "KR_봄툰": "\u{1F1F0}\u{1F1F7}",
  US: "\u{1F1FA}\u{1F1F8}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
  TH: "\u{1F1F9}\u{1F1ED}",
  TW: "\u{1F1F9}\u{1F1FC}",
  ES: "\u{1F1EA}\u{1F1F8}",
};

/** Country name → fixed chart color mapping. */
export const COUNTRY_COLORS: Record<string, string> = {
  "레진 KR": "hsl(220, 70%, 55%)",   // 파랑
  "봄툰 KR": "hsl(280, 60%, 55%)",   // 보라
  US:         "hsl(0, 70%, 55%)",     // 빨강
  DE:         "hsl(35, 90%, 55%)",    // 주황
  FR:         "hsl(200, 80%, 50%)",   // 하늘
  TH:         "hsl(145, 60%, 45%)",   // 초록
  TW:         "hsl(330, 65%, 55%)",   // 핑크
  ES:         "hsl(60, 70%, 45%)",    // 올리브
};

/** Get fixed color for a country, fallback to index-based. */
const FALLBACK_COLORS = [
  "hsl(180, 60%, 45%)",
  "hsl(15, 75%, 50%)",
  "hsl(250, 50%, 60%)",
  "hsl(90, 50%, 45%)",
];

export function getCountryColor(name: string, index: number): string {
  return COUNTRY_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/** Heatmap background color based on value intensity within a min/max range. */
export function getHeatmapBg(
  value: number,
  min: number,
  max: number,
  maxOpacity = 0.25,
): string {
  if (max === min) return "";
  const intensity = (value - min) / (max - min);
  return `hsl(var(--chart-1) / ${(intensity * maxOpacity).toFixed(3)})`;
}
