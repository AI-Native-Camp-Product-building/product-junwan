-- =============================================================================
-- saved_queries — 저장된 쿼리 프리셋
-- Supabase SQL Editor에서 실행
-- =============================================================================

-- 테이블 생성
create table if not exists public.saved_queries (
  id          bigint generated always as identity primary key,
  name        text    not null,
  description text,
  query       jsonb   not null,      -- QueryDefinition JSON
  created_by  text,                  -- 사용자 이메일 (optional)
  is_default  boolean not null default false, -- 기본 프리셋 여부
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.saved_queries is
  'Saved query presets for the Explore page. Stores QueryDefinition as JSONB.';

-- Indexes
create index if not exists idx_saved_queries_created_by on public.saved_queries (created_by);
create index if not exists idx_saved_queries_is_default on public.saved_queries (is_default);

-- RLS
alter table public.saved_queries enable row level security;

create policy "Allow public read on saved_queries"
  on public.saved_queries for select
  using (true);

create policy "Service role can manage saved_queries"
  on public.saved_queries for all
  to service_role
  using (true);

-- Auto-update updated_at
create trigger handle_saved_queries_updated_at
  before update on public.saved_queries
  for each row
  execute procedure extensions.moddatetime(updated_at);

-- =============================================================================
-- 기본 프리셋 시드 데이터 (선택사항)
-- =============================================================================
insert into public.saved_queries (name, description, query, is_default) values
(
  '국가별 광고비 & ROAS',
  '국가별 광고비와 ROAS 비교',
  '{"dimensions":["country"],"metrics":["ad_spend_krw","roas"],"filters":[],"dateRange":null}'::jsonb,
  true
),
(
  '매체별 성과 요약',
  '매체별 광고비, 클릭, 가입, ROAS',
  '{"dimensions":["medium"],"metrics":["ad_spend_krw","clicks","signups","roas"],"filters":[],"dateRange":null}'::jsonb,
  true
),
(
  '월별 광고비 추이',
  '월별 총 광고비 추이',
  '{"dimensions":["month"],"metrics":["ad_spend_krw","revenue_krw","roas"],"filters":[],"dateRange":null,"sort":{"field":"month","direction":"asc"}}'::jsonb,
  true
),
(
  '작품별 가입 CPA',
  '작품별 광고비, 가입수, 가입 CPA',
  '{"dimensions":["creative_name"],"metrics":["ad_spend_krw","signups","signup_cpa"],"filters":[],"dateRange":null,"sort":{"field":"signups","direction":"desc"}}'::jsonb,
  true
)
on conflict do nothing;
