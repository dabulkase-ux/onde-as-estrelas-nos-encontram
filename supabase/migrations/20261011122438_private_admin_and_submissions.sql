begin;

create table public.quiz_attempts (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null unique,
 created_at timestamptz not null default now(),
 quiz_type text not null check (quiz_type in ('compatibility','couple')),
 answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 10),
 result numeric not null,
 completed boolean not null check (completed),
 consent_version integer not null check (consent_version = 1),
 check ((quiz_type = 'compatibility' and result between 25 and 100) or (quiz_type = 'couple' and result between 0 and 10))
);
create index quiz_attempts_history on public.quiz_attempts (quiz_type, created_at desc, id desc);

create table public.romantic_responses (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null unique,
 created_at timestamptz not null default now(),
 attempts integer not null check (attempts between 0 and 100000),
 choice text not null check (choice in ('yes','no','later')),
 consent_version integer not null check (consent_version = 1)
);
create index romantic_responses_history on public.romantic_responses (created_at desc, id desc);

create table public.wishes (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null unique,
 created_at timestamptz not null default now(),
 text text not null check (char_length(text) between 1 and 2000),
 consent_version integer not null check (consent_version = 1)
);
create index wishes_history on public.wishes (created_at desc, id desc);

create table public.admin_sessions (
 token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
 credential_version text not null check (credential_version ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null
);
create index admin_sessions_expiration on public.admin_sessions(expires_at);
create table public.request_limits (
 bucket text primary key,
 window_start timestamptz not null,
 requests integer not null
);

alter table public.quiz_attempts enable row level security;
alter table public.romantic_responses enable row level security;
alter table public.wishes enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.request_limits enable row level security;
-- Sem políticas públicas: apenas o servidor service_role pode operar.
revoke all on public.quiz_attempts, public.romantic_responses, public.wishes,
 public.admin_sessions, public.request_limits from public, anon, authenticated;
grant select, insert, delete on public.quiz_attempts, public.romantic_responses,
 public.wishes, public.admin_sessions to service_role;
grant select, insert, update on public.request_limits to service_role;

create function public.consume_rate_limit(bucket_name text, max_requests integer, window_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare count_now integer;
begin
 if bucket_name not in ('admin-login','admin-read','public-submit')
  or max_requests not between 1 and 120 or window_seconds not between 1 and 300 then
  raise exception 'invalid bucket';
 end if;
 insert into public.request_limits as limits (bucket,window_start,requests)
 values (bucket_name,now(),1)
 on conflict (bucket) do update set
 requests = case when limits.window_start + make_interval(secs => window_seconds) <= now() then 1 else limits.requests + 1 end,
 window_start = case when limits.window_start + make_interval(secs => window_seconds) <= now() then now() else limits.window_start end
 returning requests into count_now;
 return count_now <= max_requests;
end;
$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create function public.admin_overview() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('quizzes',(select count(*) from public.quiz_attempts),
 'wishes',(select count(*) from public.wishes),
 'proposals',(select count(*) from public.romantic_responses));
$$;
revoke all on function public.admin_overview() from public,anon,authenticated;
grant execute on function public.admin_overview() to service_role;

commit;
