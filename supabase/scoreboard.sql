-- Run this file once in Supabase Dashboard > SQL Editor.
-- It converts absent/not-considered marks to zero and calculates ranks in Postgres.

create or replace view public.student_rankings
with (security_invoker = true)
as
with normalized as (
  select
    trim(roll_number::text) as roll_number,
    trim(full_name::text) as full_name,
    trim(department::text) as department,
    coalesce(nullif(trim(assessment_1::text), ''), '—') as assessment_1_display,
    coalesce(nullif(trim(assessment_2::text), ''), '—') as assessment_2_display,
    case
      when assessment_1 is null
        or trim(assessment_1::text) = ''
        or upper(trim(assessment_1::text)) = 'ABSENT'
        or trim(assessment_1::text) ~* '\[not considered\]'
        then 0
      when trim(assessment_1::text) ~ '^[0-9]+([.][0-9]+)?$'
        then trim(assessment_1::text)::numeric
      else 0
    end as assessment_1_score,
    case
      when assessment_2 is null
        or trim(assessment_2::text) = ''
        or upper(trim(assessment_2::text)) = 'ABSENT'
        or trim(assessment_2::text) ~* '\[not considered\]'
        then 0
      when trim(assessment_2::text) ~ '^[0-9]+([.][0-9]+)?$'
        then trim(assessment_2::text)::numeric
      else 0
    end as assessment_2_score
  from public.cdc_data
), scored as (
  select *, assessment_1_score + assessment_2_score as total_score
  from normalized
)
select
  *,
  rank() over (order by total_score desc)::bigint as overall_rank,
  rank() over (partition by department order by total_score desc)::bigint as department_rank
from scored;

grant select on public.student_rankings to anon, authenticated;
grant select on public.cdc_data to anon, authenticated;

create or replace function public.get_scoreboard_departments()
returns table (department text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct sr.department
  from public.student_rankings sr
  where sr.department <> ''
  order by sr.department;
$$;

grant execute on function public.get_scoreboard_departments() to anon, authenticated;

alter table public.cdc_data enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cdc_data'
      and policyname = 'scoreboard_public_read'
  ) then
    create policy scoreboard_public_read
      on public.cdc_data
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
