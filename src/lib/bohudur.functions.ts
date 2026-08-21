import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BOHUDUR_BASE = "https://request.bohudur.one";

export const createBohudurDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        amount: z.number().min(1).max(1000000),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { getBohudurApiKey } = await import("./bohudur-key.server");
    const apiKey = await getBohudurApiKey();
    if (!apiKey) {
      console.error("[Bohudur] API key not configured");
      throw new Error("Payment gateway not configured. Please contact admin.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, supabase } = context;

    // Get user profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("email,full_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Build absolute URL from incoming request
    const req = getRequest();
    let origin = "";
    try {
      origin = new URL(req.url).origin;
    } catch {
      origin = "";
    }
    if (!origin || origin.startsWith("http://localhost") || origin.includes("127.0.0.1")) {
      // Fallback to the stable published URL so Bohudur accepts it
      origin = "https://hklikeshop.lovable.app";
    }

    const trxId = `BOH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: dep, error: insErr } = await supabaseAdmin
      .from("deposit_orders")
      .insert({
        user_id: userId,
        amount: data.amount,
        method: "bohudur",
        trx_id: trxId,
        status: "pending",
        payment_provider: "bohudur",
      })
      .select("id")
      .single();
    if (insErr || !dep) {
      console.error("[Bohudur] insert deposit failed:", insErr);
      throw new Error(insErr?.message || "Could not create deposit");
    }

    const email = (prof?.email as string) || `user-${userId.slice(0, 8)}@hklikeshop.com`;
    const fullName = (prof?.full_name as string)?.trim() || "HK Customer";

    const body = {
      full_name: fullName,
      email,
      amount: Number(data.amount),
      return_type: "GET",
      redirect_url: `${origin}/dashboard/deposit-result?dep=${dep.id}`,
      cancel_url: `${origin}/dashboard/deposit-result?dep=${dep.id}&cancel=1`,
      metadata: { deposit_id: dep.id, user_id: userId },
      webhook: {
        success: `${origin}/api/public/bohudur-webhook`,
        cancel: `${origin}/api/public/bohudur-webhook`,
      },
    };

    let res: Response;
    let json: any;
    try {
      res = await fetch(`${BOHUDUR_BASE}/create/v2/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "AH-BOHUDUR-API-KEY": apiKey,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      try { json = JSON.parse(text); } catch { json = { status: "failed", message: text || "Invalid gateway response" }; }
    } catch (e: any) {
      console.error("[Bohudur] fetch failed:", e);
      await supabaseAdmin.from("deposit_orders").update({ status: "rejected", rejection_reason: "Gateway unreachable" }).eq("id", dep.id);
      throw new Error("Payment gateway unreachable. Try again.");
    }

    console.log("[Bohudur] create response:", res.status, JSON.stringify(json));

    if (json?.status !== "success" || !json?.payment_url || !json?.paymentkey) {
      const msg = `${json?.message || "Gateway error"}${json?.responseCode ? ` (code ${json.responseCode})` : ""}`;
      await supabaseAdmin
        .from("deposit_orders")
        .update({ status: "rejected", rejection_reason: msg })
        .eq("id", dep.id);
      throw new Error(msg);
    }

    await supabaseAdmin
      .from("deposit_orders")
      .update({ bohudur_paymentkey: json.paymentkey })
      .eq("id", dep.id);

    return { paymentUrl: json.payment_url as string, depositId: dep.id };
  });
