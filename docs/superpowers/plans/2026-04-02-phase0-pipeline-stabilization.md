# Phase 0: 데이터 파이프라인 안정화 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8개 Google Sheets의 실데이터를 Supabase `ad_normalized` 뷰를 통해 대시보드 UI에 정상 표시하고, 동기화 상태를 모니터링할 수 있는 상태를 만든다.

**Architecture:** Agent 1(Data Engineer)이 8개 시트를 스캔하여 헤더 매핑/데이터 품질 리포트를 생성한다. 이 리포트를 기반으로 Agent 2(Backend)가 파서와 매핑 테이블을 보강하고, Agent 3(Frontend)가 동기화 상태 UI를 추가한다. 최종적으로 전체 동기화를 실행하고 대시보드에서 실데이터를 확인한다.

**Tech Stack:** Next.js 16 (App Router), Google Sheets API v4 (googleapis), Supabase (PostgreSQL + JS client), shadcn/ui, Tailwind CSS v4, Recharts

**Spec:** `docs/superpowers/specs/2026-04-02-phase0-pipeline-stabilization-design.md`

---

## File Structure

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/lib/scan-sheets.ts` | 8개 시트 스캔 스크립트 (헤더 수집, 데이터 샘플, 매핑 gap 분석) |
| `src/app/api/sync-trigger/route.ts` | 프론트엔드용 동기화 proxy (SYNC_API_SECRET 은닉) |
| `src/app/api/sync-status/route.ts` | 시트별 동기화 상태 조회 API |
| `src/components/dashboard/sync-status.tsx` | 동기화 상태 표시 + Sync 버튼 + 시트별 상태 패널 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/sheets-parser.ts` | 스캔에서 발견된 미매핑 헤더 패턴 추가 |
| `supabase/schema.sql` | 매핑 테이블 시드 보강 (medium_map, goal_map, creative_type_map) |
| `src/components/dashboard/dashboard-sidebar.tsx` | SyncStatus 컴포넌트 배치 |
| `src/components/dashboard/kpi-cards.tsx` | 빈 데이터 상태 처리 |
| `src/components/dashboard/chart-section.tsx` | 빈 데이터 상태 처리 |

---

## Task 1: 8개 시트 스캔 스크립트 작성 (Agent 1)

**Files:**
- Create: `src/lib/scan-sheets.ts`

이 스크립트는 8개 시트의 실제 구조를 파악하여 JSON 리포트를 생성한다. 서브에이전트가 직접 실행하여 결과를 수집한다.

- [ ] **Step 1: `src/lib/scan-sheets.ts` 작성**

