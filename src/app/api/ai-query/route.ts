import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { QueryDefinition, FilterCondition } from "@/types/query";

const SYSTEM_PROMPT = `당신은 AdInsight 광고 성과 분석 도구의 쿼리 생성기입니다.
사용자의 자연어 요청을 아래 정확한 JSON 스키마로 변환하세요.

## 정확한 JSON 스키마 (이 구조를 반드시 따르세요)
{
  "dimensions": ["country"],           // string[] — 아래 허용 값만
  "metrics": ["ad_spend_krw", "roas"], // string[] — 아래 허용 값만
  "filters": [                         // FilterCondition[] — 비어있을 수 있음
    { "field": "country", "operator": "eq", "value": "레진 KR" }
  ],
  "dateRange": { "start": "2026-04-01", "end": "2026-04-30" },  // 반드시 포함
  "compare": null,                     // 비교 없으면 null 또는 생략
  "sort": { "field": "roas", "direction": "desc" },
  "limit": 1000
}

## 차원 (dimensions) 허용 값
"country", "month", "date", "medium", "goal", "creative_type", "creative_name"

## 지표 (metrics) 허용 값
"ad_spend_krw", "revenue_krw", "impressions", "clicks", "signups", "conversions", "roas", "ctr", "signup_cpa"

## 필터 (filters) — 각 항목은 반드시 이 3개 키를 가져야 함
- "field": 차원 키 (예: "country", "medium", "creative_name")
- "operator": "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "like"
- "value": 문자열 또는 문자열 배열 (in 연산자일 때)

## 국가 값
"레진 KR", "봄툰 KR", "US", "DE", "FR", "TH", "TW", "ES"

## 매체 값
"Meta", "YouTube", "Google GDN", "X(Twitter)", "Pinterest", "TikTok", "Snapchat"

## 비교 모드 (compare)
기간 비교: { "type": "period", "baseRange": { "start": "...", "end": "..." }, "compareRange": { "start": "...", "end": "..." } }
항목 비교: { "type": "item", "dimension": "creative_name", "baseValue": "작품A", "compareValue": "작품B" }

## 핵심 규칙
1. 오늘: ${new Date().toISOString().slice(0, 10)}
2. "4월" = { "start": "2026-04-01", "end": "2026-04-30" }. dateRange는 반드시 포함!
3. 특정 국가/매체/작품 언급 → filters 배열에 추가 (field/operator/value)
4. "성과", "전체" 등 모호한 요청 → metrics에 ad_spend_krw, roas, signups, conversions 포함
5. A랑 B 비교 → 반드시 compare 필드 사용!
6. 순수 JSON만 반환. 마크다운 코드블록 없이.

## 예시

입력: "레진 KR 4월 ROAS 보여줘"
출력:
{"dimensions":["country"],"metrics":["roas"],"filters":[{"field":"country","operator":"eq","value":"레진 KR"}],"dateRange":{"start":"2026-04-01","end":"2026-04-30"}}

입력: "렌탈걸즈랑 하렘의남자 4월 성과 비교"
출력:
{"dimensions":[],"metrics":["ad_spend_krw","roas","signups","conversions"],"filters":[],"dateRange":{"start":"2026-04-01","end":"2026-04-30"},"compare":{"type":"item","dimension":"creative_name","baseValue":"렌탈걸즈","compareValue":"하렘의남자"}}

입력: "3월 대비 4월 국가별 광고비 비교"
출력:
{"dimensions":["country"],"metrics":["ad_spend_krw"],"filters":[],"dateRange":{"start":"2026-04-01","end":"2026-04-30"},"compare":{"type":"period","baseRange":{"start":"2026-04-01","end":"2026-04-30"},"compareRange":{"start":"2026-03-01","end":"2026-03-31"}}}`;

// ---------------------------------------------------------------------------
// Normalize AI response to match our exact QueryDefinition shape
// ---------------------------------------------------------------------------

function normalizeFilter(raw: Record<string, unknown>): FilterCondition | null {
  const field = (raw.field ?? raw.dimension ?? raw.column ?? "") as string;
  const operator = (raw.operator ?? raw.op ?? "eq") as string;
  let value = raw.value ?? raw.values ?? "";

  if (!field) return null;

  // "values" array → flatten for "in" operator
  if (Array.isArray(value) && operator !== "in" && operator !== "not_in") {
    value = value[0] ?? "";
  }

  return { field, operator, value } as FilterCondition;
}

