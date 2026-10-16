begin;
-- Independent of universe documents, publications, quizzes and mail contents.
create table public.stellar_push_devices (
 id uuid primary key, secret_hash text not null check(length(secret_hash)=64),
 identity text check(identity in ('arthur','carol')), generation integer not null default 0,
 endpoint text unique, subscription jsonb, enabled boolean not null default false,
 updated_at timestamptz not null default now(),
 check(not enabled or (identity is not null and endpoint is not null and subscription is not null))
);
create table public.stellar_push_deliveries (
 letter_id uuid not null references public.stellar_letters(id) on delete cascade,
 device_id uuid not null references public.stellar_push_devices(id) on delete cascade,
 generation integer not null, recipient text not null check(recipient in ('arthur','carol')),
 state text not null default 'pending' check(state in ('pending','attempted','sent','failed','cancelled')),
 created_at timestamptz not null default now(), primary key(letter_id,device_id,generation)
);
create index stellar_push_pending on public.stellar_push_deliveries(created_at) where state='pending';
create table public.stellar_push_limits(bucket text primary key,window_start timestamptz not null,requests integer not null);
alter table public.stellar_push_devices enable row level security;
alter table public.stellar_push_deliveries enable row level security;
alter table public.stellar_push_limits enable row level security;
revoke all on public.stellar_push_devices,public.stellar_push_deliveries,public.stellar_push_limits from public,anon,authenticated;
grant all on public.stellar_push_devices,public.stellar_push_deliveries,public.stellar_push_limits to service_role;

create function public.stellar_push_limit(p_bucket text,p_max integer,p_seconds integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if length(p_bucket)>150 or p_max not between 1 and 120 or p_seconds not between 1 and 86400 then raise exception 'Invalid limit';end if;
 insert into public.stellar_push_limits as l values(p_bucket,now(),1) on conflict(bucket) do update set
 requests=case when l.window_start+make_interval(secs=>p_seconds)<=now() then 1 else l.requests+1 end,
 window_start=case when l.window_start+make_interval(secs=>p_seconds)<=now() then now() else l.window_start end returning requests into n;
 delete from public.stellar_push_limits where window_start<now()-interval '2 days';
 return n<=p_max;
end $$;

create function public.stellar_push_device(p_id uuid,p_hash text,p_action text,p_identity text default null,p_expected integer default 0,p_subscription jsonb default null,p_replace boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.stellar_push_devices;
begin
 if p_action not in ('status','subscribe','cancel') or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid input' using errcode='22023';end if;
 -- Serialize even first enrollment and concurrent tabs for this installation.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into d from public.stellar_push_devices where id=p_id for update;
 if d.id is not null and d.secret_hash<>p_hash then raise exception 'Unknown device' using errcode='42501';end if;
 if p_action='status' then return jsonb_build_object('identity',d.identity,'generation',coalesce(d.generation,0),'enabled',coalesce(d.enabled,false),'endpoint',d.endpoint);end if;
 if coalesce(d.generation,0) is distinct from p_expected then raise exception 'Device changed' using errcode='P0001';end if;
 if p_action='subscribe' then
  if p_identity is null or p_identity not in ('arthur','carol') or jsonb_typeof(p_subscription)<>'object' or p_subscription->>'endpoint' is null then raise exception 'Invalid subscription' using errcode='22023';end if;
  if d.enabled and d.identity<>p_identity and not coalesce(p_replace,false) then raise exception 'Confirmation required' using errcode='P0001';end if;
  if d.enabled and d.identity=p_identity and d.subscription=p_subscription then return jsonb_build_object('identity',d.identity,'generation',d.generation,'enabled',true,'endpoint',d.endpoint);end if;
  if exists(select 1 from public.stellar_push_devices where endpoint=p_subscription->>'endpoint' and id<>p_id) then raise exception 'Endpoint already registered' using errcode='P0001';end if;
  if not coalesce(d.enabled,false) and (select count(*) from public.stellar_push_devices where enabled)>=200 then raise exception 'Device limit' using errcode='54000';end if;
  insert into public.stellar_push_devices(id,secret_hash,identity,generation,endpoint,subscription,enabled)
   values(p_id,p_hash,p_identity,coalesce(d.generation,0)+1,p_subscription->>'endpoint',p_subscription,true)
   on conflict(id) do update set identity=excluded.identity,generation=excluded.generation,endpoint=excluded.endpoint,subscription=excluded.subscription,enabled=true,updated_at=now();
 else
  update public.stellar_push_devices set enabled=false,identity=null,generation=generation+1,subscription=null,endpoint=null,updated_at=now() where id=p_id;
 end if;
 update public.stellar_push_deliveries set state='cancelled' where device_id=p_id and state='pending';
 select * into d from public.stellar_push_devices where id=p_id;
 return jsonb_build_object('identity',d.identity,'generation',coalesce(d.generation,0),'enabled',coalesce(d.enabled,false),'endpoint',d.endpoint);
end $$;

create function public.stellar_push_enqueue() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Never backfill old mail; no events for edits, reads, deletes or retries.
 if exists(select 1 from public.stellar_push_devices where enabled and identity=new.recipient)
  and public.stellar_push_limit('delivery:'||new.recipient,20,3600) then
  insert into public.stellar_push_deliveries(letter_id,device_id,generation,recipient)
   select new.id,id,generation,new.recipient from public.stellar_push_devices where enabled and identity=new.recipient;
 end if;
 return new;
exception when others then
 -- Notifications must never roll back a letter.
 return new;
end $$;
create trigger stellar_push_new_letter after insert on public.stellar_letters for each row execute function public.stellar_push_enqueue();

create function public.stellar_push_claim(p_letter uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 with candidates as (
  select q.letter_id,q.device_id,q.generation from public.stellar_push_deliveries q
  join public.stellar_push_devices d on d.id=q.device_id and d.enabled and d.identity=q.recipient and d.generation=q.generation
  where q.letter_id=p_letter and q.state='pending' and q.created_at>now()-interval '1 day' for update of q skip locked
 ), claimed as (
  update public.stellar_push_deliveries q set state='attempted' from candidates c
  where q.letter_id=c.letter_id and q.device_id=c.device_id and q.generation=c.generation returning q.*
 ) select coalesce(jsonb_agg(jsonb_build_object('letter_id',c.letter_id,'device_id',c.device_id,'generation',c.generation,'recipient',c.recipient,'subscription',d.subscription)),'[]') into result
 from claimed c join public.stellar_push_devices d on d.id=c.device_id;
 return result;
end $$;

revoke all on function public.stellar_push_limit(text,integer,integer),public.stellar_push_device(uuid,text,text,text,integer,jsonb,boolean),public.stellar_push_enqueue(),public.stellar_push_claim(uuid) from public,anon,authenticated;
grant execute on function public.stellar_push_limit(text,integer,integer),public.stellar_push_device(uuid,text,text,text,integer,jsonb,boolean),public.stellar_push_claim(uuid) to service_role;
commit;