```typescript
// src/lib/scan-sheets.ts
// 8개 시트 스캔 — 헤더 수집, 데이터 샘플, 매핑 gap 분석
// 실행: npx tsx src/lib/scan-sheets.ts

import { google } from "googleapis";
import { readFileSync } from "fs";
import { join } from "path";

// --- 현재 파서의 매핑 패턴 (sheets-parser.ts에서 복사) ---
const KNOWN_MEDIUM_MAP = new Set([
  "메타", "Meta", "Facebook", "유튜브", "구글GDN", "트위터",
  "핀터레스트", "Pinterest", "TikTok Ads", "Snapchat", ".", "",
]);

const KNOWN_GOAL_MAP = new Set([
  "결제", "구매", "첫결제", "가입", "가입&결제", ".", "",
]);

const KNOWN_CREATIVE_TYPE_MAP = new Set([
  "영상(한익게)", "한익게", "PV", "영상(PV)", "영상(FB)",
  "영상(추천)", "영상(바이럴)", "이미지 (영화자막)",
  "캐러셀(영화자막)", "웹툰리뷰", "그 외 (챌린지 등)",
]);

const HEADER_PATTERNS: Record<string, string[]> = {
  month_raw: ["월별"],
  date_raw: ["일자"],
  medium_raw: ["매체"],
  goal_raw: ["목표"],
  creative_type_raw: ["소재종류"],
  creative_name: ["소재 (작품명)", "소재(작품명)", "소재"],
  ad_spend_local: ["광고비(USD)", "광고비(유로)", "광고비"],
  ad_spend_krw: ["원화", "광고비(KRW)"],
  impressions: ["노출수"],
  clicks: ["클릭"],
  ctr_raw: ["CTR"],
  signups: ["회원가입"],
  signup_cpa_raw: ["가입CPA"],
  conversions: ["결제전환"],
  revenue_local: ["결제금액(USD)", "결제금액"],
  revenue_krw: ["결제금액(KRW)", "결제금액 원화"],
  roas_raw: ["ROAS"],
};

// --- sheet_source 시드 (schema.sql과 동일) ---
const SHEET_SOURCES = [
  { name: "레진 KR", sheetId: "1HMyzye86YxhgdZ0bG1vYHb7QeJBi-oI_CGYacxXh2hE", tabName: "시트1", headerRow: 11, currency: "KRW" },
  { name: "봄툰 KR", sheetId: "1rr45aW4SP3Dqwd6grMVpDZohNw0RXfXtjWbfKXEUouU", tabName: "봄툰KR", headerRow: 10, currency: "KRW" },
  { name: "US", sheetId: "1xGGd_TY6iFCiyqEoVwMrYzACfpcBMSc8hnBd_qN6vjg", tabName: "시트1", headerRow: 11, currency: "USD" },
  { name: "DE", sheetId: "1eUMAADMhoRt5eZBq4iyIElgDTGxiPW9LFqyNl0VJ0t0", tabName: "시트1", headerRow: 10, currency: "EUR" },
  { name: "FR", sheetId: "1lirrJfP6duAPJB36-ybXR4_tLTFJwPylg6SwdAizc2w", tabName: "시트1", headerRow: 12, currency: "EUR" },
  { name: "TH", sheetId: "1CCisdkklYhSFRhEe1HvN-j9U6bWHAINqyEcP1hfnK0U", tabName: "시트1", headerRow: 10, currency: "THB" },
  { name: "TW", sheetId: "1zH-WAZyx_DGs9_8KykiVHWN-BCNvmODuTP_ean4cGdc", tabName: "시트1", headerRow: 10, currency: "TWD" },
  { name: "ES", sheetId: "1V_EpN-LfmKNnIuxJfRf8MJz304uZch4L27D-HCHezbw", tabName: "시트1", headerRow: 11, currency: "EUR" },
];

interface SheetScanResult {
  name: string;
  sheetId: string;
  access: "OK" | "FAIL";
  accessError?: string;
  actualTabs?: string[];
  tabNameMatch?: boolean;
  headerRow: number;
  actualHeaders?: string[];
  mappedFields?: Record<string, string | null>; // field -> matched header or null
  unmappedHeaders?: string[]; // headers in sheet that no pattern matched
  sampleRows?: unknown[][];
  dataRowCount?: number;
  uniqueMediums?: string[];
  uniqueGoals?: string[];
  uniqueCreativeTypes?: string[];
  unmappedMediums?: string[];
  unmappedGoals?: string[];
  unmappedCreativeTypes?: string[];
  dateFormats?: string[];
  monthFormats?: string[];
}

async function main() {
  const credPath = join(process.cwd(), "credentials", "service-account.json");
  const credentials = JSON.parse(readFileSync(credPath, "utf-8"));
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  await auth.authorize();
  const sheetsApi = google.sheets({ version: "v4", auth });

  const results: SheetScanResult[] = [];

  for (const source of SHEET_SOURCES) {
    const result: SheetScanResult = {
      name: source.name,
      sheetId: source.sheetId,
      access: "OK",
      headerRow: source.headerRow,
    };

    try {
      // 1. 탭 목록 확인
      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId: source.sheetId,
        fields: "sheets.properties.title",
      });
      result.actualTabs = meta.data.sheets?.map((s) => s.properties?.title ?? "") ?? [];
      result.tabNameMatch = result.actualTabs.includes(source.tabName);

      // 2. 헤더 행 + 데이터 행 읽기 (헤더 포함 최대 200행)
      const range = `'${source.tabName}'!A${source.headerRow}:Z${source.headerRow + 200}`;
      const dataRes = await sheetsApi.spreadsheets.values.get({
        spreadsheetId: source.sheetId,
        range,
        valueRenderOption: "FORMATTED_VALUE",
      });
      const allRows = dataRes.data.values ?? [];

      if (allRows.length === 0) {
        result.access = "FAIL";
        result.accessError = "No data returned for header row range";
        results.push(result);
        continue;
      }

      // 3. 헤더 분석
      const headerCells = allRows[0].map((h: unknown) => (h != null ? String(h).trim() : ""));
      result.actualHeaders = headerCells.filter((h: string) => h !== "");

      // 4. 매핑 시뮬레이션
      const mapped: Record<string, string | null> = {};
      const matchedIndices = new Set<number>();

      for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
        let found: string | null = null;
        for (let i = 0; i < headerCells.length; i++) {
          if (matchedIndices.has(i)) continue;
          if (patterns.includes(headerCells[i])) {
            found = headerCells[i];
            matchedIndices.add(i);
            break;
          }
        }
        mapped[field] = found;
      }
      result.mappedFields = mapped;
      result.unmappedHeaders = headerCells.filter(
        (_: string, i: number) => !matchedIndices.has(i) && headerCells[i] !== ""
      );

      // 5. 데이터 행 분석
      const dataRows = allRows.slice(1).filter((row: unknown[]) =>
        row.some((cell: unknown) => cell != null && String(cell).trim() !== "")
      );
      result.dataRowCount = dataRows.length;
      result.sampleRows = dataRows.slice(0, 3);

      // 6. 고유값 수집 (medium, goal, creative_type)
      const mediumIdx = headerCells.indexOf("매체");
      const goalIdx = headerCells.indexOf("목표");
      const creativeTypeIdx = headerCells.indexOf("소재종류");

      const collectUnique = (idx: number): string[] => {
        if (idx === -1) return [];
        const vals = new Set<string>();
        for (const row of dataRows) {
          const v = row[idx];
          if (v != null && String(v).trim() !== "") vals.add(String(v).trim());
        }
        return [...vals].sort();
      };

      result.uniqueMediums = collectUnique(mediumIdx);
      result.uniqueGoals = collectUnique(goalIdx);
      result.uniqueCreativeTypes = collectUnique(creativeTypeIdx);

      result.unmappedMediums = result.uniqueMediums.filter((v) => !KNOWN_MEDIUM_MAP.has(v));
      result.unmappedGoals = result.uniqueGoals.filter((v) => !KNOWN_GOAL_MAP.has(v));
      result.unmappedCreativeTypes = result.uniqueCreativeTypes.filter((v) => !KNOWN_CREATIVE_TYPE_MAP.has(v));

      // 7. 날짜/월 포맷 샘플
      const dateIdx = headerCells.indexOf("일자");
      const monthIdx = headerCells.indexOf("월별");

      const collectFormats = (idx: number, limit: number): string[] => {
        if (idx === -1) return [];
        const samples = new Set<string>();
        for (const row of dataRows) {
          if (samples.size >= limit) break;
          const v = row[idx];
          if (v != null && String(v).trim() !== "") samples.add(String(v).trim());
        }
        return [...samples];
      };

      result.dateFormats = collectFormats(dateIdx, 5);
      result.monthFormats = collectFormats(monthIdx, 5);

    } catch (err) {
      result.access = "FAIL";
      result.accessError = err instanceof Error ? err.message : String(err);
    }

    results.push(result);
  }

  // 출력
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error("Scan failed:", e);
  process.exit(1);
});
```

