
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS level_up_web_url text NOT NULL DEFAULT 'https://gslevelup.lovable.app/';
ALTER TABLE public.orders ALTER COLUMN ff_uid DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_username text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_password text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

UPDATE public.packages SET type='levelup'::package_type WHERE name ILIKE '%LEVEL UP BOT%';
UPDATE public.categories SET type='levelup'::package_type WHERE name ILIKE '%LEVEL UP BOT%';
