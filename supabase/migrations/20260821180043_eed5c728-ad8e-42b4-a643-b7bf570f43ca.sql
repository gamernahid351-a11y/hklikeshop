CREATE TABLE public.secure_settings (
  id integer PRIMARY KEY DEFAULT 1,
  bohudur_api_key text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT secure_settings_singleton CHECK (id = 1)
);

GRANT SELECT, UPDATE ON public.secure_settings TO authenticated;
GRANT ALL ON public.secure_settings TO service_role;

ALTER TABLE public.secure_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view secure settings" ON public.secure_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update secure settings" ON public.secure_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER t_secure_settings_upd BEFORE UPDATE ON public.secure_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.secure_settings (id, bohudur_api_key) VALUES (1, '') ON CONFLICT (id) DO NOTHING;