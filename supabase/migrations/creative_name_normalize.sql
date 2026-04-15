-- =============================================================================
-- creative_name 공백 정규화
-- "클 로드", "클로 드", "클 로 드" → "클로드" (가장 빈도 높은 원본 사용)
-- =============================================================================

-- 1. 정규화 매핑 뷰: 공백 제거 후 그룹핑, 가장 많이 쓰인 원본을 canonical로 선택
create or replace view public.creative_name_canonical as
select distinct on (normalized)
  replace(creative_name, ' ', '') as normalized,
  creative_name as canonical
from (
  select creative_name, count(*) as cnt
  from public.ad_raw
  where creative_name is not null and creative_name != ''
  group by creative_name
) sub
order by normalized, cnt desc;

comment on view public.creative_name_canonical is
  '공백 제거 기준으로 creative_name을 정규화. 가장 빈도 높은 원본을 canonical로 사용.';

-- 2. ad_normalized 뷰 재생성 (creative_name → canonical 적용)
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
  coalesce(cn.canonical, r.creative_name)             as creative_name,

  -- Raw dimension values preserved for debugging
  r.medium_raw,
  r.goal_raw,
  r.creative_type_raw,
  r.creative_name                                     as creative_name_raw,

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
  left join public.creative_type_map ct on ct.raw_value = coalesce(r.creative_type_raw, '')
  left join public.creative_name_canonical cn on cn.normalized = replace(coalesce(r.creative_name, ''), ' ', '');

comment on view public.ad_normalized is
  'Dashboard-ready view. Joins ad_raw with mapping tables for normalised dimensions. '
  'Month format is unified to YYYY-MM. creative_name is space-normalized. '
  'This is the only interface for frontend queries.';