function normalizeQuery(raw: Record<string, unknown>): QueryDefinition {
  const dimensions = (raw.dimensions ?? []) as string[];
  const metrics = (raw.metrics ?? []) as string[];

  // Normalize filters
  const rawFilters = (raw.filters ?? []) as Record<string, unknown>[];
  const filters = rawFilters
    .map(normalizeFilter)
    .filter((f): f is FilterCondition => f !== null);

  // Normalize dateRange
  let dateRange = null;
  if (raw.dateRange && typeof raw.dateRange === "object") {
    const dr = raw.dateRange as Record<string, string>;
    if (dr.start && dr.end) {
      dateRange = { start: dr.start, end: dr.end };
    }
  }
  // Fallback: extract date from filters if dateRange is missing
  if (!dateRange) {
    const monthFilter = filters.find((f) => f.field === "month");
    if (monthFilter && typeof monthFilter.value === "string") {
      const m = monthFilter.value; // "2026-04"
      const year = parseInt(m.slice(0, 4));
      const month = parseInt(m.slice(5, 7));
      const lastDay = new Date(year, month, 0).getDate();
      dateRange = {
        start: `${m}-01`,
        end: `${m}-${String(lastDay).padStart(2, "0")}`,
      };
      // Remove month filter since we're using dateRange
      const idx = filters.indexOf(monthFilter);
      if (idx !== -1) filters.splice(idx, 1);
    }
  }

  // Normalize compare
  let compare = undefined;
  if (raw.compare && typeof raw.compare === "object" && (raw.compare as Record<string, unknown>).type) {
    compare = raw.compare as QueryDefinition["compare"];
  }

  // Normalize sort
  let sort = undefined;
  if (raw.sort && typeof raw.sort === "object") {
    const s = raw.sort as Record<string, string>;
    if (s.field) {
      sort = { field: s.field, direction: (s.direction ?? "desc") as "asc" | "desc" };
    }
  }

  return {
    dimensions: dimensions as QueryDefinition["dimensions"],
    metrics: metrics as QueryDefinition["metrics"],
    filters,
    dateRange,
    compare,
    sort,
    limit: typeof raw.limit === "number" ? raw.limit : 1000,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const { prompt } = (await request.json()) as { prompt: string };

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "질문을 입력해주세요." },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(prompt);

    const text = result.response.text().trim();
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    const rawQuery = JSON.parse(jsonStr) as Record<string, unknown>;
    const query = normalizeQuery(rawQuery);

    // Post-processing: detect comparison intent from the original prompt
    if (!query.compare) {
      const compareMatch = prompt.match(/(.+?)[와과랑이랑]\s*(.+?)\s*(비교|차이|vs)/);
      if (compareMatch) {
        const itemA = compareMatch[1].trim();
        const itemB = compareMatch[2].trim();
        // Determine which dimension these items belong to
        const countries = ["레진 KR", "봄툰 KR", "US", "DE", "FR", "TH", "TW", "ES"];
        const mediums = ["Meta", "YouTube", "Google GDN", "X(Twitter)", "Pinterest", "TikTok", "Snapchat"];

        let dimension: string = "creative_name";
        if (countries.includes(itemA) || countries.includes(itemB)) {
          dimension = "country";
        } else if (mediums.includes(itemA) || mediums.includes(itemB)) {
          dimension = "medium";
        }

        query.compare = {
          type: "item",
          dimension: dimension as QueryDefinition["dimensions"][number],
          baseValue: itemA,
          compareValue: itemB,
        };
        // Remove filters that duplicate the compare items
        query.filters = query.filters.filter(
          (f) => f.value !== itemA && f.value !== itemB,
        );
      }

      // Detect period comparison: "3월 대비 4월", "전월 비교"
      const periodMatch = prompt.match(/(\d{1,2})월\s*(대비|비교|vs)\s*(\d{1,2})월/);
      if (periodMatch && query.dateRange) {
        const year = new Date().getFullYear();
        const compMonth = parseInt(periodMatch[1]);
        const baseMonth = parseInt(periodMatch[3]);
        const lastDayComp = new Date(year, compMonth, 0).getDate();
        const lastDayBase = new Date(year, baseMonth, 0).getDate();
        query.compare = {
          type: "period",
          baseRange: {
            start: `${year}-${String(baseMonth).padStart(2, "0")}-01`,
            end: `${year}-${String(baseMonth).padStart(2, "0")}-${lastDayBase}`,
          },
          compareRange: {
            start: `${year}-${String(compMonth).padStart(2, "0")}-01`,
            end: `${year}-${String(compMonth).padStart(2, "0")}-${lastDayComp}`,
          },
        };
      }
    }

    return NextResponse.json({ query });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 처리 실패";
    console.error("[api/ai-query] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
