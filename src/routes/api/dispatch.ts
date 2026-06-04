import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Dispatch delivery for a single order. Used by admin Approve action.
export const Route = createFileRoute("/api/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") || "";
          const token = auth.replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Unauthorized" }, 401);
          const { data: userRes, error: uErr } = await supabaseAdmin.auth.getUser(token);
          if (uErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
          const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userRes.user.id);
          if (!roles?.some((r) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

          const url = new URL(request.url);
          const orderId = url.searchParams.get("order_id");
          if (!orderId) return json({ error: "order_id required" }, 400);

          const { data: order, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
          if (error || !order) return json({ error: "Order not found" }, 404);
          if (order.status !== "pending" && order.status !== "approved") return json({ error: "Order not active" }, 400);

          const result = await deliverLike(order);
          return json(result, result.success ? 200 : 500);
        } catch (e: any) {
          return json({ error: e.message || "Dispatch error" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function deliverLike(order: any) {
  // per-package API takes precedence over global
  const { data: pkg } = await supabaseAdmin.from("packages").select("like_api_url").eq("id", order.package_id).single();
  const { data: settings } = await supabaseAdmin.from("app_settings").select("like_api_url").eq("id", 1).single();
  const apiTpl = (pkg?.like_api_url && pkg.like_api_url.trim()) || settings?.like_api_url || "";
  if (!apiTpl) return { success: false, errorMessage: "Like API not configured" };

  const apiUrl = apiTpl.replace("{uid}", encodeURIComponent(order.ff_uid));

  let apiResponse: any = null;
  let success = false;
  let errorMessage: string | null = null;
  let likesSent = 0;

  try {
    const res = await fetch(apiUrl, { method: "GET" });
    const text = await res.text();
    try { apiResponse = JSON.parse(text); } catch { apiResponse = { raw: text }; }
    success = res.ok;
    if (!res.ok) errorMessage = `HTTP ${res.status}`;
    likesSent = success ? order.likes_per_day : 0;
  } catch (e: any) {
    errorMessage = e.message;
    apiResponse = { error: e.message };
  }

  await supabaseAdmin.from("like_logs").insert({
    order_id: order.id,
    likes_sent: likesSent,
    api_response: apiResponse,
    success,
    error_message: errorMessage,
  });

  if (success) {
    const newDays = (order.days_completed || 0) + 1;
    const newTotal = (order.total_likes_sent || 0) + likesSent;
    const completed = newDays >= order.duration_days;
    const next = completed ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("orders").update({
      status: completed ? "completed" : "approved",
      approved_at: order.approved_at ?? new Date().toISOString(),
      days_completed: newDays,
      total_likes_sent: newTotal,
      next_run_at: next,
    }).eq("id", order.id);
  } else if (order.status === "pending") {
    await supabaseAdmin.from("orders").update({
      status: "approved",
      approved_at: new Date().toISOString(),
      next_run_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }).eq("id", order.id);
  }

  return { success, likesSent, errorMessage };
}

export { deliverLike };
// Backwards-compat stub for cron route import
export async function deliverAllVisits(order: any) {
  return { success: false, errorMessage: "Visit delivery disabled" };
}
