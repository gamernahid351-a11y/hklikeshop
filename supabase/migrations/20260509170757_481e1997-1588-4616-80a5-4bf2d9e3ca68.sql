
-- ENUMS
create type public.app_role as enum ('admin','user');
create type public.package_type as enum ('like','visit');
create type public.order_status as enum ('pending','approved','rejected','completed');
create type public.coupon_type as enum ('like','visit','panel');
create type public.coupon_order_status as enum ('pending','delivered','rejected');
create type public.guild_order_status as enum ('pending','approved','rejected','running','expired');
create type public.panel_order_status as enum ('pending','approved','rejected','delivered');

-- PROFILES
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  type public.package_type not null default 'like',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create trigger t_categories_upd before update on public.categories for each row execute function public.set_updated_at();

-- PACKAGES
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  type public.package_type not null default 'like',
  likes_per_day int not null default 0,
  duration_days int not null default 0,
  visits_count int not null default 0,
  price_bdt numeric not null,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.packages enable row level security;
create trigger t_packages_upd before update on public.packages for each row execute function public.set_updated_at();

-- PANEL CATEGORIES
create table public.panel_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.panel_categories enable row level security;

-- PANEL PACKAGES
create table public.panel_packages (
  id uuid primary key default gen_random_uuid(),
  panel_category_id uuid references public.panel_categories(id) on delete set null,
  name text not null,
  description text,
  price_bdt numeric not null,
  image_url text,
  video_url text,
  apk_link text,
  duration_label text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.panel_packages enable row level security;
create trigger t_panel_packages_upd before update on public.panel_packages for each row execute function public.set_updated_at();

-- PANEL KEYS
create table public.panel_keys (
  id uuid primary key default gen_random_uuid(),
  panel_package_id uuid not null references public.panel_packages(id) on delete cascade,
  key_value text not null,
  is_used boolean not null default false,
  assigned_order_id uuid,
  assigned_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.panel_keys enable row level security;

-- PANEL ORDERS
create table public.panel_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  panel_package_id uuid not null references public.panel_packages(id) on delete restrict,
  trx_id text not null,
  payment_screenshot_url text,
  status public.panel_order_status not null default 'pending',
  delivered_key text,
  delivered_at timestamptz,
  approved_at timestamptz,
  apk_link text,
  rejection_reason text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.panel_orders enable row level security;
create trigger t_panel_orders_upd before update on public.panel_orders for each row execute function public.set_updated_at();

-- GUILD PACKAGES
create table public.guild_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_bdt numeric not null,
  image_url text,
  duration_label text,
  bot_count int not null default 1,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guild_packages enable row level security;
create trigger t_guild_packages_upd before update on public.guild_packages for each row execute function public.set_updated_at();

-- GUILD ORDERS
create table public.guild_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  guild_package_id uuid not null references public.guild_packages(id) on delete restrict,
  guild_id text not null,
  trx_id text not null,
  payment_screenshot_url text,
  status public.guild_order_status not null default 'pending',
  expires_at timestamptz,
  approved_at timestamptz,
  last_synced_at timestamptz,
  last_synced_guild jsonb,
  rejection_reason text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guild_orders enable row level security;
create trigger t_guild_orders_upd before update on public.guild_orders for each row execute function public.set_updated_at();

-- COUPONS
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  type public.coupon_type not null,
  code text not null unique,
  is_used boolean not null default false,
  assigned_order_id uuid,
  assigned_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;

-- COUPON ORDERS
create table public.coupon_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.coupon_type not null,
  trx_id text not null,
  price_bdt numeric not null,
  payment_screenshot_url text,
  status public.coupon_order_status not null default 'pending',
  delivered_code text,
  delivered_at timestamptz,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coupon_orders enable row level security;
create trigger t_coupon_orders_upd before update on public.coupon_orders for each row execute function public.set_updated_at();

-- ORDERS (likes/visits)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  package_id uuid not null references public.packages(id) on delete restrict,
  type public.package_type not null default 'like',
  ff_uid text not null,
  trx_id text not null,
  payment_provider text,
  payment_ref text,
  payment_url text,
  payment_screenshot_url text,
  likes_per_day int not null default 0,
  duration_days int not null default 0,
  days_completed int not null default 0,
  total_likes_sent int not null default 0,
  visits_target int not null default 0,
  visits_delivered int not null default 0,
  status public.order_status not null default 'pending',
  next_run_at timestamptz,
  approved_at timestamptz,
  rejection_reason text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create trigger t_orders_upd before update on public.orders for each row execute function public.set_updated_at();

create table public.like_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  run_date date not null default current_date,
  likes_sent int not null default 0,
  success boolean not null default false,
  api_response jsonb,
  error_message text,
  created_at timestamptz not null default now()
);
alter table public.like_logs enable row level security;

create table public.visit_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  visits_sent int not null default 0,
  success boolean not null default false,
  api_response jsonb,
  error_message text,
  created_at timestamptz not null default now()
);
alter table public.visit_logs enable row level security;

-- HERO SLIDES
create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link_url text,
  title text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hero_slides enable row level security;
create trigger t_hero_slides_upd before update on public.hero_slides for each row execute function public.set_updated_at();

