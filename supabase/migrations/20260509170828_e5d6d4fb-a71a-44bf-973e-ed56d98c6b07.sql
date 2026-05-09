
-- Fix search_path on all functions
alter function public.set_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- Revoke broad execute, keep only what server roles need.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;

revoke execute on function public.approve_coupon_order(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_coupon_order(uuid, text) to service_role;

revoke execute on function public.approve_panel_order(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_panel_order(uuid, text) to service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
