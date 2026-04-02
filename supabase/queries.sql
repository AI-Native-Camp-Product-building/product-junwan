-- =============================================================================
-- AdInsight Summary View Queries
-- Reproduces the 6 tabs of the "종합" Google Sheet from ad_normalized
-- =============================================================================
-- Usage: These functions are called via supabase.rpc() from the Next.js API.
-- All monetary values are KRW. ROAS is percentage (revenue/spend * 100).
-- =============================================================================

-- Drop existing functions first (return type changed from bigint to numeric)
drop function if exists public.weekly_by_locale(date, date);
drop function if exists public.weekly_by_medium(date, date);
drop function if exists public.weekly_by_goal(date, date);
drop function if exists public.monthly_by_locale(text);
drop function if exists public.creative_roas_ranking(date, date, int);
drop function if exists public.creative_cpa_ranking(date, date, int);
drop function if exists public.weekly_master(date, date);
drop function if exists public.available_weeks();
drop function if exists public.available_months();

-- =============================================================================
-- View 1: 주간_로케일별 — Weekly performance by locale with WoW comparison
-- =============================================================================

create or replace function public.weekly_by_locale(
  p_week_start date,
  p_week_end   date
)
returns table (
  sheet_name       text,
  ad_spend_krw     numeric,
  revenue_krw      numeric,
  roas             numeric,
  signups          numeric,
  conversions      numeric,
  signup_cpa       numeric,
  prev_ad_spend_krw numeric,
  prev_revenue_krw  numeric,
  prev_roas        numeric,
  prev_signups     numeric,
  prev_conversions numeric,
  prev_signup_cpa  numeric,
  spend_change_pct numeric,
  roas_change_pp   numeric
)
language plpgsql stable
as $$
begin
  return query
  with current_week as (
    select
      n.sheet_name as sn,
      coalesce(sum(n.ad_spend_krw), 0)   as spend,
      coalesce(sum(n.revenue_krw), 0)    as rev,
      round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) as r,
      coalesce(sum(n.signups), 0)::numeric as su,
      coalesce(sum(n.conversions), 0)::numeric as cv,
      round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0) as cpa
    from public.ad_normalized n
    where n.ad_date >= p_week_start and n.ad_date <= p_week_end
    group by n.sheet_name
  ),
  prev_week as (
    select
      n.sheet_name as sn,
      coalesce(sum(n.ad_spend_krw), 0)   as spend,
      coalesce(sum(n.revenue_krw), 0)    as rev,
      round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) as r,
      coalesce(sum(n.signups), 0)::numeric as su,
      coalesce(sum(n.conversions), 0)::numeric as cv,
      round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0) as cpa
    from public.ad_normalized n
    where n.ad_date >= (p_week_start - interval '7 days')::date
      and n.ad_date <= (p_week_end - interval '7 days')::date
    group by n.sheet_name
  ),
  combined as (
    select
      coalesce(c.sn, p.sn) as sn,
      coalesce(c.spend, 0) as spend, coalesce(c.rev, 0) as rev, coalesce(c.r, 0) as r,
      coalesce(c.su, 0) as su, coalesce(c.cv, 0) as cv, coalesce(c.cpa, 0) as cpa,
      coalesce(p.spend, 0) as p_spend, coalesce(p.rev, 0) as p_rev, coalesce(p.r, 0) as p_r,
      coalesce(p.su, 0) as p_su, coalesce(p.cv, 0) as p_cv, coalesce(p.cpa, 0) as p_cpa
    from current_week c full outer join prev_week p on c.sn = p.sn
  ),
  with_totals as (
    select sn, spend, rev, r, su, cv, cpa, p_spend, p_rev, p_r, p_su, p_cv, p_cpa from combined
    union all
    select 'TOTAL', sum(spend), sum(rev),
      round(sum(rev) * 100.0 / nullif(sum(spend), 0), 0),
      sum(su), sum(cv), round(sum(spend) / nullif(sum(su), 0), 0),
      sum(p_spend), sum(p_rev),
      round(sum(p_rev) * 100.0 / nullif(sum(p_spend), 0), 0),
      sum(p_su), sum(p_cv), round(sum(p_spend) / nullif(sum(p_su), 0), 0)
    from combined
  )
  select
    t.sn, t.spend, t.rev, t.r, t.su, t.cv, t.cpa,
    t.p_spend, t.p_rev, t.p_r, t.p_su, t.p_cv, t.p_cpa,
    round((t.spend - t.p_spend) * 100.0 / nullif(t.p_spend, 0), 2),
    (t.r - t.p_r)
  from with_totals t
  order by case when t.sn = 'TOTAL' then 1 else 0 end, t.spend desc;
