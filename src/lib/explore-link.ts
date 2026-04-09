/**
 * Build a URL to /dashboard/explore with pre-filled query params.
 * Used by dashboard charts' "탐색에서 자세히 보기" links.
 */
export function buildExploreUrl(params: {
  dimensions?: string[];
  metrics?: string[];
  filters?: Array<{ field: string; operator: string; value: string | string[] }>;
  sort?: { field: string; direction: string };
}): string {
  const sp = new URLSearchParams();

  if (params.dimensions?.length) sp.set("dims", params.dimensions.join(","));
  if (params.metrics?.length) sp.set("metrics", params.metrics.join(","));
  if (params.sort) sp.set("sort", `${params.sort.field}:${params.sort.direction}`);

  if (params.filters?.length) {
    sp.set("filters", JSON.stringify(params.filters));
  }

  return `/dashboard/explore?${sp.toString()}`;
}
