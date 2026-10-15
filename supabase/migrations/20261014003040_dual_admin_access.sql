begin;
alter table public.admin_sessions add column if not exists username text not null default 'admin';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='admin_sessions_username_check' and conrelid='public.admin_sessions'::regclass) then
  alter table public.admin_sessions add constraint admin_sessions_username_check check(username in ('admin','meu-universo-dela'));
 end if;
end $$;
alter table public.her_universe_attempts add column if not exists id uuid not null default gen_random_uuid();
alter table public.her_universe_attempts add column if not exists created_at timestamptz;
alter table public.her_universe_attempts alter column created_at set default now();
create unique index if not exists her_universe_attempts_admin_id on public.her_universe_attempts(id);
create index if not exists her_universe_attempts_history on public.her_universe_attempts(kind,created_at desc,id desc);
-- Completed attempts already contain server-calculated points and immutable question snapshots.
create or replace function public.her_admin_overview() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('quizzes',count(*),'wishes',0,'proposals',0)
 from public.her_universe_attempts a join public.her_universe_publications p on p.id=a.publication_id
 where a.next_index=jsonb_array_length(p.document#>array[a.kind,'questions']) and a.next_index>0;
$$;
create or replace function public.her_admin_records(p_kind text,p_offset integer)
returns table(id uuid,created_at timestamptz,answers jsonb,result integer,completed boolean,questions jsonb,score integer,total integer)
language sql stable security invoker set search_path='' as $$
 select a.id,a.created_at,
 (select jsonb_agg(value->>'option' order by ordinality) from jsonb_array_elements(a.answers) with ordinality),
 (a.answers->(a.next_index-1)->'response'->>'result')::integer,true,
 p.document#>array[a.kind,'questions'],
 (select sum((value->>'points')::integer)::integer from jsonb_array_elements(a.answers)),a.next_index
 from public.her_universe_attempts a join public.her_universe_publications p on p.id=a.publication_id
 where a.kind=p_kind and p_kind in ('couple','compatibility') and p_offset between 0 and 5000000
 and a.next_index=jsonb_array_length(p.document#>array[a.kind,'questions']) and a.next_index>0
 order by a.created_at desc nulls last,a.id desc limit 51 offset greatest(0,p_offset);
$$;
revoke all on function public.her_admin_overview(),public.her_admin_records(text,integer) from public,anon,authenticated;
grant execute on function public.her_admin_overview(),public.her_admin_records(text,integer) to service_role;
commit;