- [ ] **Step 2: 스캔 실행**

Run: `npx tsx src/lib/scan-sheets.ts 2>&1`

Expected: 8개 시트 각각에 대한 JSON 리포트가 출력된다. 각 시트별로 `access: "OK"`, `tabNameMatch`, `mappedFields`, `unmappedMediums` 등이 포함된다.

결과를 파일로 저장:
```bash
npx tsx src/lib/scan-sheets.ts > docs/superpowers/specs/sheet-scan-raw.json 2>&1
```

- [ ] **Step 3: 스캔 결과 분석 & 마크다운 리포트 작성**

스캔 JSON 결과를 분석하여 다음 내용을 `docs/superpowers/specs/시트별-데이터-스캔-결과.md`에 작성:

1. 시트별 상태 요약 테이블
2. `tab_name` / `header_row` 수정 필요 목록
3. 누락 헤더 패턴 목록 (Task 2에서 추가할 것)
4. 누락 매핑 값 목록 (Task 2에서 SQL 시드 추가할 것)
5. 날짜/월 포맷 이슈

---

## Task 2: 파서 헤더 패턴 보강 (Agent 2)

**Files:**
- Modify: `src/lib/sheets-parser.ts:29-57` (HEADER_PATTERNS)

**의존성**: Task 1 스캔 결과 필요

