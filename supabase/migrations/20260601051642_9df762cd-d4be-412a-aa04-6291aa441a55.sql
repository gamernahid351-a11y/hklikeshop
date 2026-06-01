
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS support_whatsapp_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_telegram_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_messenger_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_notice_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_notice_image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_notice_telegram_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_notice_text text NOT NULL DEFAULT 'Join our Telegram channel!';
