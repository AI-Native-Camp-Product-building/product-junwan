/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  type UserFeedback,
} from "@/types/feedback";
import { IconEdit } from "@tabler/icons-react";

interface FeedbackHistoryProps {
  items: UserFeedback[];
  onEdit?: (item: UserFeedback) => void;
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

export function FeedbackHistory({ items, onEdit }: FeedbackHistoryProps) {
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
              {onEdit && (
                <button
                  onClick={() => onEdit(fb)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                >
                  <IconEdit className="size-3" />
                  수정
                </button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(fb.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-3">
              {fb.message}
            </p>
            {fb.image_urls && fb.image_urls.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {fb.image_urls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="첨부"
                    className="w-12 h-12 object-cover rounded border border-border"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
