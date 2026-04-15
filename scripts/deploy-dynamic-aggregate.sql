drop function if exists public.dynamic_aggregate(text[], text[], jsonb, date, date, text, text, int);

create or replace function public.dynamic_aggregate(
  p_dimensions text[] default '{}',
  p_metrics    text[] default array['ad_spend_krw'],
  p_filters    jsonb  default '[]'::jsonb,
  p_start_date date   default null,
  p_end_date   date   default null,
  p_sort_field text   default null,
  p_sort_dir   text   default 'desc',
  p_limit      int    default 1000
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_dim_map   jsonb := '{
    "country": "sheet_name",
    "month": "month",
    "date": "ad_date::text",
    "medium": "medium",
    "goal": "goal",
    "creative_type": "creative_type",
    "creative_name": "creative_name",
    "week": "date_trunc(''week'', ad_date)::date::text"
  }'::jsonb;
  v_metric_map jsonb := '{
    "ad_spend_krw": "COALESCE(SUM(CASE WHEN sheet_name = ''봄툰 KR'' THEN ad_spend_local ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END), 0)",
    "revenue_krw": "COALESCE(COALESCE(SUM(revenue_krw), SUM(revenue_local)), 0)",
    "impressions": "COALESCE(SUM(impressions), 0)",
    "clicks": "COALESCE(SUM(clicks), 0)",
    "signups": "COALESCE(SUM(signups), 0)",
    "conversions": "COALESCE(SUM(conversions), 0)",
    "roas": "ROUND(COALESCE(SUM(revenue_krw), SUM(revenue_local)) * 100.0 / NULLIF(SUM(CASE WHEN sheet_name = ''봄툰 KR'' THEN ad_spend_local ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END), 0), 2)",
    "ctr": "ROUND(SUM(clicks) * 100.0 / NULLIF(SUM(impressions), 0), 2)",
    "signup_cpa": "ROUND(SUM(CASE WHEN sheet_name = ''봄툰 KR'' THEN ad_spend_local ELSE COALESCE(NULLIF(ad_spend_krw, 0), ad_spend_local) END) * 1.0 / NULLIF(SUM(signups), 0), 0)"
  }'::jsonb;

  v_select_parts text[] := '{}';
  v_group_parts  text[] := '{}';
  v_where_parts  text[] := array['1=1'];
  v_sql          text;
  v_result       jsonb;
  v_dim          text;
  v_metric       text;
  v_col          text;
  v_expr         text;
  v_filter       jsonb;
  v_op           text;
  v_field        text;
  v_field_col    text;
  v_val          text;
  v_sort_expr    text;
  i              int;
begin
  if array_length(p_dimensions, 1) is not null then
    for i in 1..array_length(p_dimensions, 1) loop
      v_dim := p_dimensions[i];
      v_col := v_dim_map ->> v_dim;
      if v_col is null then
        raise exception 'Invalid dimension: %', v_dim;
      end if;
      v_select_parts := array_append(v_select_parts, v_col || ' as ' || quote_ident(v_dim));
      v_group_parts  := array_append(v_group_parts, v_col);
    end loop;
  end if;

  if array_length(p_metrics, 1) is not null then
    for i in 1..array_length(p_metrics, 1) loop
      v_metric := p_metrics[i];
      v_expr   := v_metric_map ->> v_metric;
      if v_expr is null then
        raise exception 'Invalid metric: %', v_metric;
      end if;
      v_select_parts := array_append(v_select_parts, v_expr || ' as ' || quote_ident(v_metric));
    end loop;
  end if;

  if array_length(v_select_parts, 1) is null then
    v_select_parts := array['count(*) as row_count'];
  end if;

  if p_start_date is not null then
    v_where_parts := array_append(v_where_parts, format('ad_date >= %L', p_start_date));
  end if;
  if p_end_date is not null then
    v_where_parts := array_append(v_where_parts, format('ad_date <= %L', p_end_date));
  end if;

  if jsonb_array_length(p_filters) > 0 then
    for i in 0..jsonb_array_length(p_filters) - 1 loop
      v_filter := p_filters -> i;
      v_field  := v_filter ->> 'field';
      v_op     := v_filter ->> 'operator';
      v_field_col := v_dim_map ->> v_field;
      if v_field_col is null then
        if v_field in ('ad_spend_krw', 'revenue_krw', 'impressions', 'clicks', 'signups', 'conversions') then
          v_field_col := v_field;
        else
          raise exception 'Invalid filter field: %', v_field;
        end if;
      end if;

      case v_op
        when 'eq' then
          v_where_parts := array_append(v_where_parts, format('%s = %L', v_field_col, v_filter ->> 'value'));
        when 'neq' then
          v_where_parts := array_append(v_where_parts, format('%s != %L', v_field_col, v_filter ->> 'value'));
        when 'gt' then
          v_where_parts := array_append(v_where_parts, format('%s > %s', v_field_col, (v_filter ->> 'value')::numeric));
        when 'gte' then
          v_where_parts := array_append(v_where_parts, format('%s >= %s', v_field_col, (v_filter ->> 'value')::numeric));
        when 'lt' then
          v_where_parts := array_append(v_where_parts, format('%s < %s', v_field_col, (v_filter ->> 'value')::numeric));
        when 'lte' then
          v_where_parts := array_append(v_where_parts, format('%s <= %s', v_field_col, (v_filter ->> 'value')::numeric));
        when 'in' then
          v_where_parts := array_append(v_where_parts, format('%s = ANY(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))', v_field_col, v_filter -> 'value'));
        when 'not_in' then
          v_where_parts := array_append(v_where_parts, format('%s != ALL(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))', v_field_col, v_filter -> 'value'));
        when 'like' then
          v_where_parts := array_append(v_where_parts, format('%s ILIKE %L', v_field_col, '%' || (v_filter ->> 'value') || '%'));
        when 'between' then
          v_where_parts := array_append(v_where_parts, format('%s BETWEEN %s AND %s', v_field_col, (v_filter -> 'value' ->> 0)::numeric, (v_filter -> 'value' ->> 1)::numeric));
        else
          raise exception 'Invalid operator: %', v_op;
      end case;
    end loop;
  end if;

  v_sql := 'SELECT ' || array_to_string(v_select_parts, ', ') ||
           ' FROM public.ad_normalized' ||
           ' WHERE ' || array_to_string(v_where_parts, ' AND ');

  if array_length(v_group_parts, 1) is not null then
    v_sql := v_sql || ' GROUP BY ' || array_to_string(v_group_parts, ', ');
  end if;

  if p_sort_field is not null then
    if v_dim_map ? p_sort_field or v_metric_map ? p_sort_field then
      v_sort_expr := quote_ident(p_sort_field);
    else
      raise exception 'Invalid sort field: %', p_sort_field;
    end if;
    v_sql := v_sql || ' ORDER BY ' || v_sort_expr || ' ' ||
             case when lower(p_sort_dir) = 'asc' then 'ASC' else 'DESC' end ||
             ' NULLS LAST';
  end if;

  v_sql := v_sql || ' LIMIT ' || least(p_limit, 5000);

  execute format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', v_sql)
    into v_result;

  return v_result;
end;
$$;

comment on function public.dynamic_aggregate is
  'Generic aggregation for AdInsight Explore query builder. Whitelisted dimensions/metrics only.';
