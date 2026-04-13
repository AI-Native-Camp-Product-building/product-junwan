"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  type UserFeedback,
} from "@/types/feedback";

interface FeedbackHistoryProps {
  items: UserFeedback[];
}

function statusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "resolved":
      return "default";
    case "dismissed":
      return "secondary";
    default:
      return "outline";
  }
}

export function FeedbackHistory({ items }: FeedbackHistoryProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        아직 제출한 피드백이 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((fb) => {
        const cat = FEEDBACK_CATEGORIES.find((c) => c.value === fb.category);
        const st = FEEDBACK_STATUSES.find((s) => s.value === fb.status);
        return (
          <div
            key={fb.id}
            className="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {cat?.emoji} {cat?.label}
              </span>
              <Badge variant={statusVariant(fb.status)} className="text-[10px]">
                {st?.label ?? fb.status}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(fb.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-3">
              {fb.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
