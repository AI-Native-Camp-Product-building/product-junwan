-- =============================================================================
-- AdInsight Supabase Schema
-- Marketing analytics dashboard — raw data from 8 Google Sheets
-- =============================================================================
-- Design decisions:
--   1. ad_raw stores exactly what the Google Sheets contain. No transformations.
--      Currency columns are split into _local and _krw pairs at ingest time
--      because different sheets use different header names for the same concept.
--   2. Mapping tables (medium_map, goal_map, creative_type_map) normalise the
--      free-text values from sheets. Changing a mapping retroactively affects
--      all downstream queries without touching raw data.
--   3. The ad_normalized view joins raw + mappings and handles month-format
--      normalization ("2026년 1월" -> "2026-01") in SQL.
--   4. sheet_sync_log tracks every sync run so we can detect freshness issues.
--   5. All tables use bigint IDs (Supabase default) for RLS compatibility.
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
-- moddatetime: auto-update updated_at columns
create extension if not exists moddatetime schema extensions;

-- ─── ENUM: sheet source identifiers ─────────────────────────────────────────
-- Using a lookup table instead of enum so new sheets can be added without DDL.

-- =============================================================================
-- 1. sheet_source — registered Google Sheets
-- =============================================================================
create table if not exists public.sheet_source (
  id            bigint generated always as identity primary key,
  name          text    not null unique,            -- "레진 KR", "US", etc.
  sheet_id      text    not null unique,            -- Google Sheet document ID
  tab_name      text    not null default '시트1',    -- which tab to read
  header_row    int     not null default 10,        -- 1-indexed row where headers live
  country_code  text    not null,                   -- ISO 3166-1 alpha-2 (KR, US, DE...)
  currency_local text   not null default 'KRW',     -- local currency code
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.sheet_source is
  'Registry of Google Sheets that feed ad_raw. Each row = one sheet tab.';

-- Seed the 8 known sheets
insert into public.sheet_source (name, sheet_id, tab_name, header_row, country_code, currency_local) values
  ('레진 KR',  '1HMyzye86YxhgdZ0bG1vYHb7QeJBi-oI_CGYacxXh2hE', '시트1',    11, 'KR', 'KRW'),
  ('봄툰 KR',  '1rr45aW4SP3Dqwd6grMVpDZohNw0RXfXtjWbfKXEUouU', '봄툰KR',  10, 'KR', 'KRW'),
  ('US',       '1xGGd_TY6iFCiyqEoVwMrYzACfpcBMSc8hnBd_qN6vjg', '시트1',    11, 'US', 'USD'),
  ('DE',       '1eUMAADMhoRt5eZBq4iyIElgDTGxiPW9LFqyNl0VJ0t0', '시트1',    10, 'DE', 'EUR'),
  ('FR',       '1lirrJfP6duAPJB36-ybXR4_tLTFJwPylg6SwdAizc2w', '시트1',    12, 'FR', 'EUR'),
  ('TH',       '1CCisdkklYhSFRhEe1HvN-j9U6bWHAINqyEcP1hfnK0U', '시트1',    10, 'TH', 'THB'),
  ('TW',       '1zH-WAZyx_DGs9_8KykiVHWN-BCNvmODuTP_ean4cGdc', '시트1',    10, 'TW', 'TWD'),
  ('ES',       '1V_EpN-LfmKNnIuxJfRf8MJz304uZch4L27D-HCHezbw', '시트1',    11, 'ES', 'EUR')
on conflict (name) do nothing;


-- =============================================================================
-- 2. ad_raw — immutable raw advertising data from Google Sheets
-- =============================================================================
-- Design: one row per sheet row. Values stored exactly as read from the sheet.
-- Currency handling:
--   ad_spend_local  = 광고비 / 광고비(USD) / 광고비(유로)  (original currency)
--   ad_spend_krw    = 원화 / 광고비(KRW)                   (KRW equivalent)
--   revenue_local   = 결제금액 / 결제금액(USD)              (original currency)
--   revenue_krw     = 결제금액(KRW) / 결제금액 원화         (KRW equivalent, nullable)
-- For KR sheets, ad_spend_local == ad_spend_krw (both KRW).

create table if not exists public.ad_raw (
  id                bigint generated always as identity primary key,

  -- Source tracking
  sheet_source_id   bigint    not null references public.sheet_source(id),
  sheet_row_number  int,                              -- original row number in sheet

  -- Dimension columns (stored as-is from sheet)
  month_raw         text,                             -- "2026-01" or "2026년 1월"
  date_raw          text,                             -- "2026-01-15" as text from sheet
  medium_raw        text,                             -- 매체 raw value
  goal_raw          text,                             -- 목표 raw value
  creative_type_raw text,                             -- 소재종류 raw value
  creative_name     text,                             -- 소재 (작품명)

  -- Monetary columns (see currency handling note above)
  ad_spend_local    numeric(18,2),                    -- 광고비 in local currency
  ad_spend_krw      numeric(18,2),                    -- 광고비 in KRW
  revenue_local     numeric(18,2),                    -- 결제금액 in local currency
  revenue_krw       numeric(18,2),                    -- 결제금액 in KRW (nullable for sheets without it)

  -- Performance columns
  impressions       bigint,                           -- 노출수
  clicks            bigint,                           -- 클릭
  ctr_raw           numeric(10,4),                    -- CTR (stored as-is; may be ratio or %)
  signups           int,                              -- 회원가입
  signup_cpa_raw    numeric(18,2),                    -- 가입CPA
  conversions       int,                              -- 결제전환
  roas_raw          numeric(10,4),                    -- ROAS (stored as-is)

  -- Audit columns
  sync_run_id       bigint,                           -- FK to sheet_sync_log, nullable
  ingested_at       timestamptz not null default now(),

  -- Dedup constraint: same sheet + same row number = same record
  constraint uq_ad_raw_source_row unique (sheet_source_id, sheet_row_number)
);

comment on table public.ad_raw is
  'Raw advertising data ingested from Google Sheets. Never modified after insert. '
  'One row per sheet row. Currency columns normalised to _local/_krw pairs at ingest.';

-- Indexes for common query patterns
create index if not exists idx_ad_raw_sheet    on public.ad_raw (sheet_source_id);
create index if not exists idx_ad_raw_date     on public.ad_raw (date_raw);
create index if not exists idx_ad_raw_month    on public.ad_raw (month_raw);
create index if not exists idx_ad_raw_medium   on public.ad_raw (medium_raw);
create index if not exists idx_ad_raw_ingested on public.ad_raw (ingested_at);


-- =============================================================================
-- 3. medium_map — media channel normalization
-- =============================================================================
-- Maps raw 매체 strings to a canonical name.
-- Example: "메타", "Meta", "Facebook" all map to "Meta".

create table if not exists public.medium_map (
  id              bigint generated always as identity primary key,
  raw_value       text   not null unique,             -- exact string from sheet
  normalized      text   not null,                    -- canonical display name
  created_at      timestamptz not null default now()
);

comment on table public.medium_map is
  'Lookup table mapping raw 매체 values to normalised media channel names. '
  'Adding a row here instantly affects all dashboard queries via the ad_normalized view.';

insert into public.medium_map (raw_value, normalized) values
  ('메타',         'Meta'),
  ('Meta',         'Meta'),
  ('Facebook',     'Meta'),
  ('유튜브',       'YouTube'),
  ('구글GDN',      'Google GDN'),
  ('트위터',       'X(Twitter)'),
  ('핀터레스트',   'Pinterest'),
  ('Pinterest',    'Pinterest'),
  ('TikTok Ads',   'TikTok'),
  ('Snapchat',     'Snapchat'),
  ('.',            'none'),
  ('',             'none')
on conflict (raw_value) do nothing;


-- =============================================================================
-- 4. goal_map — campaign goal normalization
-- =============================================================================

create table if not exists public.goal_map (
  id              bigint generated always as identity primary key,
  raw_value       text   not null unique,
  normalized      text   not null,
  created_at      timestamptz not null default now()
);

comment on table public.goal_map is
  'Lookup table mapping raw 목표 values to normalised campaign goal names.';

insert into public.goal_map (raw_value, normalized) values
  ('결제',         '결제'),
  ('구매',         '결제'),
  ('첫결제',       '첫결제'),
  ('가입',         '가입'),
  ('가입&결제',    '가입&결제'),
  ('.',            'none'),
  ('',             'none')
on conflict (raw_value) do nothing;


-- =============================================================================
-- 5. creative_type_map — creative type normalization
-- =============================================================================

create table if not exists public.creative_type_map (
  id              bigint generated always as identity primary key,
  raw_value       text   not null unique,
  normalized      text   not null,
  created_at      timestamptz not null default now()
);

comment on table public.creative_type_map is
  'Lookup table mapping raw 소재종류 values to normalised creative type names.';

insert into public.creative_type_map (raw_value, normalized) values
  ('영상(한익게)',         '영상(한익게)'),
  ('한익게',               '영상(한익게)'),
  ('PV',                   '영상(PV)'),
  ('영상(PV)',             '영상(PV)'),
  ('영상(FB)',             '영상(FB)'),
  ('영상(추천)',           '영상(추천)'),
  ('영상(바이럴)',         '영상(바이럴)'),
  ('이미지 (영화자막)',    '캐러셀(영화자막)'),
  ('캐러셀(영화자막)',     '캐러셀(영화자막)'),
  ('웹툰리뷰',            '웹툰리뷰'),
  ('그 외 (챌린지 등)',    '그 외 (챌린지 등)')
on conflict (raw_value) do nothing;


-- =============================================================================
-- 6. sheet_sync_log — sync run tracking
-- =============================================================================
-- One row per sync attempt. Tracks success/failure, row counts, and duration
-- so we can monitor freshness SLAs and debug failures.

create table if not exists public.sheet_sync_log (
  id              bigint generated always as identity primary key,
  sheet_source_id bigint    not null references public.sheet_source(id),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text      not null default 'running'
                  check (status in ('running', 'success', 'failed', 'partial')),
  rows_fetched    int,                                -- rows read from sheet
  rows_upserted   int,                                -- rows written to ad_raw
  rows_skipped    int       default 0,                -- rows skipped (empty/invalid)
  error_message   text,                               -- null on success
  duration_ms     int generated always as (
    case when finished_at is not null
      then extract(epoch from (finished_at - started_at))::int * 1000
      else null
    end
  ) stored
);

comment on table public.sheet_sync_log is
  'Audit log for every Google Sheets sync run. '
  'Used for freshness monitoring and failure alerting.';

create index if not exists idx_sync_log_sheet   on public.sheet_sync_log (sheet_source_id);
create index if not exists idx_sync_log_status  on public.sheet_sync_log (status);
create index if not exists idx_sync_log_started on public.sheet_sync_log (started_at desc);


-- =============================================================================
-- 7. ad_normalized — dashboard-ready view
-- =============================================================================
-- Joins ad_raw with all three mapping tables and normalises month format.
-- This is the ONLY thing the frontend/API should query.

create or replace view public.ad_normalized as
select
  r.id,
  r.sheet_source_id,
  s.name                                              as sheet_name,
  s.country_code,
  s.currency_local,

  -- Month normalization: "2026년 1월" -> "2026-01", passthrough otherwise
  case
    when r.month_raw ~ '^\d{4}년\s*\d{1,2}월$' then
      substring(r.month_raw from '^\d{4}')
      || '-'
      || lpad(substring(r.month_raw from '(\d{1,2})월$'), 2, '0')
    else r.month_raw
  end                                                 as month,

  -- Parse date_raw to proper date; null if unparseable
  case
    when r.date_raw ~ '^\d{4}-\d{2}-\d{2}$' then r.date_raw::date
    else null
  end                                                 as ad_date,

  -- Normalised dimensions (fall back to raw value if no mapping exists)
  coalesce(mm.normalized, r.medium_raw)               as medium,
  coalesce(gm.normalized, r.goal_raw)                 as goal,
  coalesce(ct.normalized, r.creative_type_raw)        as creative_type,
  r.creative_name,

  -- Raw dimension values preserved for debugging
  r.medium_raw,
  r.goal_raw,
  r.creative_type_raw,

  -- Monetary (always available in both local and KRW)
  r.ad_spend_local,
  r.ad_spend_krw,
  r.revenue_local,
  r.revenue_krw,

  -- Performance metrics
  r.impressions,
  r.clicks,
  r.ctr_raw                                          as ctr,
  r.signups,
  r.signup_cpa_raw                                   as signup_cpa,
  r.conversions,
  r.roas_raw                                         as roas,

  -- Computed: ROAS from KRW values (more comparable across countries)
  case
    when r.ad_spend_krw > 0
    then round((r.revenue_krw / r.ad_spend_krw)::numeric, 4)
    else null
  end                                                 as roas_krw_computed,

  r.ingested_at

from public.ad_raw r
  join public.sheet_source s on s.id = r.sheet_source_id
  left join public.medium_map mm on mm.raw_value = coalesce(r.medium_raw, '')
  left join public.goal_map gm on gm.raw_value = coalesce(r.goal_raw, '')
  left join public.creative_type_map ct on ct.raw_value = coalesce(r.creative_type_raw, '');

comment on view public.ad_normalized is
  'Dashboard-ready view. Joins ad_raw with mapping tables for normalised dimensions. '
  'Month format is unified to YYYY-MM. This is the only interface for frontend queries.';


-- =============================================================================
-- 8. Convenience view: latest sync per sheet
-- =============================================================================

create or replace view public.sheet_sync_latest as
select distinct on (sheet_source_id)
  l.id              as sync_id,
  l.sheet_source_id,
  s.name            as sheet_name,
  l.status,
  l.rows_fetched,
  l.rows_upserted,
  l.started_at,
  l.finished_at,
  l.duration_ms,
  l.error_message
from public.sheet_sync_log l
  join public.sheet_source s on s.id = l.sheet_source_id
order by l.sheet_source_id, l.started_at desc;

comment on view public.sheet_sync_latest is
  'Most recent sync run per sheet. Use for freshness monitoring dashboard.';


-- =============================================================================
-- 9. Row Level Security (RLS)
-- =============================================================================
-- Policy: anon and authenticated roles can read all tables.
-- Only service_role (used by the sync API route) can write.

alter table public.sheet_source   enable row level security;
alter table public.ad_raw         enable row level security;
alter table public.medium_map     enable row level security;
alter table public.goal_map       enable row level security;
alter table public.creative_type_map enable row level security;
alter table public.sheet_sync_log enable row level security;

-- Read policies (anon + authenticated)
create policy "Allow public read on sheet_source"
  on public.sheet_source for select
  using (true);

create policy "Allow public read on ad_raw"
  on public.ad_raw for select
  using (true);

create policy "Allow public read on medium_map"
  on public.medium_map for select
  using (true);

create policy "Allow public read on goal_map"
  on public.goal_map for select
  using (true);

create policy "Allow public read on creative_type_map"
  on public.creative_type_map for select
  using (true);

create policy "Allow public read on sheet_sync_log"
  on public.sheet_sync_log for select
  using (true);

-- Write policies (service_role only — used by Next.js API routes via supabase-admin client)
create policy "Service role can insert ad_raw"
  on public.ad_raw for insert
  to service_role
  with check (true);

create policy "Service role can update ad_raw"
  on public.ad_raw for update
  to service_role
  using (true);

create policy "Service role can insert sheet_sync_log"
  on public.sheet_sync_log for insert
  to service_role
  with check (true);

create policy "Service role can update sheet_sync_log"
  on public.sheet_sync_log for update
  to service_role
  using (true);

create policy "Service role can manage medium_map"
  on public.medium_map for all
  to service_role
  using (true);

create policy "Service role can manage goal_map"
  on public.goal_map for all
  to service_role
  using (true);

create policy "Service role can manage creative_type_map"
  on public.creative_type_map for all
  to service_role
  using (true);

create policy "Service role can manage sheet_source"
  on public.sheet_source for all
  to service_role
  using (true);


-- =============================================================================
-- 10. Auto-update updated_at on sheet_source
-- =============================================================================

create trigger handle_updated_at
  before update on public.sheet_source
  for each row
  execute procedure extensions.moddatetime(updated_at);


-- =============================================================================
-- Done. Summary:
-- =============================================================================
-- Tables:  sheet_source, ad_raw, medium_map, goal_map, creative_type_map, sheet_sync_log
-- Views:   ad_normalized (dashboard queries), sheet_sync_latest (freshness monitoring)
-- RLS:     Public read on all tables, service_role write on all tables
-- Indexes: ad_raw indexed on sheet, date, month, medium, ingested_at
--          sheet_sync_log indexed on sheet, status, started_at
-- =============================================================================