end;
$$;

comment on function public.weekly_by_locale is
  '주간_로케일별: Weekly locale-level performance with WoW comparison.';


-- =============================================================================
-- View 2: 주간_매체별 — Weekly performance by locale x medium
-- =============================================================================

create or replace function public.weekly_by_medium(
  p_week_start date,
  p_week_end   date
)
returns table (
  sheet_name   text,
  medium       text,
  ad_spend_krw numeric,
  revenue_krw  numeric,
  roas         numeric,
  signups      numeric,
  conversions  numeric,
  signup_cpa   numeric
)
language plpgsql stable
as $$
begin
  return query
  with data_rows as (
    select
      n.sheet_name as sn, n.medium as med,
      coalesce(sum(n.ad_spend_krw), 0) as spend,
      coalesce(sum(n.revenue_krw), 0) as rev,
      round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) as r,
      coalesce(sum(n.signups), 0)::numeric as su,
      coalesce(sum(n.conversions), 0)::numeric as cv,
      round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0) as cpa
    from public.ad_normalized n
    where n.ad_date >= p_week_start and n.ad_date <= p_week_end
    group by n.sheet_name, n.medium
  ),
  with_totals as (
    select sn, med, spend, rev, r, su, cv, cpa from data_rows
    union all
    select 'TOTAL', 'ALL', sum(spend), sum(rev),
      round(sum(rev) * 100.0 / nullif(sum(spend), 0), 0),
      sum(su), sum(cv), round(sum(spend) / nullif(sum(su), 0), 0)
    from data_rows
  )
  select t.sn, t.med, t.spend, t.rev, t.r, t.su, t.cv, t.cpa
  from with_totals t
  order by case when t.sn = 'TOTAL' then 1 else 0 end, t.spend desc;
end;
$$;

comment on function public.weekly_by_medium is
  '주간_매체별: Weekly locale x medium performance breakdown.';


-- =============================================================================
-- View 3: 주간_목표별 — Weekly performance by locale x goal
-- =============================================================================

create or replace function public.weekly_by_goal(
  p_week_start date,
  p_week_end   date
)
returns table (
  sheet_name   text,
  goal         text,
  ad_spend_krw numeric,
  revenue_krw  numeric,
  roas         numeric,
  signups      numeric,
  conversions  numeric,
  signup_cpa   numeric
)
language plpgsql stable
as $$
begin
  return query
  with data_rows as (
    select
      n.sheet_name as sn, n.goal as g,
      coalesce(sum(n.ad_spend_krw), 0) as spend,
      coalesce(sum(n.revenue_krw), 0) as rev,
      round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) as r,
      coalesce(sum(n.signups), 0)::numeric as su,
      coalesce(sum(n.conversions), 0)::numeric as cv,
      round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0) as cpa
    from public.ad_normalized n
    where n.ad_date >= p_week_start and n.ad_date <= p_week_end
    group by n.sheet_name, n.goal
  ),
  with_totals as (
    select sn, g, spend, rev, r, su, cv, cpa from data_rows
    union all
    select 'TOTAL', 'ALL', sum(spend), sum(rev),
      round(sum(rev) * 100.0 / nullif(sum(spend), 0), 0),
      sum(su), sum(cv), round(sum(spend) / nullif(sum(su), 0), 0)
    from data_rows
  )
  select t.sn, t.g, t.spend, t.rev, t.r, t.su, t.cv, t.cpa
  from with_totals t
  order by case when t.sn = 'TOTAL' then 1 else 0 end, t.spend desc;
end;
$$;

comment on function public.weekly_by_goal is
  '주간_목표별: Weekly locale x goal performance breakdown.';


-- =============================================================================
-- View 4: 월간_로케일별 — Monthly performance by locale with MoM comparison
-- =============================================================================

create or replace function public.monthly_by_locale(
  p_month text
)
returns table (
  sheet_name       text,
  ad_spend_krw     numeric,
  revenue_krw      numeric,
  roas             numeric,
  signups          numeric,
  conversions      numeric,
  signup_cpa       numeric,
  prev_ad_spend_krw numeric,
  prev_revenue_krw  numeric,
  prev_roas        numeric,
  prev_signups     numeric,
  prev_conversions numeric,
  prev_signup_cpa  numeric,
  spend_change_pct numeric,
  roas_change_pp   numeric
)
language plpgsql stable
as $$
declare
  v_prev_month text;