-- APP SETTINGS
create table public.app_settings (
  id int primary key default 1,
  banner_api_url text not null default '',
  like_api_url text not null default '',
  visit_api_url text not null default '',
  bkash_number text not null default '',
  bkash_number_visit text not null default '',
  bkash_number_guild text not null default '',
  payment_instructions text not null default '',
  admin_telegram text not null default '@proxaura',
  logo_url text,
  rupantor_enabled boolean not null default false,
  coupon_price_like numeric not null default 0,
  coupon_price_visit numeric not null default 0,
  coupon_price_panel numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
insert into public.app_settings (id) values (1) on conflict do nothing;

-- =============== POLICIES ===============
-- profiles
create policy "profiles_self_select" on public.profiles for select using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "profiles_self_upd" on public.profiles for update using (auth.uid()=user_id);
create policy "profiles_self_ins" on public.profiles for insert with check (auth.uid()=user_id);

-- user_roles
create policy "roles_self_view" on public.user_roles for select using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- public read: categories, packages, panel_categories, panel_packages, guild_packages, hero_slides, app_settings
do $$
declare t text;
begin
  for t in select unnest(array['categories','packages','panel_categories','panel_packages','guild_packages','hero_slides','app_settings']) loop
    execute format('create policy "%I_public_read" on public.%I for select using (true)', t, t);
    execute format('create policy "%I_admin_write" on public.%I for all using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t, t);
  end loop;
end$$;

-- panel_keys: admin only
create policy "panel_keys_admin" on public.panel_keys for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- coupons: admin only
create policy "coupons_admin" on public.coupons for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- orders / panel_orders / guild_orders / coupon_orders
do $$
declare t text;
begin
  for t in select unnest(array['orders','panel_orders','guild_orders','coupon_orders']) loop
    execute format('create policy "%I_user_select" on public.%I for select using (auth.uid()=user_id or public.has_role(auth.uid(),''admin''))', t, t);
    execute format('create policy "%I_user_insert" on public.%I for insert with check (auth.uid()=user_id)', t, t);
    execute format('create policy "%I_admin_update" on public.%I for update using (public.has_role(auth.uid(),''admin''))', t, t);
    execute format('create policy "%I_admin_delete" on public.%I for delete using (public.has_role(auth.uid(),''admin''))', t, t);
  end loop;
end$$;

-- logs admin only
create policy "like_logs_admin" on public.like_logs for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "visit_logs_admin" on public.visit_logs for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =============== FUNCTIONS ===============
create or replace function public.approve_coupon_order(_order_id uuid, _manual_code text default null)
returns table(success boolean, message text, code_value text)
language plpgsql security definer set search_path = public as $$
declare ord public.coupon_orders%rowtype; cpn public.coupons%rowtype; out_code text;
begin
  select * into ord from public.coupon_orders where id = _order_id for update;
  if not found then return query select false, 'Order not found', null::text; return; end if;
  if ord.status <> 'pending' then return query select false, 'Order not pending', null::text; return; end if;
  if _manual_code is not null and length(trim(_manual_code))>0 then
    out_code := _manual_code;
  else
    select * into cpn from public.coupons where type=ord.type and is_used=false order by created_at asc limit 1 for update;
    if not found then return query select false, 'No coupons available', null::text; return; end if;
    out_code := cpn.code;
    update public.coupons set is_used=true, assigned_order_id=ord.id, assigned_at=now() where id=cpn.id;
  end if;
  update public.coupon_orders set status='delivered', delivered_code=out_code, delivered_at=now(), approved_at=now() where id=ord.id;
  return query select true, 'Delivered', out_code;
end;$$;

create or replace function public.approve_panel_order(_order_id uuid, _manual_key text default null)
returns table(success boolean, message text, key_value text)
language plpgsql security definer set search_path = public as $$
declare ord public.panel_orders%rowtype; k public.panel_keys%rowtype; out_key text;
begin
  select * into ord from public.panel_orders where id=_order_id for update;
  if not found then return query select false, 'Order not found', null::text; return; end if;
  if ord.status <> 'pending' then return query select false, 'Order not pending', null::text; return; end if;
  if _manual_key is not null and length(trim(_manual_key))>0 then
    out_key := _manual_key;
  else
    select * into k from public.panel_keys where panel_package_id=ord.panel_package_id and is_used=false order by created_at asc limit 1 for update;
    if not found then return query select false, 'No keys available', null::text; return; end if;
    out_key := k.key_value;
    update public.panel_keys set is_used=true, assigned_order_id=ord.id, assigned_at=now() where id=k.id;
  end if;
  update public.panel_orders set status='delivered', delivered_key=out_key, delivered_at=now(), approved_at=now() where id=ord.id;
  return query select true, 'Delivered', out_key;
end;$$;

-- ================ STORAGE ================
insert into storage.buckets (id, name, public) values ('payment-screenshots','payment-screenshots', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('product-images','product-images', true) on conflict do nothing;

create policy "payment_uploads" on storage.objects for insert to authenticated with check (bucket_id='payment-screenshots');
create policy "payment_read_pub" on storage.objects for select using (bucket_id in ('payment-screenshots','product-images'));
create policy "products_admin_write" on storage.objects for insert to authenticated with check (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "products_admin_upd" on storage.objects for update to authenticated using (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "products_admin_del" on storage.objects for delete to authenticated using (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));

-- ================ SEED ================
insert into public.categories (name, type, sort_order, description) values
 ('LIKES PACKAGES','like',1,'Free Fire BD auto likes'),
 ('VISITS PACKAGES','visit',2,'Profile visit boosts'),
 ('LEVEL UP BOT','like',3,'LEVEL UP BOT — username/password delivered by admin');
