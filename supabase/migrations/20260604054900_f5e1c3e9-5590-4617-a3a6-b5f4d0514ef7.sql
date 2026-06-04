
REVOKE EXECUTE ON FUNCTION public.purchase_with_wallet(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_deposit_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_coupon_order(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_panel_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_coupon_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_panel_order(uuid, text) TO authenticated;
