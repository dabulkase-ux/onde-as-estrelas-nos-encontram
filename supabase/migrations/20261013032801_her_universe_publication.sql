begin;
create table if not exists public.her_universe_creators (
 user_id uuid primary key references auth.users(id), enabled boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.her_universes (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references public.her_universe_creators(user_id),
 slug text not null unique default 'universo-dela' check(slug='universo-dela'),
 document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=2200000),
 revision integer not null default 1 check(revision>0), active_publication uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.her_universe_publications (
 id uuid primary key default gen_random_uuid(), universe_id uuid not null references public.her_universes(id),
 revision integer not null, document jsonb not null, created_at timestamptz not null default now(), unique(universe_id,revision)
);
create table if not exists public.her_universe_attempts (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'), publication_id uuid not null references public.her_universe_publications(id),
 kind text not null check(kind in ('compatibility','couple')), next_index integer not null default 0,
 answers jsonb not null default '[]'::jsonb, expires_at timestamptz not null default now()+interval '2 hours'
);
create index if not exists her_universe_attempts_expiry on public.her_universe_attempts(expires_at);
alter table public.her_universe_creators enable row level security;
alter table public.her_universes enable row level security;
alter table public.her_universe_publications enable row level security;
alter table public.her_universe_attempts enable row level security;
revoke all on public.her_universe_creators,public.her_universes,public.her_universe_publications,public.her_universe_attempts from public,anon,authenticated;
grant all on public.her_universe_creators,public.her_universes,public.her_universe_publications,public.her_universe_attempts to service_role;
grant select on public.her_universe_creators,public.her_universes,public.her_universe_publications to authenticated;
drop policy if exists her_creator_self on public.her_universe_creators;
create policy her_creator_self on public.her_universe_creators for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists her_owner_read on public.her_universes;
create policy her_owner_read on public.her_universes for select to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.her_universe_creators c where c.user_id=(select auth.uid()) and c.enabled));
drop policy if exists her_owner_publications on public.her_universe_publications;
create policy her_owner_publications on public.her_universe_publications for select to authenticated using(exists(select 1 from public.her_universes u where u.id=universe_id and u.owner_id=(select auth.uid())));
-- No client writes: only the Edge Function may call these invoker RPCs.
create or replace function public.her_save_draft(p_owner uuid,p_revision integer,p_document jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u public.her_universes;
begin
 if not exists(select 1 from public.her_universe_creators where user_id=p_owner and enabled) then raise exception 'Forbidden' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('her-universe-singleton'));
 select * into u from public.her_universes where slug='universo-dela' for update;
 if u.id is null then
  if p_revision<>0 then raise exception 'Conflict' using errcode='40001'; end if;
  insert into public.her_universes(owner_id,document) values(p_owner,p_document) returning * into u;
 else
  if u.owner_id<>p_owner then raise exception 'Forbidden' using errcode='42501'; end if;
  if u.revision<>p_revision then raise exception 'Conflict' using errcode='40001'; end if;
  if u.document is distinct from p_document then
   update public.her_universes set document=p_document,revision=revision+1,updated_at=now() where id=u.id returning * into u;
  end if;
 end if;
 return to_jsonb(u);
end $$;
create or replace function public.her_publish(p_owner uuid,p_revision integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u public.her_universes; p public.her_universe_publications;
begin
 if not exists(select 1 from public.her_universe_creators where user_id=p_owner and enabled) then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into u from public.her_universes where owner_id=p_owner for update;
 if u.id is null or u.revision<>p_revision then raise exception 'Conflict' using errcode='40001'; end if;
 if u.document#>>'{galaxy,created}'<>'true' then raise exception 'Galaxy not ready' using errcode='22023'; end if;
 insert into public.her_universe_publications(universe_id,revision,document) values(u.id,u.revision,u.document)
 on conflict(universe_id,revision) do nothing;
 select * into p from public.her_universe_publications where universe_id=u.id and revision=u.revision;
 update public.her_universes set active_publication=p.id where id=u.id;
 return jsonb_build_object('id',p.id,'universeId',u.id,'revision',p.revision,'createdAt',p.created_at);
end $$;
create or replace function public.her_read_publication(p_universe uuid default null) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'universeId',u.id,'document',p.document) from public.her_universes u
 join public.her_universe_publications p on p.id=u.active_publication where (p_universe is null or u.id=p_universe) and u.slug='universo-dela';
$$;
create or replace function public.her_start_attempt(p_publication uuid,p_kind text,p_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p public.her_universe_publications;
begin
 select * into p from public.her_universe_publications where id=p_publication;
 if p.id is null or p_kind not in ('couple','compatibility') or p.document#>>array[p_kind,'status']<>'completed' then raise exception 'Unavailable quiz' using errcode='22023'; end if;
 insert into public.her_universe_attempts(token_hash,publication_id,kind) values(p_hash,p.id,p_kind);
 return jsonb_build_object('started',true);
end $$;
create or replace function public.her_answer(p_hash text,p_index integer,p_option text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a public.her_universe_attempts; doc jsonb; questions jsonb; q jsonb; o jsonb; response jsonb; points integer; total integer; score integer;
begin
 select * into a from public.her_universe_attempts where token_hash=p_hash for update;
 if a.token_hash is null or a.expires_at<now() then raise exception 'Attempt expired' using errcode='22023'; end if;
 if p_index<a.next_index and p_index>=0 and a.answers->p_index->>'option'=p_option then return a.answers->p_index->'response'; end if;
 if p_index<>a.next_index then raise exception 'Confirm in order' using errcode='40001'; end if;
 select document into doc from public.her_universe_publications where id=a.publication_id;
 questions=doc#>array[a.kind,'questions']; total=jsonb_array_length(questions);q=questions->p_index;
 if q is null then raise exception 'Unknown question' using errcode='22023'; end if;
 select value into o from jsonb_array_elements(q->'options') where value->>'id'=p_option;
 if o is null then raise exception 'Unknown option' using errcode='22023'; end if;
 if a.kind='couple' then
  points=case when (o->>'correct')::boolean then 1 else 0 end;
  response=jsonb_build_object('confirmed',true,'correct',points=1,'comment',coalesce(q->>'comment',''),
   'correctOptions',(select jsonb_agg(jsonb_build_object('id',value->>'id','text',value->>'text')) from jsonb_array_elements(q->'options') where (value->>'correct')::boolean));
 else points=(o->>'weight')::integer; response=jsonb_build_object('confirmed',true); end if;
 if p_index=total-1 then
  select coalesce(sum((value->>'points')::integer),0)::integer+points into score from jsonb_array_elements(a.answers);
  response=response||jsonb_build_object('result',round(score::numeric/(total*case when a.kind='compatibility' then 4 else 1 end)*100)::integer);
 end if;
 update public.her_universe_attempts set answers=answers||jsonb_build_array(jsonb_build_object('option',p_option,'points',points,'response',response)),next_index=next_index+1 where token_hash=p_hash;
 return response;
end $$;
revoke all on function public.her_save_draft(uuid,integer,jsonb),public.her_publish(uuid,integer),public.her_read_publication(uuid),public.her_start_attempt(uuid,text,text),public.her_answer(text,integer,text) from public,anon,authenticated;
grant execute on function public.her_save_draft(uuid,integer,jsonb),public.her_publish(uuid,integer),public.her_read_publication(uuid),public.her_start_attempt(uuid,text,text),public.her_answer(text,integer,text) to service_role;
commit;
