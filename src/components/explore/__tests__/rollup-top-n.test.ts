import { describe, it, expect } from "vitest";
import { collapseToTopN } from "../explore-chart";

describe("collapseToTopN", () => {
  it("keeps rows unchanged when cardinality <= limit", () => {
    const rows = [
      { creative_name: "A", date: "2026-04-01", revenue_krw: 100 },
      { creative_name: "B", date: "2026-04-01", revenue_krw: 50 },
    ];
    const out = collapseToTopN(rows, "creative_name", "revenue_krw", 10);
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.creative_name !== "기타")).toBe(true);
  });

  it("collapses bottom rows to '기타' when cardinality > limit", () => {
    const rows = [
      { creative_name: "A", date: "2026-04-01", revenue_krw: 1000 },
      { creative_name: "B", date: "2026-04-01", revenue_krw: 500 },
      { creative_name: "C", date: "2026-04-01", revenue_krw: 10 },
      { creative_name: "D", date: "2026-04-01", revenue_krw: 5 },
    ];
    const out = collapseToTopN(rows, "creative_name", "revenue_krw", 2);
    const names = out.map((r) => r.creative_name);
    expect(names).toContain("A");
    expect(names).toContain("B");
    expect(names.filter((n) => n === "기타")).toHaveLength(2);
  });
});
