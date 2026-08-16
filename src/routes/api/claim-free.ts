import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { deliverLike } from "./dispatch";

// Daily manual claim for FREE packages. Free orders are never auto-delivered by cron;
// the user must hit this endpoint once every 24 hours.
export const Route = createFileRoute("/api/claim-free")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Unauthorized" }, 401);
          const { data: userRes, error: uErr } = await supabaseAdmin.auth.getUser(token);
          if (uErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

          const orderId = new URL(request.url).searchParams.get("order_id");
          if (!orderId) return json({ error: "order_id required" }, 400);

          const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
          if (!order) return json({ error: "Order not found" }, 404);
          if (order.user_id !== userRes.user.id) return json({ error: "Forbidden" }, 403);
          if (!order.is_free) return json({ error: "Not a free package" }, 400);
          if (order.status !== "approved") return json({ error: "Order is not active" }, 400);
          if (order.next_run_at && new Date(order.next_run_at).getTime() > Date.now()) {
            return json({ error: "Ekhono claim er somoy hoyni" }, 429);
          }

          const result = await deliverLike(order);
          return json(result, result.success ? 200 : 500);
        } catch (e: any) {
          return json({ error: e.message || "Claim error" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
