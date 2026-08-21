import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Admin-managed key from the database, falling back to the env secret. */
export async function getBohudurApiKey(): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("secure_settings")
      .select("bohudur_api_key")
      .eq("id", 1)
      .maybeSingle();
    const key = (data?.bohudur_api_key as string | undefined)?.trim();
    if (key) return key;
  } catch (e) {
    console.error("[Bohudur] could not read secure_settings", e);
  }
  return process.env["BOHUDUR_API_KEY"] || null;
}
