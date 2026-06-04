
-- 1. wallet on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance numeric NOT NULL DEFAULT 0;

-- 2. app_settings nagad
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nagad_number text NOT NULL DEFAULT '';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS min_deposit numeric NOT NULL DEFAULT 10;

-- 3. per-package api
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS like_api_url text;

-- 4. deposit orders
CREATE TABLE IF NOT EXISTS public.deposit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('bkash','nagad')),
  trx_id text NOT NULL,
  sender_number text,
  payment_screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposit_orders TO authenticated;
GRANT ALL ON public.deposit_orders TO service_role;
ALTER TABLE public.deposit_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deposit_user_select" ON public.deposit_orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "deposit_user_insert" ON public.deposit_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deposit_admin_update" ON public.deposit_orders FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "deposit_admin_delete" ON public.deposit_orders FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_deposit_orders_updated BEFORE UPDATE ON public.deposit_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL CHECK (kind IN ('deposit','purchase','refund','adjust')),
  reference_id uuid,
  description text,
  balance_after numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wt_user_select" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- 6. purchase with wallet (used by user package buy)
CREATE OR REPLACE FUNCTION public.purchase_with_wallet(_package_id uuid, _ff_uid text)
RETURNS TABLE(success boolean, message text, order_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  pkg public.packages%ROWTYPE;
  bal numeric;
  new_order_id uuid;
  new_bal numeric;
BEGIN
  IF uid IS NULL THEN RETURN QUERY SELECT false, 'Not authenticated', NULL::uuid; RETURN; END IF;
  IF _ff_uid IS NULL OR length(trim(_ff_uid)) < 6 THEN RETURN QUERY SELECT false, 'Invalid UID', NULL::uuid; RETURN; END IF;
  SELECT * INTO pkg FROM public.packages WHERE id = _package_id AND is_active = true AND type = 'like';
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Package not available', NULL::uuid; RETURN; END IF;

  SELECT wallet_balance INTO bal FROM public.profiles WHERE user_id = uid FOR UPDATE;
  IF bal IS NULL THEN
    INSERT INTO public.profiles (user_id, wallet_balance) VALUES (uid, 0) ON CONFLICT (user_id) DO NOTHING;
    bal := 0;
  END IF;
  IF bal < pkg.price_bdt THEN RETURN QUERY SELECT false, 'Insufficient wallet balance', NULL::uuid; RETURN; END IF;

  new_bal := bal - pkg.price_bdt;
  UPDATE public.profiles SET wallet_balance = new_bal, updated_at = now() WHERE user_id = uid;

  INSERT INTO public.orders (user_id, package_id, ff_uid, trx_id, likes_per_day, duration_days, type, status, approved_at, next_run_at, visits_target, payment_provider)
  VALUES (uid, pkg.id, trim(_ff_uid), 'WALLET-' || substr(gen_random_uuid()::text,1,8), pkg.likes_per_day, pkg.duration_days, 'like', 'approved', now(), now(), 0, 'wallet')
  RETURNING id INTO new_order_id;

  INSERT INTO public.wallet_transactions (user_id, amount, kind, reference_id, description, balance_after)
  VALUES (uid, -pkg.price_bdt, 'purchase', new_order_id, 'Purchase: ' || pkg.name, new_bal);

  RETURN QUERY SELECT true, 'Order placed', new_order_id;
END;
$$;

-- 7. approve deposit (admin)
CREATE OR REPLACE FUNCTION public.approve_deposit_order(_deposit_id uuid)
RETURNS TABLE(success boolean, message text, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d public.deposit_orders%ROWTYPE;
  bal numeric;
  new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN QUERY SELECT false, 'Forbidden', NULL::numeric; RETURN; END IF;
  SELECT * INTO d FROM public.deposit_orders WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Not found', NULL::numeric; RETURN; END IF;
  IF d.status <> 'pending' THEN RETURN QUERY SELECT false, 'Not pending', NULL::numeric; RETURN; END IF;

  SELECT wallet_balance INTO bal FROM public.profiles WHERE user_id = d.user_id FOR UPDATE;
  IF bal IS NULL THEN
    INSERT INTO public.profiles (user_id, wallet_balance) VALUES (d.user_id, 0) ON CONFLICT (user_id) DO NOTHING;
    bal := 0;
  END IF;
  new_bal := bal + d.amount;
  UPDATE public.profiles SET wallet_balance = new_bal, updated_at = now() WHERE user_id = d.user_id;
  UPDATE public.deposit_orders SET status = 'approved', approved_at = now() WHERE id = d.id;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, reference_id, description, balance_after)
  VALUES (d.user_id, d.amount, 'deposit', d.id, 'Deposit via ' || d.method, new_bal);

  RETURN QUERY SELECT true, 'Approved', new_bal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_with_wallet(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_deposit_order(uuid) TO authenticated;
