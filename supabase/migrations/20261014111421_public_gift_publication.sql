begin;
-- A gift publication needs no Auth account. Legacy owner rows and policies remain intact.
alter table public.her_universes alter column owner_id drop not null;
create or replace function public.her_publish_gift(p_revision integer,p_document jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u public.her_universes;p public.her_universe_publications;
begin
 if p_revision is null or p_revision<0 or p_document#>>'{galaxy,created}' is distinct from 'true' then
  raise exception 'Invalid publication' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtext('her-universe-singleton'));
 -- Do not take over any legacy universe owned by an authorized creator.
 if exists(select 1 from public.her_universes where slug='universo-dela' and owner_id is not null) then
  raise exception 'Legacy universe protected' using errcode='42501';
 end if;
 select * into u from public.her_universes where slug='universo-dela' and owner_id is null for update;
 if u.id is null then
  if p_revision<>0 then raise exception 'Conflict' using errcode='40001'; end if;
  insert into public.her_universes(owner_id,document) values(null,p_document) returning * into u;
 else
  -- Repeating a publication after a lost response must not duplicate it.
  if u.document is not distinct from p_document and u.active_publication is not null then
   select * into p from public.her_universe_publications where id=u.active_publication;
   return jsonb_build_object('id',p.id,'universeId',u.id,'revision',p.revision);
  end if;
  if u.revision<>p_revision then raise exception 'Conflict' using errcode='40001'; end if;
  update public.her_universes set document=p_document,revision=revision+1,updated_at=now() where id=u.id returning * into u;
 end if;
 insert into public.her_universe_publications(universe_id,revision,document) values(u.id,u.revision,u.document) returning * into p;
 update public.her_universes set active_publication=p.id where id=u.id;
 return jsonb_build_object('id',p.id,'universeId',u.id,'revision',p.revision);
end $$;
-- Only the Edge Function may execute this RPC; no table is publicly writable.
revoke all on function public.her_publish_gift(integer,jsonb) from public,anon,authenticated;
grant execute on function public.her_publish_gift(integer,jsonb) to service_role;
commit;
