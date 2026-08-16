
-- Avatar delete policy scoped to owner folder
drop policy if exists "profile_avatars_user_delete" on storage.objects;
create policy "profile_avatars_user_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

-- Validate guild order package integrity at insert time
create or replace function public.validate_guild_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare pkg public.guild_packages%rowtype;
begin
  select * into pkg from public.guild_packages where id = new.guild_package_id;
  if not found or pkg.is_active = false then
    raise exception 'Invalid or inactive guild package';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_guild_order() from public, anon, authenticated;

drop trigger if exists t_guild_orders_validate on public.guild_orders;
create trigger t_guild_orders_validate
before insert on public.guild_orders
for each row execute function public.validate_guild_order();
