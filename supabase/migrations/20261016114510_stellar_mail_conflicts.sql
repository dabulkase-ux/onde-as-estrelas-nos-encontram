begin;
-- Domain conflicts must not trigger PostgREST serialization retries.
create or replace function public.stellar_mail(p_actor text,p_action text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare letter public.stellar_letters; target text; page_number integer; result jsonb; letter_id uuid;
begin
 if p_actor not in ('arthur','carol') or p_actor is null then raise exception 'Invalid actor' using errcode='42501';end if;
 target=case p_actor when 'arthur' then 'carol' else 'arthur' end;
 if p_action='mailbox' then
  if p_payload->>'folder' not in ('received','sent') then raise exception 'Invalid folder' using errcode='22023';end if;
  page_number=(p_payload->>'page')::integer;if page_number is null or page_number<0 or page_number>1000000 then raise exception 'Invalid page' using errcode='22023';end if;
  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.created_at desc,rows.id desc),'[]') into result from (
   select * from public.stellar_letters where case when p_payload->>'folder'='sent' then sender=p_actor else recipient=p_actor end order by created_at desc,id desc limit 21 offset page_number*20
  ) rows;
  return jsonb_build_object('actor',p_actor,'rows',case when jsonb_array_length(result)>20 then result-20 else result end,'hasMore',jsonb_array_length(result)>20,'unread',(select count(*) from public.stellar_letters where recipient=p_actor and read_at is null));
 end if;
 if p_action='arrival' then
  select id into letter_id from public.stellar_letters where recipient=p_actor and noticed_at is null and read_at is null order by created_at,id for update skip locked limit 1;
  if letter_id is null then return jsonb_build_object('id',null);end if;
  update public.stellar_letters set noticed_at=now() where id=letter_id;
  return jsonb_build_object('id',letter_id);
 end if;
 letter_id=(p_payload->>'id')::uuid;
 if p_action='send' then
  insert into public.stellar_letters(id,sender,recipient,title,content) values(letter_id,p_actor,target,p_payload->>'title',p_payload->>'content') on conflict(id) do nothing;
  select * into letter from public.stellar_letters where id=letter_id for update;
  if letter.sender is distinct from p_actor or letter.title is distinct from p_payload->>'title' or letter.content is distinct from p_payload->>'content' then raise exception 'Conflicting retry' using errcode='P0001';end if;
  return to_jsonb(letter);
 end if;
 select * into letter from public.stellar_letters where id=letter_id for update;
 if letter.id is null then if p_action='delete' then return jsonb_build_object('ok',true);end if;raise exception 'Unavailable' using errcode='42501';end if;
 if p_action in ('edit','delete') and letter.sender<>p_actor or p_action='read' and letter.recipient<>p_actor then raise exception 'Not yours' using errcode='42501';end if;
 if letter.revision is distinct from (p_payload->>'revision')::integer then raise exception 'Conflict' using errcode='P0001';end if;
 if p_action='edit' then
  update public.stellar_letters set title=p_payload->>'title',content=p_payload->>'content',updated_at=now(),revision=revision+1,read_at=null where id=letter_id returning * into letter;
 elsif p_action='read' then
  update public.stellar_letters set read_at=coalesce(read_at,now()),noticed_at=coalesce(noticed_at,now()) where id=letter_id returning * into letter;
 elsif p_action='delete' then
  delete from public.stellar_letters where id=letter_id;return jsonb_build_object('ok',true);
 else raise exception 'Invalid action' using errcode='22023';end if;
 return to_jsonb(letter);
end $$;
commit;
