ALTER TABLE public.guild_packages ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'glory';
CREATE INDEX IF NOT EXISTS idx_guild_packages_category ON public.guild_packages(category);