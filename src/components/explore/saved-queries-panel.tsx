"use client";

import * as React from "react";
import {
  IconBookmarks,
  IconTrash,
  IconStar,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { SavedQuery, QueryDefinition } from "@/types/query";
import { DIMENSIONS, METRICS } from "@/config/query-schema";

export interface SavedQueriesPanelHandle {
  refetch: () => void;
}

interface SavedQueriesPanelProps {
  onLoad: (query: QueryDefinition) => void;
}

export const SavedQueriesPanel = React.forwardRef<
  SavedQueriesPanelHandle,
  SavedQueriesPanelProps
>(function SavedQueriesPanel({ onLoad }, ref) {
  const [queries, setQueries] = React.useState<SavedQuery[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const fetchQueries = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/saved-queries");
      if (res.ok) {
        const data: SavedQuery[] = await res.json();
        setQueries(data);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on first open
  React.useEffect(() => {
    if (isOpen && queries.length === 0) {
      fetchQueries();
    }
  }, [isOpen, queries.length, fetchQueries]);

  // Expose refetch to parent
  React.useImperativeHandle(ref, () => ({
    refetch: fetchQueries,
  }), [fetchQueries]);

  const handleDelete = React.useCallback(async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/saved-queries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setQueries((prev) => prev.filter((q) => q.id !== id));
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleLoad = React.useCallback(
    (query: QueryDefinition) => {
      onLoad(query);
      setIsOpen(false);
    },
    [onLoad],
  );

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconBookmarks className="size-4" />
        저장된 프리셋
        {queries.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
            {queries.length}
          </span>
        )}
        {isOpen ? (
          <IconChevronUp className="size-3.5 ml-auto" />
        ) : (
          <IconChevronDown className="size-3.5 ml-auto" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-2">
          {isLoading && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              불러오는 중...
            </p>
          )}

          {!isLoading && queries.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              저장된 프리셋이 없습니다.
            </p>
          )}

          {queries.map((sq) => (
            <div
              key={sq.id}
              className="group flex items-start gap-2 rounded-md px-2.5 py-2 hover:bg-background transition-colors cursor-pointer"
              onClick={() => handleLoad(sq.query)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {sq.is_default && (
                    <IconStar className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{sq.name}</span>
                </div>
                {sq.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {sq.description}
                  </p>
                )}
                <QuerySummary query={sq.query} />
              </div>

              {!sq.is_default && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-[hsl(0,72%,51%)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(sq.id);
                  }}
                  disabled={deletingId === sq.id}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/** Compact summary of a query's dimensions + metrics */
function QuerySummary({ query }: { query: QueryDefinition }) {
  const dimLabels = query.dimensions
    .map((d) => DIMENSIONS.find((dm) => dm.key === d)?.label ?? d)
    .join(", ");
  const metricLabels = query.metrics
    .slice(0, 3)
    .map((m) => METRICS.find((mm) => mm.key === m)?.label ?? m)
    .join(", ");
  const extra = query.metrics.length > 3 ? ` +${query.metrics.length - 3}` : "";

  return (
    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
      {dimLabels} | {metricLabels}{extra}
    </p>
  );
}
