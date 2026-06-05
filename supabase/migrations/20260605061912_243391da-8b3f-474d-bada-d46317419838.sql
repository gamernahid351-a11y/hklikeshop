
ALTER TABLE public.deposit_orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS bohudur_paymentkey text;

CREATE UNIQUE INDEX IF NOT EXISTS deposit_orders_bohudur_paymentkey_idx
  ON public.deposit_orders (bohudur_paymentkey)
  WHERE bohudur_paymentkey IS NOT NULL;

-- Allow service role to bypass / update freely (already true), nothing to grant extra.

-- Function that credits a deposit by bohudur paymentkey (called from webhook with service role)
CREATE OR REPLACE FUNCTION public.approve_deposit_by_paymentkey(_paymentkey text)
RETURNS TABLE(success boolean, message text, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deposit_orders%ROWTYPE;
  bal numeric;
  new_bal numeric;
BEGIN
  SELECT * INTO d FROM public.deposit_orders WHERE bohudur_paymentkey = _paymentkey FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Not found', NULL::numeric; RETURN; END IF;
  IF d.status = 'approved' THEN RETURN QUERY SELECT true, 'Already approved', NULL::numeric; RETURN; END IF;
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
  VALUES (d.user_id, d.amount, 'deposit', d.id, 'Auto deposit via Bohudur', new_bal);

  RETURN QUERY SELECT true, 'Approved', new_bal;
END;
$$;
