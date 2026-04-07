"use client";

import * as React from "react";
import { IconSparkles, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { QueryDefinition } from "@/types/query";

interface AiQueryInputProps {
  onQueryGenerated: (query: QueryDefinition) => void;
}

const EXAMPLE_PROMPTS = [
  "국가별 4월 광고비랑 ROAS 보여줘",
  "렌탈걸즈랑 하렘의남자 4월 성과 비교해줘",
  "Meta 매체에서 이번달 작품별 가입수 높은 순으로",
  "3월 대비 4월 국가별 광고비 변화 비교",
  "US에서 ROAS 높은 작품 top10",
];

export function AiQueryInput({ onQueryGenerated }: AiQueryInputProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (text?: string) => {
    const input = text ?? prompt;
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "AI 요청 실패");
        return;
      }

      onQueryGenerated(data.query);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--chart-2)/0.3)] bg-[hsl(var(--chart-2)/0.05)] p-4 backdrop-blur-[12px]">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        <IconSparkles className="size-4 text-[hsl(var(--chart-2))]" />
        AI에게 물어보기
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSubmit();
          }}
          placeholder="예: 렌탈걸즈랑 하렘의남자 4월 ROAS 비교해줘"
          className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--chart-2)/0.5)]"
          disabled={isLoading}
        />
        <Button
          onClick={() => handleSubmit()}
          disabled={isLoading || !prompt.trim()}
          className="gap-1.5 shrink-0"
          size="sm"
        >
          {isLoading ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconSparkles className="size-4" />
          )}
          {isLoading ? "생성 중..." : "생성"}
        </Button>
      </div>

      {/* Example prompts */}
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setPrompt(example);
              handleSubmit(example);
            }}
            disabled={isLoading}
            className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-[hsl(0,72%,51%)]">{error}</p>
      )}
    </div>
  );
}
