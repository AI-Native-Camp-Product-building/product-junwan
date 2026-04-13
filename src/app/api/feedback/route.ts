import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import type { FeedbackCategory } from "@/types/feedback";

const VALID_CATEGORIES = ["bug", "feature", "data_error", "other"];
const VALID_STATUSES = ["open", "resolved", "dismissed"];
const MAX_MESSAGE_LENGTH = 5000;

/**
 * GET /api/feedback
 * Admin: 전체 목록 (status 필터 옵션)
 * 일반 유저: 본인 피드백만
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  let query = supabase
    .from("user_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isAdmin(session.user.email)) {
    query = query.eq("user_email", session.user.email);
  }

  if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "피드백 조회에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/feedback — 피드백 제출
 * Body: { category, message, pageUrl }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { category, message, pageUrl } = body as {
    category: FeedbackCategory;
    message: string;
    pageUrl?: string;
  };

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "유효한 카테고리를 선택하세요." }, { status: 400 });
  }

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: "메시지를 입력하세요." }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `메시지는 ${MAX_MESSAGE_LENGTH}자 이내여야 합니다.` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_feedback")
    .insert({
      user_email: session.user.email,
      user_name: session.user.name ?? null,
      category,
      message: message.trim(),
      page_url: pageUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "피드백 제출에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * PATCH /api/feedback — 상태/메모 변경 (admin only)
 * Body: { id, status?, adminMemo? }
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json();
  const { id, status, adminMemo } = body as {
    id: string;
    status?: string;
    adminMemo?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "id는 필수입니다." }, { status: 400 });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "유효하지 않은 상태입니다." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (adminMemo !== undefined) updates.admin_memo = adminMemo;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("user_feedback")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "피드백 수정에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/feedback — 피드백 삭제 (admin only)
 * Body: { id }
 */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "id는 필수입니다." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("user_feedback").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "피드백 삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
