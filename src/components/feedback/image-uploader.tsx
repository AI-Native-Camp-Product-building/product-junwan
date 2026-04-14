"use client";

import { useRef, useState } from "react";
import { IconPhoto, IconX, IconLoader2 } from "@tabler/icons-react";

interface ImageUploaderProps {
  images: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  maxCount?: number;
  disabled?: boolean;
}

export function ImageUploader({
  images,
  onAdd,
  onRemove,
  maxCount = 3,
  disabled = false,
}: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (images.length >= maxCount) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/feedback/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "업로드에 실패했습니다.");
      }

      const data = (await res.json()) as { url: string };
      onAdd(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void uploadFile(file);
    }
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled || loading || images.length >= maxCount) return;

    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (file) {
      e.preventDefault();
      void uploadFile(file);
    }
  };

  const canAdd = images.length < maxCount && !disabled;

  return (
    <div
      className="flex flex-col gap-3"
      onPaste={handlePaste}
    >
      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="첨부 이미지"
                className="w-20 h-20 object-cover rounded-md border border-border"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                  aria-label="이미지 제거"
                >
                  <IconX size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload row */}
      <div className="flex items-center gap-3">
        {canAdd && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || loading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconPhoto size={16} />
              )}
              이미지 추가
            </button>
          </>
        )}

        <span className="text-sm text-muted-foreground">
          {images.length} / {maxCount}
        </span>
      </div>

      {/* Helper text */}
      {canAdd && !loading && (
        <p className="text-xs text-muted-foreground">
          Ctrl+V로 스크린샷 붙여넣기 가능
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
