import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const BOHUDUR_BASE = "https://request.bohudur.one";

export const createBohudurDeposit = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        amount: z.number().min(1).max(1000000),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.BOHUDUR_API_KEY;
    if (!apiKey) throw new Error("Payment gateway not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    const authHeader = getRequestHeader("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Response("Unauthorized", { status: 401 });
    const token = authHeader.slice(7);

    const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) throw new Response("Unauthorized", { status: 401 });
    const userId = claims.claims.sub as string;

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email,full_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Build absolute URLs from incoming request host
    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    // Insert a pending deposit row first to reserve a record
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
    if (insErr || !dep) throw new Error(insErr?.message || "Could not create deposit");

    const body = {
      full_name: (prof?.full_name as string) || "HK Customer",
      email: (prof?.email as string) || "noreply@hklikeshop.com",
      amount: data.amount,
      return_type: "GET",
      redirect_url: `${origin}/dashboard/deposit-result?dep=${dep.id}`,
      cancel_url: `${origin}/dashboard/deposit-result?dep=${dep.id}&cancel=1`,
      metadata: { deposit_id: dep.id, user_id: userId },
      webhook: {
        success: `${origin}/api/public/bohudur-webhook`,
        cancel: `${origin}/api/public/bohudur-webhook`,
      },
    };

    const res = await fetch(`${BOHUDUR_BASE}/create/v2/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "AH-BOHUDUR-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as any;
    if (json.status !== "success" || !json.payment_url || !json.paymentkey) {
      // mark deposit as failed
      await supabaseAdmin.from("deposit_orders").update({ status: "rejected", rejection_reason: json.message || "gateway error" }).eq("id", dep.id);
      throw new Error(json.message || "Payment gateway error");
    }

    await supabaseAdmin
      .from("deposit_orders")
      .update({ bohudur_paymentkey: json.paymentkey })
      .eq("id", dep.id);

    return { paymentUrl: json.payment_url as string, depositId: dep.id };
  });
