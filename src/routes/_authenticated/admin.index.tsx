import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Heart, Hourglass, Package, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const [s, setS] = useState({ pending: 0, active: 0, completed: 0, rejected: 0, packages: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: pending }, { count: active }, { count: completed }, { count: rejected }, { count: packages }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending").eq("type", "like"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "approved").eq("type", "like"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed").eq("type", "like"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "rejected").eq("type", "like"),
        supabase.from("packages").select("*", { count: "exact", head: true }).eq("type", "like"),
      ]);
      setS({ pending: pending ?? 0, active: active ?? 0, completed: completed ?? 0, rejected: rejected ?? 0, packages: packages ?? 0 });
    })();
  }, []);

  const cards = [
    { label: "Pending Likes", val: s.pending, icon: Hourglass, color: "text-warning", to: "/admin/orders" as const },
    { label: "Active Likes", val: s.active, icon: Heart, color: "text-success", to: "/admin/orders" as const },
    { label: "Completed", val: s.completed, icon: CheckCircle2, color: "text-primary", to: "/admin/orders" as const },
    { label: "Rejected", val: s.rejected, icon: XCircle, color: "text-destructive", to: "/admin/orders" as const },
    { label: "Like Packages", val: s.packages, icon: Package, color: "text-primary", to: "/admin/packages" as const },
  ];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Like orders and packages only</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((st) => (
          <Link key={st.label} to={st.to}>
            <Card className="bg-gradient-card border-border p-4 hover:border-primary/40 transition shadow-card">
              <st.icon className={`w-5 h-5 ${st.color} mb-2`} />
              <div className="text-xs text-muted-foreground">{st.label}</div>
              <div className={`text-2xl font-display font-bold ${st.color}`}>{st.val}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
