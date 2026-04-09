"use client";

import * as React from "react";
import { IconBookmark } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QueryDefinition } from "@/types/query";

interface SaveQueryDialogProps {
  query: QueryDefinition;
  createdBy?: string;
  onSaved: () => void;
}

export function SaveQueryDialog({ query, createdBy, onSaved }: SaveQueryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSave = query.metrics.length > 0;

  const handleSave = React.useCallback(async () => {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          query,
          created_by: createdBy,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setOpen(false);
      setName("");
      setDescription("");
      onSaved();
    } catch {
      setError("네트워크 오류");
    } finally {
      setIsSaving(false);
    }
  }, [name, description, query, createdBy, onSaved]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!canSave} />
        }
      >
        <IconBookmark className="size-4" />
        저장
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>쿼리 프리셋 저장</DialogTitle>
          <DialogDescription>
            현재 쿼리 설정을 프리셋으로 저장하면 나중에 바로 불러올 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preset-name" className="text-xs font-medium text-muted-foreground">
              이름 *
            </label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 국가별 3월 광고비"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="preset-desc" className="text-xs font-medium text-muted-foreground">
              설명 (선택)
            </label>
            <Input
              id="preset-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 분석인지 간단히 메모"
            />
          </div>

          {error && (
            <p className="text-xs text-[hsl(0,72%,51%)]">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
