REVOKE EXECUTE ON FUNCTION public.approve_deposit_by_paymentkey(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_deposit_by_paymentkey(text) TO service_role;