- [ ] **Step 1: 스캔 리포트에서 누락 헤더 식별**

Task 1의 스캔 결과에서 `unmappedHeaders`와 `mappedFields`에서 `null`인 필드를 수집한다. 예상되는 패턴:
- 해외 시트에서 "원화(외화일경우)" 같은 변형
- 광고비/결제금액 컬럼에 통화 접미사 변형 (예: "광고비(EUR)")

- [ ] **Step 2: `sheets-parser.ts`의 HEADER_PATTERNS에 누락 패턴 추가**

스캔 결과에서 발견된 실제 미매핑 헤더를 `HEADER_PATTERNS` 배열에 추가한다. 예시:

```typescript
// 스캔에서 발견된 변형을 추가
// 실제 추가할 패턴은 Task 1 결과에 따라 결정
[["광고비(EUR)"], "ad_spend_local"],
[["원화(외화일경우)"], "ad_spend_krw"],
[["결제금액(EUR)"], "revenue_local"],
```

각 추가 패턴은 스캔 리포트의 `unmappedHeaders`에서 직접 가져온 실제 문자열이어야 한다.

- [ ] **Step 3: `sheet_source` 시드 수정 (필요 시)**

스캔 결과에서 `tabNameMatch: false`이거나 `access: "FAIL"`인 시트가 있으면 `supabase/schema.sql`의 INSERT 문에서 해당 시트의 `tab_name`, `header_row`를 수정한다.

수정 후 Supabase에도 반영:
```sql
-- 예시 (실제 값은 스캔 결과에 따라)
UPDATE sheet_source SET tab_name = '실제탭명', header_row = 실제행번호 WHERE name = '시트이름';
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/sheets-parser.ts supabase/schema.sql
git commit -m "fix: add missing header patterns from sheet scan"
```

---

## Task 3: 매핑 테이블 시드 보강 (Agent 2)

**Files:**
- Modify: `supabase/schema.sql:135-202` (medium_map, goal_map, creative_type_map INSERT 문)

**의존성**: Task 1 스캔 결과 필요

- [ ] **Step 1: 스캔 리포트에서 미매핑 값 수집**

Task 1의 `unmappedMediums`, `unmappedGoals`, `unmappedCreativeTypes`를 수집한다.

- [ ] **Step 2: `schema.sql`의 매핑 테이블 INSERT에 새 값 추가**

`medium_map` 예시:
```sql
-- 스캔에서 발견된 새 매체 raw 값 추가
insert into public.medium_map (raw_value, normalized) values
  ('발견된_raw_값', '정규화된_값')
on conflict (raw_value) do nothing;
```

`goal_map`, `creative_type_map`도 동일하게 처리. normalized 값은 기존 패턴에 맞춰 결정:
- 같은 의미의 기존 normalized 값이 있으면 그걸 사용 (예: "페이스북" → "Meta")
- 새로운 카테고리면 한국어 정규화 이름 생성

- [ ] **Step 3: Supabase에 매핑 INSERT 실행**

Supabase SQL Editor 또는 API를 통해 새 매핑 INSERT 실행. `on conflict do nothing`이므로 중복 실행해도 안전하다.

- [ ] **Step 4: 커밋**

```bash
git add supabase/schema.sql
git commit -m "feat: add mapping table seeds from sheet scan"
```

---

## Task 4: 전체 동기화 실행 & 검증 (Agent 2)

**Files:**
- 기존 파일 사용 (수정 불필요, 실행만)

**의존성**: Task 2, Task 3 완료

- [ ] **Step 1: 전체 동기화 dryRun 실행**

```bash
curl -X POST http://localhost:1004/api/sync \
  -H "Authorization: Bearer $SYNC_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

Expected: 8개 시트 모두 `status: "success"`, `rowsFetched > 0`, `rowsUpserted: 0` (dryRun이므로)

- [ ] **Step 2: dryRun 결과 분석**

실패한 시트가 있으면:
- `HeaderParseError` → Task 2에서 헤더 패턴 추가 누락, 돌아가서 수정
- `SheetsReadError` → tab_name/header_row 불일치, schema.sql 수정
- 기타 오류 → 로그 확인 후 해당 코드 수정

- [ ] **Step 3: 실제 동기화 실행 (dryRun 없이)**

```bash
curl -X POST http://localhost:1004/api/sync \
  -H "Authorization: Bearer $SYNC_API_SECRET" \
  -H "Content-Type: application/json"