begin
  v_prev_month := to_char((p_month || '-01')::date - interval '1 month', 'YYYY-MM');

  return query
  with current_m as (
    select
      n.sheet_name as sn,
      coalesce(sum(n.ad_spend_krw), 0) as spend, coalesce(sum(n.revenue_krw), 0) as rev,
      round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) as r,
      coalesce(sum(n.signups), 0)::numeric as su, coalesce(sum(n.conversions), 0)::numeric as cv,
      round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0) as cpa
    from public.ad_normalized n where n.month = p_month group by n.sheet_name
  ),
  prev_m as (
    select
      n.sheet_name as sn,
      coalesce(sum(n.ad_spend_krw), 0) as spend, coalesce(sum(n.revenue_krw), 0) as rev,
      round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) as r,
      coalesce(sum(n.signups), 0)::numeric as su, coalesce(sum(n.conversions), 0)::numeric as cv,
      round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0) as cpa
    from public.ad_normalized n where n.month = v_prev_month group by n.sheet_name
  ),
  combined as (
    select
      coalesce(c.sn, p.sn) as sn,
      coalesce(c.spend, 0) as spend, coalesce(c.rev, 0) as rev, coalesce(c.r, 0) as r,
      coalesce(c.su, 0) as su, coalesce(c.cv, 0) as cv, coalesce(c.cpa, 0) as cpa,
      coalesce(p.spend, 0) as p_spend, coalesce(p.rev, 0) as p_rev, coalesce(p.r, 0) as p_r,
      coalesce(p.su, 0) as p_su, coalesce(p.cv, 0) as p_cv, coalesce(p.cpa, 0) as p_cpa
    from current_m c full outer join prev_m p on c.sn = p.sn
  ),
  with_totals as (
    select sn, spend, rev, r, su, cv, cpa, p_spend, p_rev, p_r, p_su, p_cv, p_cpa from combined
    union all
    select 'TOTAL', sum(spend), sum(rev),
      round(sum(rev) * 100.0 / nullif(sum(spend), 0), 0),
      sum(su), sum(cv), round(sum(spend) / nullif(sum(su), 0), 0),
      sum(p_spend), sum(p_rev),
      round(sum(p_rev) * 100.0 / nullif(sum(p_spend), 0), 0),
      sum(p_su), sum(p_cv), round(sum(p_spend) / nullif(sum(p_su), 0), 0)
    from combined
  )
  select
    t.sn, t.spend, t.rev, t.r, t.su, t.cv, t.cpa,
    t.p_spend, t.p_rev, t.p_r, t.p_su, t.p_cv, t.p_cpa,
    round((t.spend - t.p_spend) * 100.0 / nullif(t.p_spend, 0), 2),
    (t.r - t.p_r)
  from with_totals t
  order by case when t.sn = 'TOTAL' then 1 else 0 end, t.spend desc;
end;
$$;

comment on function public.monthly_by_locale is
  '월간_로케일별: Monthly locale-level performance with MoM comparison.';


-- =============================================================================
-- View 5a: 작품별_효율 — 결제 캠페인 ROAS 상위
-- =============================================================================

create or replace function public.creative_roas_ranking(
  p_week_start date,
  p_week_end   date,
  p_limit      int default 50
)
returns table (
  rank_num       numeric,
  sheet_name     text,
  creative_name  text,
  ad_spend_krw   numeric,
  revenue_krw    numeric,
  roas           numeric,
  conversions    numeric
)
language sql stable
as $$
  select
    row_number() over (order by round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) desc) as rank_num,
    n.sheet_name,
    n.creative_name,
    coalesce(sum(n.ad_spend_krw), 0),
    coalesce(sum(n.revenue_krw), 0),
    round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0),
    coalesce(sum(n.conversions), 0)::numeric
  from public.ad_normalized n
  where n.ad_date >= p_week_start and n.ad_date <= p_week_end
    and n.goal in ('결제', '첫결제')
    and n.creative_name is not null and n.creative_name <> ''
  group by n.sheet_name, n.creative_name
  having sum(n.ad_spend_krw) > 0
  order by 6 desc
  limit p_limit;
$$;

comment on function public.creative_roas_ranking is
  '작품별_효율 (결제): Top creatives by ROAS for conversion campaigns.';


-- =============================================================================
-- View 5b: 작품별_효율 — 가입 캠페인 CPA 현황
-- =============================================================================

