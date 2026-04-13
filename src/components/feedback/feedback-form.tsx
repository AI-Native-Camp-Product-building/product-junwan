"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/types/feedback";

interface FeedbackFormProps {
  onSuccess?: () => void;
}

export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const pathname = usePathname();
  const [category, setCategory] = React.useState<FeedbackCategory | "">("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !message.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: pathname,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setResult({ ok: false, text: data.error ?? "제출에 실패했습니다." });
        return;
      }

      setResult({ ok: true, text: "피드백이 제출되었습니다. 감사합니다!" });
      setCategory("");
      setMessage("");
      onSuccess?.();
    } catch {
      setResult({ ok: false, text: "네트워크 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">카테고리</label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as FeedbackCategory)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="카테고리 선택" />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.emoji} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">내용</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="피드백을 작성해주세요..."
          rows={5}
          maxLength={5000}
          className="resize-y"
        />
        <span className="text-xs text-muted-foreground text-right">
          {message.length} / 5,000
        </span>
      </div>

      {result && (
        <p
          className={`text-sm ${result.ok ? "text-green-400" : "text-red-400"}`}
        >
          {result.text}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting || !category || !message.trim()}
        className="self-end"
      >
        {submitting ? "제출 중..." : "피드백 제출"}
      </Button>
    </form>
  );
}