```

Expected: 8개 시트 모두 `status: "success"`, `rowsUpserted > 0`

- [ ] **Step 4: `ad_normalized` 뷰 검증**

Supabase에서 확인:
```sql
-- 시트별 행수 확인
SELECT sheet_name, COUNT(*) as row_count
FROM ad_normalized
GROUP BY sheet_name
ORDER BY sheet_name;

-- 매핑 누락 확인 (medium이 raw 값 그대로인 행)
SELECT medium, medium_raw, COUNT(*)
FROM ad_normalized
WHERE medium = medium_raw AND medium NOT IN ('Meta', 'YouTube', 'Google GDN', 'X(Twitter)', 'Pinterest', 'TikTok', 'Snapchat', 'none')
GROUP BY medium, medium_raw;

-- goal 매핑 누락 확인
SELECT goal, goal_raw, COUNT(*)
FROM ad_normalized
WHERE goal = goal_raw AND goal NOT IN ('결제', '첫결제', '가입', '가입&결제', 'none')
GROUP BY goal, goal_raw;
```

Expected: 8개 sheet_name 존재, 매핑 누락 0행

---

## Task 5: Sync Status API Route (Agent 3)

**Files:**
- Create: `src/app/api/sync-status/route.ts`

- [ ] **Step 1: `src/app/api/sync-status/route.ts` 작성**

```typescript
// src/app/api/sync-status/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sheet_sync_latest")
      .select("sync_id, sheet_source_id, sheet_name, status, rows_fetched, rows_upserted, started_at, finished_at, duration_ms, error_message");

    if (error) {
      return NextResponse.json(
        { error: "QueryError", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sheets: data ?? [],
      queriedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "ServerError", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/sync-status/route.ts
git commit -m "feat: add sync-status API route"
```

---

## Task 6: Sync Trigger API Route (Agent 3)

**Files:**
- Create: `src/app/api/sync-trigger/route.ts`

- [ ] **Step 1: `src/app/api/sync-trigger/route.ts` 작성**

이 route는 프론트엔드의 Sync 버튼에서 호출된다. 서버사이드에서 `SYNC_API_SECRET`을 사용하여 `/api/sync`를 내부 호출한다. 프론트엔드에 시크릿이 노출되지 않는다.

```typescript
// src/app/api/sync-trigger/route.ts
import { NextResponse } from "next/server";
import { syncAllSheets } from "@/lib/sheets-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await syncAllSheets();

    const allFailed = result.totalSheets > 0 && result.failed === result.totalSheets;

    if (allFailed) {
      return NextResponse.json(
        { error: "SyncFailed", message: "All sheets failed to sync.", result },
        { status: 500 },
      );
    }

    const status = result.failed > 0 || result.partial > 0 ? 207 : 200;
    return NextResponse.json({ success: true, result }, { status });
  } catch (err) {
    return NextResponse.json(
      { error: "SyncFailed", message: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/sync-trigger/route.ts
git commit -m "feat: add sync-trigger proxy route for frontend"
```

---

## Task 7: SyncStatus 컴포넌트 (Agent 3)

**Files:**
- Create: `src/components/dashboard/sync-status.tsx`

- [ ] **Step 1: `sync-status.tsx` 작성**

```tsx
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
      // Silently fail — status is non-critical
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
      // Refresh status after sync
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

  const successCount = data?.sheets.filter((s) => s.status === "success").length ?? 0;
  const totalCount = data?.sheets.length ?? 0;

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* Summary line */}
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

      {/* Expanded: per-sheet status */}
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
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/dashboard/sync-status.tsx
git commit -m "feat: add SyncStatus component with per-sheet status"
```

---

## Task 8: 사이드바에 SyncStatus 배치 (Agent 3)

**Files:**
- Modify: `src/components/dashboard/dashboard-sidebar.tsx`

- [ ] **Step 1: SyncStatus를 사이드바 하단에 추가**

`dashboard-sidebar.tsx`에서 Separator + navSecondary 블록 아래, `</SidebarContent>` 직전에 SyncStatus를 배치한다.

```tsx
// 기존 import에 추가
import { SyncStatus } from "@/components/dashboard/sync-status";
```

`</SidebarContent>` 직전 (navSecondary SidebarMenu 닫는 태그 이후)에 추가:

```tsx
          <Separator className="my-2 bg-white/[0.06]" />
          <SyncStatus />
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/dashboard/dashboard-sidebar.tsx
git commit -m "feat: add SyncStatus to dashboard sidebar"
```

---

## Task 9: 빈 데이터 상태 처리 (Agent 3)

**Files:**
- Modify: `src/components/dashboard/kpi-cards.tsx`
- Modify: `src/components/dashboard/chart-section.tsx`

- [ ] **Step 1: KPI 카드 빈 상태 처리**

`kpi-cards.tsx`에서 `KpiCards` 컴포넌트의 return 문 상단에 빈 데이터 체크를 추가한다. `summary.adSpend === 0 && summary.revenue === 0 && summary.signups === 0`일 때 빈 상태 표시.

`KpiCards` 함수 상단, return 직전에 추가:

```tsx
  const isEmpty =
    summary.adSpend === 0 &&
    summary.revenue === 0 &&
    summary.signups === 0;

  if (isEmpty && !isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {kpiDefs.map((def) => (
          <Card
            key={def.label}
            className="@container/card bg-white/[0.03] border-white/[0.08] backdrop-blur-[12px]"
          >
            <CardHeader>
              <CardDescription>{def.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold text-muted-foreground">
                --
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              데이터 없음
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
```

- [ ] **Step 2: 차트 섹션 빈 상태 처리**

`chart-section.tsx`에서 데이터가 없을 때 안내 메시지를 표시한다.

`ChartSection` 함수 return 직전에 추가:

```tsx
  const isEmpty = roasTrendData.length === 0 && mediumSpendData.length === 0;

  if (isEmpty && !isLoading) {
    return (
      <div className="flex items-center justify-center px-4 py-16 lg:px-6">
        <p className="text-sm text-muted-foreground">
          차트를 표시할 데이터가 없습니다. 사이드바에서 데이터 동기화를 실행해주세요.
        </p>
      </div>
    );
  }
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/dashboard/kpi-cards.tsx src/components/dashboard/chart-section.tsx
git commit -m "feat: add empty state handling for KPI cards and charts"
```

---

## Task 10: 통합 검증 (전체)

**Files:**
- 수정 없음 (검증만)

**의존성**: Task 1-9 전체 완료

- [ ] **Step 1: dev 서버 실행 확인**

```bash
npm run dev
```

Expected: `http://localhost:1004`에서 대시보드 로딩됨

- [ ] **Step 2: 동기화 상태 API 확인**

```bash
curl http://localhost:1004/api/sync-status
```

Expected: `{ sheets: [...], queriedAt: "..." }` 반환. 동기화 이력이 있으면 시트별 상태가 표시됨.

- [ ] **Step 3: 동기화 트리거 실행**

```bash
curl -X POST http://localhost:1004/api/sync-trigger
```

Expected: `{ success: true, result: { totalSheets: 8, successful: 8, failed: 0, ... } }`

- [ ] **Step 4: 대시보드 API 데이터 확인**

```bash
curl "http://localhost:1004/api/dashboard" | python -c "import sys,json; d=json.load(sys.stdin); print(f'rows: {d[\"meta\"][\"totalRows\"]}, countries: {d[\"meta\"][\"countries\"]}')"
```

Expected: `rows: >0, countries: ['DE', 'ES', 'FR', 'TH', 'TW', 'US', '레진 KR', '봄툰 KR']`

- [ ] **Step 5: 브라우저에서 대시보드 확인**

`http://localhost:1004/dashboard`에서:
1. KPI 카드 4개에 실수치 표시됨 (₩ 단위)
2. ROAS 추이 차트에 라인이 표시됨
3. 매체별 Bar 차트에 데이터 표시됨
4. 필터 변경 시 데이터 갱신됨
5. 사이드바 하단에 동기화 상태 표시됨
6. Sync 버튼 클릭 시 동기화 실행됨

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "feat: Phase 0 complete — data pipeline stabilized with 8 sheets"
```
