import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, CheckCircle2, Clock, Copy, Heart, Hourglass, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  ff_uid: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  likes_per_day: number;
  duration_days: number;
  days_completed: number;
  total_likes_sent: number;
  next_run_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  is_free: boolean;
  packages: { name: string; price_bdt: number } | null;
};
type Log = { id: string; likes_sent?: number; success: boolean; error_message: string | null; created_at: string };

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex gap-1.5 font-mono">
      {[["H", h], ["M", m], ["S", s]].map(([l, v]) => (
        <div key={l as string} className="bg-background border border-border rounded px-2 py-1 text-center min-w-[42px]">
          <div className="text-base font-bold text-primary leading-none">{String(v).padStart(2, "0")}</div>
          <div className="text-[9px] text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}

function statusBadge(s: Order["status"]) {
  const map: Record<Order["status"], { label: string; icon: any; cls: string }> = {
    pending: { label: "Pending", icon: Hourglass, cls: "bg-warning/15 text-warning border-warning/30" },
    approved: { label: "Active", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
    rejected: { label: "Rejected", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    completed: { label: "Completed", icon: CheckCircle2, cls: "bg-primary/15 text-primary border-primary/30" },
  };
  const m = map[s];
  const Icon = m.icon;
  return <Badge className={`${m.cls} border gap-1`}><Icon className="w-3 h-3" />{m.label}</Badge>;
}

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [likeLogs, setLikeLogs] = useState<Record<string, Log[]>>({});
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "completed" | "rejected">("all");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  async function claimFree(orderId: string) {
    setClaiming(orderId);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Login again");
      const res = await fetch(`/api/claim-free?order_id=${orderId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || !body?.success) throw new Error(body?.error || body?.errorMessage || "Claim failed");
      toast.success(`${body.likesSent} likes claimed! Next claim 24 ghonta por.`);
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClaiming(null);
    }
  }

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = async () => {
      const { data: settings } = await supabase.from("app_settings").select("banner_api_url").eq("id", 1).single();
      const { data } = await supabase
        .from("orders")
        .select("id,ff_uid,status,likes_per_day,duration_days,days_completed,total_likes_sent,next_run_at,created_at,rejection_reason,is_free,packages(name,price_bdt)")
        .eq("user_id", user.id)
        .eq("type", "like")
        .order("created_at", { ascending: false });

      if (!alive) return;
      setBannerUrl(settings?.banner_api_url || null);
      const list = (data ?? []) as unknown as Order[];
      setOrders(list);

      if (!list.length) {
        setLikeLogs({});
        return;
      }

      const { data: ll } = await supabase.from("like_logs").select("id,order_id,likes_sent,success,error_message,created_at").in("order_id", list.map((o) => o.id)).order("created_at", { ascending: false });
      if (!alive) return;
      const grouped: Record<string, Log[]> = {};
      (ll ?? []).forEach((row: any) => { (grouped[row.order_id] = grouped[row.order_id] || []).push(row); });
      setLikeLogs(grouped);
    };

    load();
    const interval = window.setInterval(load, 30000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [user, reloadKey]);

  const filtered = tab === "all" ? orders : orders.filter((o) => o.status === tab);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-2xl flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> My Like Orders</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Active</TabsTrigger>
          <TabsTrigger value="completed">Done</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-4">
          {filtered.length === 0 && <Card className="bg-gradient-card border-border p-8 text-center text-muted-foreground">No like orders here.</Card>}
          {filtered.map((o) => {
            const showBanner = (o.status === "approved" || o.status === "pending") && bannerUrl && o.ff_uid;
            const logs = likeLogs[o.id] || [];
            return (
              <Card key={o.id} className="bg-gradient-card border-border overflow-hidden shadow-card">
                <div className="p-4 flex items-center justify-between border-b border-border gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3 text-primary" />{o.packages?.name || "Like Package"} • UID</div>
                    <div className="font-mono font-bold text-base truncate">{o.ff_uid ?? "—"}</div>
                  </div>
                  {statusBadge(o.status)}
                </div>

                {showBanner && o.ff_uid && (
                  <div className="bg-background border-b border-border">
                    <img src={bannerUrl!.replace("{uid}", encodeURIComponent(o.ff_uid))} alt="Free Fire profile banner" className="w-full max-h-[200px] object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  </div>
                )}

                <div className="p-4 grid grid-cols-3 gap-2">
                  <div className="bg-background/60 rounded-lg p-2.5 text-center"><div className="text-[10px] text-muted-foreground">Per day</div><div className="flex items-center justify-center gap-1 font-bold text-primary"><Zap className="w-3.5 h-3.5" />{o.likes_per_day}</div></div>
                  <div className="bg-background/60 rounded-lg p-2.5 text-center"><div className="text-[10px] text-muted-foreground">Days</div><div className="flex items-center justify-center gap-1 font-bold text-accent"><Calendar className="w-3.5 h-3.5" />{o.days_completed}/{o.duration_days}</div></div>
                  <div className="bg-background/60 rounded-lg p-2.5 text-center"><div className="text-[10px] text-muted-foreground">Total likes</div><div className="font-bold text-success">{o.total_likes_sent}</div></div>
                </div>

                {o.status === "approved" && o.next_run_at && (
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" />{o.is_free ? "Next claim in" : "Next delivery in"}</div>
                    <Countdown to={o.next_run_at} />
                  </div>
                )}

                {o.is_free && o.status === "approved" && (
                  <div className="px-4 pb-4">
                    <Button
                      onClick={() => claimFree(o.id)}
                      disabled={claiming === o.id || (!!o.next_run_at && new Date(o.next_run_at).getTime() > Date.now())}
                      className="w-full bg-gradient-primary text-primary-foreground font-bold h-11"
                    >
                      {claiming === o.id ? "Claiming..." : (!!o.next_run_at && new Date(o.next_run_at).getTime() > Date.now()) ? "Claim available after countdown" : "Claim Today's Likes"}
                    </Button>
                    <div className="text-[10px] text-muted-foreground text-center mt-1">Free package — protidin nije claim korte hobe.</div>
                  </div>
                )}

                {o.is_free && (() => {
                  const ok = logs.filter((l) => l.success);
                  const totalClaimed = ok.reduce((sum, l) => sum + (l.likes_sent || 0), 0);
                  const last = ok[0];
                  return (
                    <div className="px-4 pb-4">
                      <div className="text-xs text-muted-foreground mb-2">Claim history</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-background/60 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] text-muted-foreground">Total claims</div>
                          <div className="font-bold text-primary">{ok.length}</div>
                        </div>
                        <div className="bg-background/60 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] text-muted-foreground">Total claimed likes</div>
                          <div className="font-bold text-success">{totalClaimed.toLocaleString()}</div>
                        </div>
                        <div className="bg-background/60 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] text-muted-foreground">Last claim</div>
                          <div className="font-bold text-accent text-xs leading-tight">
                            {last
                              ? `${new Date(last.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${new Date(last.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                              : "Never"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {o.status === "rejected" && o.rejection_reason && <div className="px-4 pb-3 text-sm text-destructive">Reason: {o.rejection_reason}</div>}

                {logs.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="text-xs text-muted-foreground mb-2">Delivery history</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {logs.map((lg) => (
                        <div key={lg.id} className={`rounded-lg p-2.5 border ${lg.success ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}>
                          <div className="text-[10px] text-muted-foreground">{new Date(lg.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(lg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                          <div className={`mt-1 font-bold flex items-center gap-1 ${lg.success ? "text-success" : "text-destructive"}`}><Zap className="w-3.5 h-3.5" />{(lg.likes_sent || 0).toLocaleString()} likes</div>
                          {!lg.success && lg.error_message && <div className="text-[10px] text-destructive truncate mt-0.5">{lg.error_message}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
