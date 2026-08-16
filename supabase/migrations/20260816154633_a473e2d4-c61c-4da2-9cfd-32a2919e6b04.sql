
alter table public.packages add column if not exists is_free boolean not null default false;
alter table public.orders add column if not exists is_free boolean not null default false;

create or replace function public.claim_free_package(_package_id uuid, _ff_uid text)
returns table(success boolean, message text, order_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pkg public.packages%rowtype;
  existing uuid;
  new_order_id uuid;
begin
  if uid is null then return query select false, 'Not authenticated', null::uuid; return; end if;
  if _ff_uid is null or length(trim(_ff_uid)) < 6 then return query select false, 'Invalid UID', null::uuid; return; end if;

  select * into pkg from public.packages
   where id = _package_id and is_active = true and type = 'like' and is_free = true;
  if not found then return query select false, 'Free package not available', null::uuid; return; end if;

  select id into existing from public.orders
   where user_id = uid and is_free = true and status in ('pending','approved') limit 1;
  if existing is not null then
    return query select false, 'You already have an active free package', null::uuid; return;
  end if;

  insert into public.orders (user_id, package_id, ff_uid, trx_id, likes_per_day, duration_days, type, status, approved_at, next_run_at, visits_target, payment_provider, is_free)
  values (uid, pkg.id, trim(_ff_uid), 'FREE-' || substr(gen_random_uuid()::text,1,8), pkg.likes_per_day, pkg.duration_days, 'like', 'approved', now(), now(), 0, 'free', true)
  returning id into new_order_id;

  return query select true, 'Free package activated', new_order_id;
end;
$$;

revoke all on function public.claim_free_package(uuid, text) from public, anon;
grant execute on function public.claim_free_package(uuid, text) to authenticated;
