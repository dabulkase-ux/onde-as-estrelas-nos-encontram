begin;
-- Dedicated namespace: never changes the admin/quiz rate limiter or its buckets.
create or replace function public.stellar_mail_rate_limit(bucket_name text,max_requests integer,window_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare count_now integer;
begin
 if bucket_name not in ('stellar-mail:arthur','stellar-mail:carol') or max_requests not between 1 and 120 or window_seconds not between 1 and 300 then
  raise exception 'invalid mail rate bucket' using errcode='22023';
 end if;
 insert into public.request_limits as limits(bucket,window_start,requests) values(bucket_name,now(),1)
 on conflict(bucket) do update set
 requests=case when limits.window_start+make_interval(secs=>window_seconds)<=now() then 1 else limits.requests+1 end,
 window_start=case when limits.window_start+make_interval(secs=>window_seconds)<=now() then now() else limits.window_start end
 returning requests into count_now;
 return count_now<=max_requests;
end $$;
revoke all on function public.stellar_mail_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.stellar_mail_rate_limit(text,integer,integer) to service_role;
commit;
