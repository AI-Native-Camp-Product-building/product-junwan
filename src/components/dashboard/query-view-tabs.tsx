"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const VIEW_KEYS = [
  "주간_로케일별",
  "주간_매체별",
  "주간_목표별",
  "월간_로케일별",
  "작품별_효율",
  "원본_마스터",
] as const;

export type ViewKey = (typeof VIEW_KEYS)[number];

const VIEW_LABELS: Record<ViewKey, string> = {
  주간_로케일별: "로케일별",
  주간_매체별: "매체별",
  주간_목표별: "목표별",
  월간_로케일별: "월간",
  작품별_효율: "작품별 효율",
  원본_마스터: "원본 마스터",
};

/** Group boundaries: indices where a divider appears BEFORE the tab. */
const DIVIDER_BEFORE = new Set([3, 4]);

interface QueryViewTabsProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function QueryViewTabs({ activeView, onViewChange }: QueryViewTabsProps) {
  return (
    <div
      className="flex items-center overflow-x-auto scrollbar-none"
      role="tablist"
      aria-label="쿼리 뷰 탭"
    >
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-white/[0.03] border border-white/[0.08] backdrop-blur-[12px] p-1">
        {VIEW_KEYS.map((key, idx) => {
          const isActive = activeView === key;

          return (
            <React.Fragment key={key}>
              {/* Group divider */}
              {DIVIDER_BEFORE.has(idx) && (
                <div
                  className="mx-1 h-4 w-px shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  aria-hidden="true"
                />
              )}

              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onViewChange(key)}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "text-white"
                    : "text-white/45 hover:text-white/70 hover:bg-white/[0.03]",
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: "rgba(100,149,237,0.15)",
                        textShadow: "0 0 12px rgba(100,149,237,0.2)",
                      }
                    : undefined
                }
              >
                {VIEW_LABELS[key]}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4/5 rounded-full"
                    style={{
                      backgroundColor: "rgba(100,149,237,0.9)",
                      boxShadow: "0 0 6px rgba(100,149,237,0.4)",
                    }}
                  />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
