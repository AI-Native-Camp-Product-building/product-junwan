"use client";

import * as React from "react";
import { IconRefresh, IconCheck, IconX, IconClock } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SyncSheetStatus {
  sync_id: number;
  sheet_name: string;
  status: "success" | "failed" | "partial" | "running";
  rows_upserted: number | null;
  finished_at: string | null;
  error_message: string | null;
}

interface SyncStatusData {
  sheets: SyncSheetStatus[];
  queriedAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <IconCheck className="size-3.5 text-emerald-400" />;
    case "failed":
      return <IconX className="size-3.5 text-red-400" />;
    case "running":
      return <IconClock className="size-3.5 text-yellow-400 animate-pulse" />;
    default:
      return <IconClock className="size-3.5 text-muted-foreground" />;
  }
}

export function SyncStatus() {
  const [data, setData] = React.useState<SyncStatusData | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sync-status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail -- status is non-critical
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync-trigger", { method: "POST" });
      if (!res.ok) {
        console.error("Sync failed:", await res.text());
      }
      await fetchStatus();
    } catch (err) {
      console.error("Sync trigger error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const latestFinished = data?.sheets
    .map((s) => s.finished_at)
    .filter(Boolean)
    .sort()
    .pop();

  const successCount =
    data?.sheets.filter((s) => s.status === "success").length ?? 0;
  const totalCount = data?.sheets.length ?? 0;

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
        >
          <span className="size-1.5 rounded-full bg-emerald-400/60 shrink-0" />
          <span className="truncate">
            {latestFinished
              ? `동기화: ${formatRelativeTime(latestFinished)}`
              : "동기화 대기중"}
          </span>
          {totalCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {successCount}/{totalCount}
            </Badge>
          )}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={handleSync}
          disabled={isSyncing}
          aria-label="데이터 동기화"
        >
          <IconRefresh
            className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {expanded && data && (
        <div className="flex flex-col gap-1 pl-4">
          {data.sheets.map((sheet) => (
            <div
              key={sheet.sheet_name}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <StatusIcon status={sheet.status} />
              <span className="flex-1 truncate">{sheet.sheet_name}</span>
              {sheet.rows_upserted != null && (
                <span className="tabular-nums">{sheet.rows_upserted}행</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
