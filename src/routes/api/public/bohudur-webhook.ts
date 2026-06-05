import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BOHUDUR_BASE = "https://request.bohudur.one";

async function handle(request: Request) {
  const apiKey = process.env.BOHUDUR_API_KEY;
  if (!apiKey) return new Response("not configured", { status: 500 });

  let payload: any = {};
  try {
    payload = await request.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const paymentkey = payload?.paymentkey;
  if (!paymentkey || typeof paymentkey !== "string") return new Response("ok");

  // Always verify status via Query API (best practice from docs)
  const qRes = await fetch(`${BOHUDUR_BASE}/query/v2/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "AH-BOHUDUR-API-KEY": apiKey },
    body: JSON.stringify({ paymentkey }),
  });
  const q = (await qRes.json()) as any;

  if (q.status === "COMPLETED" || q.status === "EXECUTED") {
    // Execute to finalize (idempotent; will return "already executed" if so — fine)
    if (q.status === "COMPLETED") {
      await fetch(`${BOHUDUR_BASE}/execute/v2/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "AH-BOHUDUR-API-KEY": apiKey },
        body: JSON.stringify({ paymentkey }),
      });
    }
    await supabaseAdmin.rpc("approve_deposit_by_paymentkey", { _paymentkey: paymentkey });
  } else if (q.status === "CANCELLED") {
    await supabaseAdmin
      .from("deposit_orders")
      .update({ status: "rejected", rejection_reason: "Cancelled by user" })
      .eq("bohudur_paymentkey", paymentkey)
      .eq("status", "pending");
  }

  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/public/bohudur-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async () => new Response("ok"),
    },
  },
});
