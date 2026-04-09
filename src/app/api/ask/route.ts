import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { executeQuery, QueryValidationError } from "@/lib/query-engine";
import type { QueryDefinition, FilterCondition } from "@/types/query";

// ---------------------------------------------------------------------------
// System prompt for Gemini (same as ai-query)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `당신은 AdInsight 광고 성과 분석 도구의 쿼리 생성기입니다.
사용자의 자연어 요청을 아래 정확한 JSON 스키마로 변환하세요.

## 정확한 JSON 스키마
{
  "dimensions": ["country"],
  "metrics": ["ad_spend_krw", "roas"],
  "filters": [
    { "field": "country", "operator": "eq", "value": "레진 KR" }
  ],
  "dateRange": { "start": "2026-04-01", "end": "2026-04-30" },
  "sort": { "field": "roas", "direction": "desc" },
  "limit": 1000
}

## 차원 (dimensions) 허용 값
"country", "month", "date", "medium", "goal", "creative_type", "creative_name"

## 지표 (metrics) 허용 값
"ad_spend_krw", "revenue_krw", "impressions", "clicks", "signups", "conversions", "roas", "ctr", "signup_cpa"

## 필터 (filters)
- "field": 차원 키
- "operator": "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "like"
- "value": 문자열 또는 문자열 배열

## 국가 값
"레진 KR", "봄툰 KR", "US", "DE", "FR", "TH", "TW", "ES"

## 매체 값
"Meta", "YouTube", "Google GDN", "X(Twitter)", "Pinterest", "TikTok", "Snapchat"

## 핵심 규칙
1. 오늘: ${new Date().toISOString().slice(0, 10)}
2. "3월" = { "start": "2026-03-01", "end": "2026-03-31" }. dateRange 반드시 포함!
3. 특정 국가/매체/작품 언급 → filters에 추가
4. "성과", "전체" 등 모호한 요청 → metrics에 ad_spend_krw, roas, signups, conversions 포함
5. 순수 JSON만 반환. 마크다운 코드블록 없이.`;

// ---------------------------------------------------------------------------
// Normalize helpers
// ---------------------------------------------------------------------------

function normalizeFilter(raw: Record<string, unknown>): FilterCondition | null {
  const field = (raw.field ?? raw.dimension ?? raw.column ?? "") as string;
  const operator = (raw.operator ?? raw.op ?? "eq") as string;
  let value = raw.value ?? raw.values ?? "";
  if (!field) return null;
  if (Array.isArray(value) && operator !== "in" && operator !== "not_in") {
    value = value[0] ?? "";
  }
  return { field, operator, value } as FilterCondition;
}

function normalizeQuery(raw: Record<string, unknown>): QueryDefinition {
  const dimensions = (raw.dimensions ?? []) as string[];
  const metrics = (raw.metrics ?? []) as string[];
  const rawFilters = (raw.filters ?? []) as Record<string, unknown>[];
  const filters = rawFilters.map(normalizeFilter).filter((f): f is FilterCondition => f !== null);

  let dateRange = null;
  if (raw.dateRange && typeof raw.dateRange === "object") {
    const dr = raw.dateRange as Record<string, string>;
    if (dr.start && dr.end) dateRange = { start: dr.start, end: dr.end };
  }
  if (!dateRange) {
    const monthFilter = filters.find((f) => f.field === "month");
    if (monthFilter && typeof monthFilter.value === "string") {
      const m = monthFilter.value;
      const year = parseInt(m.slice(0, 4));
      const month = parseInt(m.slice(5, 7));
      const lastDay = new Date(year, month, 0).getDate();
      dateRange = { start: `${m}-01`, end: `${m}-${String(lastDay).padStart(2, "0")}` };
      const idx = filters.indexOf(monthFilter);
      if (idx !== -1) filters.splice(idx, 1);
    }
  }

  let sort = undefined;
  if (raw.sort && typeof raw.sort === "object") {
    const s = raw.sort as Record<string, string>;
    if (s.field) sort = { field: s.field, direction: (s.direction ?? "desc") as "asc" | "desc" };
  }

  return {
    dimensions: dimensions as QueryDefinition["dimensions"],
    metrics: metrics as QueryDefinition["metrics"],
    filters,
    dateRange,
    sort,
    limit: typeof raw.limit === "number" ? raw.limit : 1000,
  };
}

// ---------------------------------------------------------------------------
// Rate limiter — IP당 분당 최대 호출 수 제한
// ---------------------------------------------------------------------------

const RATE_LIMIT = 10; // 분당 최대 10회
const RATE_WINDOW_MS = 60_000; // 1분

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

// ---------------------------------------------------------------------------
// POST /api/ask — 자연어 → AI 변환 → 쿼리 실행 → 결과 반환
// ---------------------------------------------------------------------------

/**
 * @api {post} /api/ask Natural Language Query
 * @body { "q": "레진 KR 3월 국가별 광고비" }
 * @returns { query: QueryDefinition, result: QueryResult }
 */
export async function POST(request: NextRequest) {
  // API temporarily disabled
  return NextResponse.json(
    { error: "This API is currently disabled." },
    { status: 503 },
  );

  // Rate limit check
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. 분당 최대 10회까지 호출 가능합니다." },
      { status: 429 },
    );
  }

  // API key auth (optional — if ASK_API_KEY is set, require it)
  const requiredKey = process.env.ASK_API_KEY;
  if (requiredKey) {
    const authHeader = request.headers.get("authorization");
    const providedKey = authHeader?.replace(/^Bearer\s+/i, "");
    if (providedKey !== requiredKey) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid Bearer token." },
        { status: 401 },
      );
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const prompt = (body.q ?? body.prompt ?? body.text ?? "") as string;

    if (!prompt.trim()) {
      return NextResponse.json(
        { error: "q 파라미터에 질문을 입력해주세요. 예: { \"q\": \"레진 KR 3월 광고비\" }" },
        { status: 400 },
      );
    }

    // Step 1: AI — 자연어 → QueryDefinition
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
      systemInstruction: SYSTEM_PROMPT,
    });

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text().trim();
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const rawQuery = JSON.parse(jsonStr) as Record<string, unknown>;
    const query = normalizeQuery(rawQuery);

    // Step 2: Execute — QueryDefinition → 데이터 조회
    const result = await executeQuery(query);

    return NextResponse.json({
      prompt,
      query,
      result,
    });
  } catch (error) {
    if (error instanceof QueryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/ask] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
