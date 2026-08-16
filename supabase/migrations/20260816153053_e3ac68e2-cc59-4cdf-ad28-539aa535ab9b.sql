-- 1. app_settings: restrict anon to non-sensitive columns
REVOKE SELECT ON public.app_settings FROM anon;
GRANT SELECT (id, logo_url, level_up_web_url, support_whatsapp_url, support_telegram_url, support_messenger_url, support_youtube_url, admin_telegram, landing_notice_enabled, landing_notice_image_url, landing_notice_telegram_url, landing_notice_text) ON public.app_settings TO anon;

-- 2. guild_orders: users may only delete pending orders
DROP POLICY IF EXISTS guild_orders_user_delete ON public.guild_orders;
CREATE POLICY guild_orders_user_delete ON public.guild_orders
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- 3. Storage: payment screenshots owner/admin scoped
DROP POLICY IF EXISTS payment_read_pub ON storage.objects;
DROP POLICY IF EXISTS payment_uploads ON storage.objects;

CREATE POLICY payment_screenshots_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY payment_screenshots_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 4. Public buckets: remove broad listing policies (public URLs still work)
DROP POLICY IF EXISTS package_images_public_read ON storage.objects;
DROP POLICY IF EXISTS profile_avatars_public_read ON storage.objects;

-- 5. Admin checks inside approval functions
CREATE OR REPLACE FUNCTION public.approve_coupon_order(_order_id uuid, _manual_code text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text, code_value text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ord public.coupon_orders%rowtype; cpn public.coupons%rowtype; out_code text;
begin
  if not public.has_role(auth.uid(), 'admin') then return query select false, 'Forbidden', null::text; return; end if;
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
end;$function$;

CREATE OR REPLACE FUNCTION public.approve_panel_order(_order_id uuid, _manual_key text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text, key_value text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ord public.panel_orders%rowtype; k public.panel_keys%rowtype; out_key text;
begin
  if not public.has_role(auth.uid(), 'admin') then return query select false, 'Forbidden', null::text; return; end if;
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
end;$function$;

-- 6. Lock down execution of SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.approve_coupon_order(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_panel_order(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_deposit_order(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.purchase_with_wallet(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_deposit_by_paymentkey(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.approve_coupon_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_panel_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_deposit_order(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purchase_with_wallet(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_deposit_by_paymentkey(text) TO service_role;

-- 7. Move pg_net out of the public schema
DO $$
BEGIN
  BEGIN
    CREATE SCHEMA IF NOT EXISTS extensions;
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net relocation skipped: %', SQLERRM;
  END;
END $$;