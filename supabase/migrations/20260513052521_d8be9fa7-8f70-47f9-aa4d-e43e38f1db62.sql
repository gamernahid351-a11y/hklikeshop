
-- Buckets
insert into storage.buckets (id, name, public) values ('package-images', 'package-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('profile-avatars', 'profile-avatars', true) on conflict (id) do nothing;

-- Public read
create policy "package_images_public_read" on storage.objects for select using (bucket_id = 'package-images');
create policy "profile_avatars_public_read" on storage.objects for select using (bucket_id = 'profile-avatars');

-- Admin write (insert/update/delete) for package-images
create policy "package_images_admin_insert" on storage.objects for insert with check (bucket_id = 'package-images' and public.has_role(auth.uid(), 'admin'));
create policy "package_images_admin_update" on storage.objects for update using (bucket_id = 'package-images' and public.has_role(auth.uid(), 'admin'));
create policy "package_images_admin_delete" on storage.objects for delete using (bucket_id = 'package-images' and public.has_role(auth.uid(), 'admin'));

-- Authenticated users upload their own avatar (folder = user id)
create policy "profile_avatars_user_insert" on storage.objects for insert with check (bucket_id = 'profile-avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "profile_avatars_user_update" on storage.objects for update using (bucket_id = 'profile-avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Settings column for guild info api
alter table public.app_settings
  add column if not exists guild_info_api_url text not null default 'https://danger-guild-management-web.vercel.app/guild?guild_id={guild_id}&region=bd';
