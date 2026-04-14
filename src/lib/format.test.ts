import { describe, it, expect } from "vitest";
import { formatKrw, formatPercent, formatNumber } from "./format";

describe("formatKrw", () => {
  it("formats large numbers with full precision", () => {
    expect(formatKrw(150_000_000)).toBe("₩150,000,000");
  });

  it("formats ten-thousands with commas", () => {
    expect(formatKrw(59_277_939)).toBe("₩59,277,939");
  });

  it("formats small numbers with comma grouping", () => {
    expect(formatKrw(1234)).toBe("₩1,234");
  });

  it("handles zero", () => {
    expect(formatKrw(0)).toBe("₩0");
  });

  it("handles negative values", () => {
    expect(formatKrw(-200_000_000)).toBe("₩-200,000,000");
  });
});

describe("formatPercent", () => {
  it("formats with 1 decimal", () => {
    expect(formatPercent(18.29)).toBe("18.3%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatNumber", () => {
  it("formats with Korean locale grouping", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("rounds decimals", () => {
    expect(formatNumber(99.7)).toBe("100");
  });
});
