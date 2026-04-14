/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  type UserFeedback,
  type FeedbackStatus,
} from "@/types/feedback";
import { feedbackToMarkdown, copyToClipboard } from "@/lib/feedback-copy";
import { IconCopy } from "@tabler/icons-react";

interface FeedbackDetailPanelProps {
  item: UserFeedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
  onMemoSave: (id: string, memo: string) => void;
}

export function FeedbackDetailPanel({
  item,
  open,
  onOpenChange,
  onStatusChange,
  onMemoSave,
}: FeedbackDetailPanelProps) {
  const [memo, setMemo] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [copyMsg, setCopyMsg] = React.useState("");

  React.useEffect(() => {
    if (item) {
      setMemo(item.admin_memo ?? "");
    }
  }, [item]);

  if (!item) return null;

  const cat = FEEDBACK_CATEGORIES.find((c) => c.value === item.category);

  const handleSaveMemo = () => {
    setSaving(true);
    onMemoSave(item.id, memo);
    setSaving(false);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(feedbackToMarkdown(item));
    if (ok) {
      setCopyMsg("복사됨!");
      setTimeout(() => setCopyMsg(""), 2000);
    }
  };

  const statusItems = FEEDBACK_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>
              {cat?.emoji} {cat?.label}
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              {new Date(item.created_at).toLocaleString("ko-KR")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">유저:</span>
            <span>{item.user_email}</span>
          </div>

          {item.page_url && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">페이지:</span>
              <span className="text-xs">{item.page_url}</span>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm whitespace-pre-wrap">{item.message}</p>
          </div>

          {item.image_urls && item.image_urls.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">첨부 이미지:</span>
              <div className="flex flex-wrap gap-2">
                {item.image_urls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt="첨부 이미지"
                      className="w-24 h-24 object-cover rounded-md border border-border hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">상태:</span>
            <Select
              value={item.status}
              onValueChange={(v) =>
                onStatusChange(item.id, v as FeedbackStatus)
              }
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">관리자 메모</label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="내부 메모 (유저에게 보이지 않음)"
              rows={3}
              className="resize-y"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveMemo}
              disabled={saving || memo === (item.admin_memo ?? "")}
              className="self-end"
            >
              {saving ? "저장 중..." : "메모 저장"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <IconCopy className="size-3.5 mr-1" />
              마크다운 복사
            </Button>
            {copyMsg && (
              <span className="text-xs text-green-400">{copyMsg}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
