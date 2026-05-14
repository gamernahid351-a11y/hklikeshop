import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Upload, Crown, Star, Rocket, RefreshCcw, Activity, Zap, Clock, Globe, Trash2, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getGuildInfo } from "@/lib/guild.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import gsLogo from "@/assets/gs-shop-logo.png";
import lionLogo from "@/assets/guild-lion.png";
import instanceBg from "@/assets/instance-bg.jpg";
import settingsGuide from "@/assets/guild-settings-guide.png";
import { BkashPaymentBox } from "@/components/BkashPaymentBox";

export const Route = createFileRoute("/_authenticated/dashboard/guild")({
  component: GuildPage,
});

type GPkg = { id: string; name: string; price_bdt: number; duration_label: string | null; bot_count: number; image_url: string | null; description: string | null; category: string };
type GOrder = {
  id: string; guild_id: string; status: string; trx_id: string;
  guild_package_id: string; created_at: string; expires_at: string | null;
  last_synced_guild: any | null;
  guild_packages: { name: string; price_bdt: number; bot_count: number } | null;
};

function GuildPage() {
  const { user } = useAuth();
  const [pkgs, setPkgs] = useState<GPkg[]>([]);
  const [orders, setOrders] = useState<GOrder[]>([]);
  const [bkash, setBkash] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [category, setCategory] = useState<"glory" | "level_up">("glory");
  const [guildId, setGuildId] = useState("");
  const [trxId, setTrxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    if (!user) return;
    const [{ data: p }, { data: o }, { data: s }] = await Promise.all([
      supabase.from("guild_packages").select("id,name,price_bdt,duration_label,bot_count,image_url,description,category").eq("is_active", true).order("sort_order"),
      supabase.from("guild_orders").select("id,guild_id,status,trx_id,guild_package_id,created_at,expires_at,last_synced_guild,guild_packages(name,price_bdt,bot_count)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("app_settings").select("bkash_number,bkash_number_guild").eq("id", 1).maybeSingle(),
    ]);
    setPkgs((p ?? []) as GPkg[]);
    setOrders((o ?? []) as unknown as GOrder[]);
    setBkash((s as any)?.bkash_number_guild || (s as any)?.bkash_number || "");
  }
  useEffect(() => { load(); }, [user]);

  // Auto-refresh guild info every 5 minutes for active instances (within 8h window)
  useEffect(() => {
    const EIGHT_H = 8 * 60 * 60 * 1000;
    const live = orders.filter((o) => {
      if (o.status !== "approved" && o.status !== "running") return false;
      const age = Date.now() - new Date(o.created_at).getTime();
      return age < EIGHT_H;
    });
    if (live.length === 0) return;
    let cancelled = false;
    async function tick() {
      for (const o of live) {
        try {
          const { info } = await getGuildInfo({ data: { guildId: o.guild_id } });
          if (cancelled || !info) continue;
          await supabase.from("guild_orders").update({ last_synced_guild: info as any, last_synced_at: new Date().toISOString() }).eq("id", o.id);
        } catch {}
      }
      if (!cancelled) load();
    }
    tick();
    const t = setInterval(tick, 5 * 60 * 1000); // 5 minutes
    return () => { cancelled = true; clearInterval(t); };
  }, [orders.map((o) => o.id + o.status).join(",")]);

  const filteredPkgs = pkgs.filter((p) => (p.category || "glory") === category);
  const pkg = filteredPkgs.find((p) => p.id === selectedPkg) ?? filteredPkgs[0];
  useEffect(() => {
    if (!filteredPkgs.find((p) => p.id === selectedPkg)) {
      setSelectedPkg(filteredPkgs[0]?.id ?? "");
    }
  }, [category, pkgs.length]);
  const liveOrders = orders.filter((o) => o.status === "approved" || o.status === "running");

  async function preCheck() {
    if (!guildId.trim()) return toast.error("Guild ID din");
    setPreviewing(true);
    try {
      const { info } = await getGuildInfo({ data: { guildId: guildId.trim() } });
      if (!info) return toast.error("Guild khuje pawa jay nai");
      setPreview(info);
    } catch (e: any) { toast.error(e.message); }
    finally { setPreviewing(false); }
  }

  async function submit() {
    if (!user || !pkg) return;
    if (!guildId.trim()) return toast.error("Guild ID din");
    if (!trxId.trim()) return toast.error("TrxID din");
    if (!file) return toast.error("Screenshot upload korun");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/guild/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("guild_orders").insert({
        user_id: user.id,
        guild_package_id: pkg.id,
        guild_id: guildId.trim(),
        trx_id: trxId.trim(),
        payment_screenshot_url: path,
      });
      if (error) throw error;
      toast.success("Order submitted! Admin approval er opekkhay.");
      setTrxId(""); setFile(null); setGuildId(""); setPreview(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-2xl">Guild Bots</h1>
      </div>

      {/* Order form */}
      <Card className="bg-gradient-card border-border p-4 space-y-3">
        <div className="font-display font-bold text-sm">Notun Bot Order</div>

        {/* Category buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={category === "glory" ? "default" : "outline"}
            className={category === "glory" ? "bg-gradient-primary text-primary-foreground" : ""}
            onClick={() => setCategory("glory")}
          >
            <Trophy className="w-4 h-4 mr-1" /> Glory Bots
          </Button>
          <Button
            type="button"
            variant={category === "level_up" ? "default" : "outline"}
            className={category === "level_up" ? "bg-gradient-primary text-primary-foreground" : ""}
            onClick={() => setCategory("level_up")}
          >
            <TrendingUp className="w-4 h-4 mr-1" /> Level Up
          </Button>
        </div>

        <div>
          <Label>Package</Label>
          <select className="w-full h-10 px-3 mt-1 rounded-md bg-background border border-input text-sm" value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)}>
            {filteredPkgs.map((p) => <option key={p.id} value={p.id}>{p.name} — ৳{Number(p.price_bdt)} ({p.bot_count} bot{p.bot_count > 1 ? "s" : ""}{p.duration_label ? `, ${p.duration_label}` : ""})</option>)}
          </select>
          {filteredPkgs.length === 0 && <div className="text-xs text-muted-foreground mt-1">A category te kono package nei.</div>}
        </div>

        <div>
          <Label>Guild ID</Label>
          <div className="flex gap-2 mt-1">
            <Input value={guildId} onChange={(e) => setGuildId(e.target.value)} placeholder="e.g. 3097225950" />
            <Button type="button" variant="outline" onClick={preCheck} disabled={previewing}>
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
            </Button>
          </div>
        </div>

        {preview && (
          <Card className="bg-background/60 border-primary/30 p-3 text-xs space-y-1">
            <div className="font-bold text-primary">{preview.GuildName} <span className="text-muted-foreground font-normal">Lv{preview.GuildLevel}</span></div>
            <div>Members: {preview.CurrentMembers}/{preview.MaxMembers} • Glory: {preview.TotalActivityPoints}</div>
            {preview.GuildLeader && <div>Leader: {preview.GuildLeader.Name}</div>}
          </Card>
        )}

        {pkg && bkash && <BkashPaymentBox number={bkash} amount={pkg.price_bdt} />}

        <div>
          <Label>bKash TrxID</Label>
          <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 9F8K2XYZ" className="mt-1" />
        </div>

        <div>
          <Label>Payment Screenshot</Label>
          <label className="mt-1 flex items-center justify-center gap-2 p-3 rounded-md border border-dashed border-border bg-secondary/30 cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            <span className="truncate">{file ? file.name : "Screenshot select korun"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <Button
          onClick={() => {
            if (!pkg) return;
            if (!guildId.trim()) return toast.error("Guild ID din");
            if (!trxId.trim()) return toast.error("TrxID din");
            if (!file) return toast.error("Screenshot upload korun");
            setConfirmOpen(true);
          }}
          disabled={busy || !pkg}
          className="w-full bg-gradient-primary text-primary-foreground font-semibold"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Rocket className="w-4 h-4 mr-1" />} Launch Bot
        </Button>
      </Card>

      {/* History */}
      <div className="space-y-2">
        <div className="font-display font-bold text-sm">Order History</div>
        {orders.length === 0 && <Card className="bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No orders yet</Card>}
        {orders.map((o) => (
          <Card key={o.id} className="bg-gradient-card border-border p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-semibold truncate">{o.guild_packages?.name ?? "Guild Bot"}</div>
              <div className="text-xs text-muted-foreground">Guild ID: {o.guild_id}</div>
            </div>
            <Badge variant="outline" className="capitalize">{o.status}</Badge>
          </Card>
        ))}
      </div>

      {/* Active instances - below orders */}
      {liveOrders.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-primary pt-2">
            <Activity className="w-5 h-5" />
            <h2 className="font-display font-bold text-lg">Bot Instances</h2>
          </div>
          {liveOrders.map((o) => <BotInstanceCard key={o.id} order={o} />)}
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="bg-card border-warning/50 max-w-lg max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Please make your guild settings like this
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <img src={settingsGuide} alt="Guild settings reference" className="w-full rounded-lg border border-border" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Bot launch korar age apnar guild a giye ai settings gulo confirm korun:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 pl-2">
                <li><b>Auto Approval: ON</b></li>
                <li>LV / BR-RANKED / CS-RANKED: <b>DEFAULT</b></li>
                <li>Slogan & Notice set kora thakte hobe</li>
              </ul>
              <p className="text-warning text-xs pt-1">Settings thik na thakle bot kaaj korbe na.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>Cancel</Button>
            <Button
              onClick={async () => { await submit(); setConfirmOpen(false); }}
              disabled={busy}
              className="bg-gradient-primary text-primary-foreground font-semibold"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Rocket className="w-4 h-4 mr-1" />} Launch Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BotInstanceCard({ order }: { order: GOrder }) {
  const g = order.last_synced_guild;
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try {
      const { info } = await getGuildInfo({ data: { guildId: order.guild_id } });
      if (info) {
        await supabase.from("guild_orders").update({ last_synced_guild: info as any, last_synced_at: new Date().toISOString() }).eq("id", order.id);
        toast.success("Refreshed");
      } else toast.error("Guild not found");
    } finally { setRefreshing(false); }
  }
  const EIGHT_H_MS = 8 * 60 * 60 * 1000;
  const startMs = new Date(order.created_at).getTime();
  const uptimeMs = Math.min(Date.now() - startMs, EIGHT_H_MS);
  const remainMs = Math.max(0, EIGHT_H_MS - (Date.now() - startMs));
  const expired = remainMs === 0;
  const h = Math.floor(uptimeMs / 3600000);
  const m = Math.floor((uptimeMs % 3600000) / 60000);
  const rh = Math.floor(remainMs / 3600000);
  const rm = Math.floor((remainMs % 3600000) / 60000);
  const goalPct = Math.min(100, Math.round((uptimeMs / EIGHT_H_MS) * 100));
  const botCount = order.guild_packages?.bot_count ?? 1;
  const createdDate = new Date(order.created_at).toLocaleDateString("en-GB");

  return (
    <div className="space-y-3">
      {/* PART 1: Guild Info from API */}
      <Card className="bg-card/80 border-2 border-warning/60 p-4 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="relative w-20 h-20 shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-warning/60 bg-secondary">
              <img src={lionLogo} alt="Guild" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-warning text-[10px] font-bold text-background tracking-wider whitespace-nowrap shadow">
              LV.{g?.GuildLevel ?? "?"}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
              <div className="font-display font-bold text-lg truncate">{g?.GuildName ?? "Loading…"}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>ID: {order.guild_id}</span>
              <span className="text-border">|</span>
              <span>🇧🇩 BD</span>
              <span className="text-border">|</span>
              <span className="text-primary font-bold">{botCount} BOTS</span>
            </div>
            {g?.GuildSlogan && <div className="text-xs italic text-warning mt-1 truncate">"{g.GuildSlogan}"</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Users className="w-3 h-3" />MEMBERS</div>
            <div className="font-bold text-base mt-1">{g?.CurrentMembers ?? "—"}<span className="text-muted-foreground text-xs">/{g?.MaxMembers ?? "—"}</span></div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Crown className="w-3 h-3" />LEADER</div>
            <div className="font-bold text-sm mt-1 truncate" title={g?.GuildLeader?.Name ?? undefined}>{g?.GuildLeader?.Name ?? "—"}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Star className="w-3 h-3" />TOTAL GLORY</div>
            <div className="font-bold text-base mt-1 text-warning">{(g?.TotalActivityPoints ?? 0).toLocaleString()}</div>
          </div>
        </div>
      </Card>

      {/* PART 2: GS STORE Bot Instance */}
      <Card
        className="relative overflow-hidden border-primary/30 p-4 space-y-3"
        style={{
          backgroundImage: `linear-gradient(135deg, hsl(var(--background)/0.85), hsl(var(--background)/0.92)), url(${instanceBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-primary/40 bg-secondary shrink-0">
            <img src={gsLogo} alt="GS STORE" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-display font-bold text-base">GS <span className="text-primary italic">STORE</span></div>
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Users className="w-3 h-3" /> {g?.GuildName ?? order.guild_id} • Lv{g?.GuildLevel ?? "?"} • <Globe className="w-3 h-3" /> 🇧🇩 BD
            </div>
          </div>
          {expired ? (
            <Badge className="bg-muted text-muted-foreground border-border">● COMPLETED</Badge>
          ) : (
            <Badge className="bg-success/20 text-success border-success/40 hover:bg-success/30">● RUNNING</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-primary font-bold">
            <Zap className="w-4 h-4" /> {botCount} bots
          </div>
          <div className="text-xs text-muted-foreground">Basic • 2L+ Glory</div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-4 h-4" /> Uptime <span className="text-foreground font-bold">{h}h {m}m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-warning" /> Glory <span className="text-warning font-bold">{(g?.TotalActivityPoints ?? 0).toLocaleString()}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted-foreground tracking-wider">8H GOAL {expired ? "DONE" : `· ${rh}h ${rm}m left`}</span>
            <span className="text-primary font-bold">{goalPct}%</span>
          </div>
          <div className="h-1.5 bg-background/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Auto-update every 5 min from API</div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Created: {createdDate}</span>
          <span>🇧🇩 Bangladesh</span>
        </div>

        {expired ? (
          <Button
            onClick={async () => {
              if (!confirm("8 hour complete. Delete this instance?")) return;
              const { error } = await supabase.from("guild_orders").delete().eq("id", order.id);
              if (error) toast.error(error.message); else { toast.success("Instance deleted"); window.location.reload(); }
            }}
            variant="outline"
            size="sm"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Instance
          </Button>
        ) : (
          <Button onClick={refresh} disabled={refreshing} variant="outline" size="sm" className="w-full border-primary/40 text-primary hover:bg-primary/10">
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCcw className="w-3.5 h-3.5 mr-1" />} Restart Instance
          </Button>
        )}
      </Card>
    </div>
  );
}