create or replace function public.creative_cpa_ranking(
  p_week_start date,
  p_week_end   date,
  p_limit      int default 50
)
returns table (
  rank_num       numeric,
  sheet_name     text,
  creative_name  text,
  ad_spend_krw   numeric,
  signups        numeric,
  signup_cpa     numeric
)
language sql stable
as $$
  select
    row_number() over (order by sum(n.ad_spend_krw) desc) as rank_num,
    n.sheet_name,
    n.creative_name,
    coalesce(sum(n.ad_spend_krw), 0),
    coalesce(sum(n.signups), 0)::numeric,
    round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0)
  from public.ad_normalized n
  where n.ad_date >= p_week_start and n.ad_date <= p_week_end
    and n.goal in ('가입', '가입&결제')
    and n.creative_name is not null and n.creative_name <> ''
  group by n.sheet_name, n.creative_name
  having sum(n.ad_spend_krw) > 0
  order by 4 desc
  limit p_limit;
$$;

comment on function public.creative_cpa_ranking is
  '작품별_효율 (가입): Creative CPA ranking for signup campaigns.';


-- =============================================================================
-- View 6: 원본_마스터 — Weekly by locale x medium with impressions & CTR
-- =============================================================================

create or replace function public.weekly_master(
  p_week_start date,
  p_week_end   date
)
returns table (
  sheet_name    text,
  medium        text,
  ad_spend_krw  numeric,
  revenue_krw   numeric,
  roas          numeric,
  signups       numeric,
  conversions   numeric,
  signup_cpa    numeric,
  impressions   numeric,
  avg_ctr       numeric
)
language plpgsql stable
as $$
begin
  return query
  with data_rows as (
    select
      n.sheet_name as sn, n.medium as med,
      coalesce(sum(n.ad_spend_krw), 0) as spend,
      coalesce(sum(n.revenue_krw), 0) as rev,
      round(sum(n.revenue_krw) * 100.0 / nullif(sum(n.ad_spend_krw), 0), 0) as r,
      coalesce(sum(n.signups), 0)::numeric as su,
      coalesce(sum(n.conversions), 0)::numeric as cv,
      round(sum(n.ad_spend_krw) / nullif(sum(n.signups), 0), 0) as cpa,
      coalesce(sum(n.impressions), 0)::numeric as imp,
      round(sum(n.clicks) * 100.0 / nullif(sum(n.impressions), 0), 2) as ctr
    from public.ad_normalized n
    where n.ad_date >= p_week_start and n.ad_date <= p_week_end
    group by n.sheet_name, n.medium
  ),
  with_totals as (
    select sn, med, spend, rev, r, su, cv, cpa, imp, ctr from data_rows
    union all
    select 'TOTAL', 'ALL', sum(spend), sum(rev),
      round(sum(rev) * 100.0 / nullif(sum(spend), 0), 0),
      sum(su), sum(cv), round(sum(spend) / nullif(sum(su), 0), 0),
      sum(imp), round(sum(imp * ctr) / nullif(sum(imp), 0), 2)
    from data_rows
  )
  select t.sn, t.med, t.spend, t.rev, t.r, t.su, t.cv, t.cpa, t.imp, t.ctr
  from with_totals t
  order by case when t.sn = 'TOTAL' then 1 else 0 end, t.spend desc;
end;
$$;

comment on function public.weekly_master is
  '원본_마스터: Weekly locale x medium with impressions and CTR.';


-- =============================================================================
-- Utility: Get available week ranges from the data
-- =============================================================================

create or replace function public.available_weeks()
returns table (
  week_start  date,
  week_end    date,
  week_label  text,
  row_count   numeric
)
language sql stable
as $$
  select
    ws::date as week_start,
    (ws + interval '6 days')::date as week_end,
    to_char(ws, 'YYYY-MM') || ' ' || extract(week from ws)::text || '주차' as week_label,
    cnt as row_count
  from (
    select date_trunc('week', ad_date) as ws, count(*) as cnt
    from public.ad_normalized
    where ad_date is not null
    group by date_trunc('week', ad_date)
  ) sub
  order by week_start desc;
$$;

comment on function public.available_weeks is
  'Returns available ISO week ranges with row counts for the week picker UI.';


-- =============================================================================
-- Utility: Get available months from the data
-- =============================================================================

create or replace function public.available_months()
returns table (
  month_value text,
  row_count   numeric
)
language sql stable
as $$
  select
    month as month_value,
    count(*) as row_count
  from public.ad_normalized
  where month is not null
  group by month
  order by month desc;
$$;

comment on function public.available_months is
  'Returns available months with row counts for the month picker UI.';
