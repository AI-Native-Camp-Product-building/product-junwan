import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { QueryDefinition, SavedQuery } from "@/types/query";

/**
 * GET /api/saved-queries — 저장된 쿼리 목록 조회
 */
export async function GET() {
  const { data, error } = await supabase
    .from("saved_queries")
    .select("*")
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as SavedQuery[]);
}

/**
 * POST /api/saved-queries — 새 쿼리 저장
 * Body: { name: string, description?: string, query: QueryDefinition, created_by?: string }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, query, created_by } = body as {
    name: string;
    description?: string;
    query: QueryDefinition;
    created_by?: string;
  };

  if (!name || !query) {
    return NextResponse.json(
      { error: "name과 query는 필수입니다." },
      { status: 400 },
    );
  }

  if (!query.metrics || query.metrics.length === 0) {
    return NextResponse.json(
      { error: "최소 1개의 지표가 필요합니다." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("saved_queries")
    .insert({
      name,
      description: description ?? null,
      query,
      created_by: created_by ?? null,
      is_default: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as SavedQuery, { status: 201 });
}

/**
 * DELETE /api/saved-queries — 저장된 쿼리 삭제
 * Body: { id: number }
 */
export async function DELETE(request: Request) {
  const body = await request.json();
  const { id } = body as { id: number };

  if (!id) {
    return NextResponse.json({ error: "id는 필수입니다." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 기본 프리셋은 삭제 불가
  const { data: existing } = await admin
    .from("saved_queries")
    .select("is_default")
    .eq("id", id)
    .single();

  if (existing?.is_default) {
    return NextResponse.json(
      { error: "기본 프리셋은 삭제할 수 없습니다." },
      { status: 403 },
    );
  }

  const { error } = await admin.from("saved_queries").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
