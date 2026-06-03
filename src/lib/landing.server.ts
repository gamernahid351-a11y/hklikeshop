import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fetchLandingData() {
  const [
    { data: packages, error: packagesError },
    { data: settings },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("packages")
        .select("id,name,description,price_bdt,type,likes_per_day,duration_days")
        .eq("is_active", true)
        .eq("type", "like")
        .order("sort_order"),
      supabaseAdmin
        .from("app_settings")
        .select("logo_url, landing_notice_enabled, landing_notice_image_url, landing_notice_telegram_url, landing_notice_text")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  if (packagesError) throw new Error(packagesError.message);

  return {
    packages: packages ?? [],
    logoUrl: (settings?.logo_url as string | null) ?? null,
    notice: {
      enabled: Boolean((settings as any)?.landing_notice_enabled),
      imageUrl: ((settings as any)?.landing_notice_image_url as string) ?? "",
      telegramUrl: ((settings as any)?.landing_notice_telegram_url as string) ?? "",
      text: ((settings as any)?.landing_notice_text as string) ?? "",
    },
  };
}