/**
 * Build a URL to /dashboard/explore with pre-filled query params.
 * Used by dashboard charts' "탐색에서 자세히 보기" links.
 *
 * Default `dateRange`: current month start → today (e.g. 2026-04-01 ~ 2026-04-29).
 * Pass `dateRange: null` to explicitly disable.
 */
export function buildExploreUrl(params: {
  dimensions?: string[];
  metrics?: string[];
  filters?: Array<{ field: string; operator: string; value: string | string[] }>;
  sort?: { field: string; direction: string };
  dateRange?: { start: string; end: string } | null;
}): string {
  const sp = new URLSearchParams();

  if (params.dimensions?.length) sp.set("dims", params.dimensions.join(","));
  if (params.metrics?.length) sp.set("metrics", params.metrics.join(","));
  if (params.sort) sp.set("sort", `${params.sort.field}:${params.sort.direction}`);

  if (params.filters?.length) {
    sp.set("filters", JSON.stringify(params.filters));
  }

  const dateRange = params.dateRange === undefined ? getCurrentMonthToToday() : params.dateRange;
  if (dateRange) {
    sp.set("dateRange", `${dateRange.start}:${dateRange.end}`);
  }

  return `/dashboard/explore?${sp.toString()}`;
}

function getCurrentMonthToToday(): { start: string; end: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${d}` };
}
