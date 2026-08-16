import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, BadgeCheck, Calendar, Heart, Loader2, ThumbsUp, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/packages")({
  component: PackagesPage,
});

type Pkg = {
  id: string; name: string; description: string | null;
  likes_per_day: number; duration_days: number; price_bdt: number; is_free: boolean;
};

function PackagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [bannerTpl, setBannerTpl] = useState<string>("");

  async function loadBalance() {
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("wallet_balance").eq("user_id", user.id).single();
    setBalance(Number((prof as any)?.wallet_balance ?? 0));
  }

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("packages").select("id,name,description,likes_per_day,duration_days,price_bdt,is_free").eq("is_active", true).eq("type", "like").order("sort_order"),
        supabase.from("app_settings").select("banner_api_url").eq("id", 1).single(),
      ]);
      setPkgs((p ?? []) as Pkg[]);
      setBannerTpl((s as any)?.banner_api_url ?? "");
      loadBalance();
    })();
  }, [user]);

  const minPrice = useMemo(() => {
    const prices = pkgs.filter((p) => !p.is_free).map((p) => Number(p.price_bdt)).filter(Boolean);
    return prices.length ? Math.min(...prices) : 5;
  }, [pkgs]);

  async function buy() {
    if (!selected || !user) return;
    if (!/^\d{6,}$/.test(uid)) return toast.error("Valid FF UID din");
    if (selected.is_free) {
      setBusy(true);
      try {
        const { data, error } = await supabase.rpc("claim_free_package", { _package_id: selected.id, _ff_uid: uid.trim() });
        if (error) throw error;
        const row: any = Array.isArray(data) ? data[0] : data;
        if (!row?.success) throw new Error(row?.message || "Failed");
        toast.success("Free package active! Protidin likes claim korun.");
        setSelected(null); setUid("");
        navigate({ to: "/dashboard/orders" });
      } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
      return;
    }
    if (balance < Number(selected.price_bdt)) {
      toast.error(`Insufficient balance. Add ৳${(Number(selected.price_bdt) - balance).toFixed(2)} more.`);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("purchase_with_wallet", { _package_id: selected.id, _ff_uid: uid.trim() });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) throw new Error(row?.message || "Failed");
      toast.success("Order placed! Delivery shuru holo.");
      setSelected(null); setUid("");
      navigate({ to: "/dashboard/orders" });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const bannerUrl = uid && bannerTpl ? bannerTpl.replace("{uid}", encodeURIComponent(uid.trim())) : "";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate({ to: "/dashboard" })} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4"/> Back</button>
        <Link to="/dashboard/wallet">
          <Button className="rounded-full bg-gradient-primary text-primary-foreground font-bold gap-2"><Wallet className="w-4 h-4"/> ৳{balance.toFixed(2)}</Button>
        </Link>
      </div>

      <section className="ff-grid-surface rounded-3xl border border-border p-6 text-center shadow-card">
        <h1 className="font-display font-extrabold text-3xl">Select <span className="text-primary">Likes Pack</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">Get permanent Free Fire player likes instantly.</p>
        <p className="mt-1 text-xs text-muted-foreground">Starting from ৳{minPrice}</p>
      </section>

      <div className="grid sm:grid-cols-2 gap-4">
        {pkgs.map((p) => (
          <Card key={p.id} className="bg-card border-border p-5 shadow-card flex flex-col gap-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{p.likes_per_day} LIKES {p.is_free && <span className="ml-1 text-success">• FREE</span>}</div>
            <div className="font-display font-extrabold text-3xl">{p.is_free ? "FREE" : `৳${Number(p.price_bdt).toFixed(2)}`}</div>
            <div className="text-sm flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary grid place-items-center"><BadgeCheck className="w-3 h-3"/></span>{p.is_free ? "Daily manual claim" : "Instant Delivery"}</div>
            <div className="text-sm flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 text-primary grid place-items-center"><BadgeCheck className="w-3 h-3"/></span>{p.duration_days} day{p.duration_days>1?'s':''} duration</div>
            {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
            <Button onClick={() => { setSelected(p); setUid(""); }} className="mt-auto w-full bg-foreground text-background hover:bg-foreground/90 font-bold rounded-xl h-11">{p.is_free ? "Get Free" : "Select Pack"}</Button>
          </Card>
        ))}
        {pkgs.length === 0 && <Card className="sm:col-span-2 bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No packages added</Card>}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Heart className="w-4 h-4 text-primary"/>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.likes_per_day} likes/day × {selected?.duration_days} days = {selected?.is_free ? "FREE" : `৳${Number(selected?.price_bdt)}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selected?.is_free ? (
              <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
                <div className="font-bold text-success mb-1">Free Package</div>
                <div className="text-muted-foreground text-xs">Kono taka lagbe na. Protidin ekbar "Claim Today's Likes" button e click kore likes nite hobe — auto delivery hobe na.</div>
              </div>
            ) : (
            <div className="rounded-xl bg-gradient-primary text-primary-foreground p-4 flex items-center justify-between">
              <div>
                <div className="text-xs opacity-80 uppercase tracking-wider">Wallet Balance</div>
                <div className="font-display font-extrabold text-2xl">৳{balance.toFixed(2)}</div>
              </div>
              <Link to="/dashboard/deposit"><Button size="sm" className="bg-white text-primary hover:bg-white/90 font-bold">+ Add</Button></Link>
            </div>
            )}
            <div>
              <Label>Free Fire UID</Label>
              <Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Enter your FF UID" inputMode="numeric"/>
            </div>
            {bannerUrl && /^\d{6,}$/.test(uid) && (
              <img src={bannerUrl} alt="FF banner" className="w-full rounded-lg border border-border" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}/>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-secondary p-3"><Zap className="w-4 h-4 text-primary mb-1"/><div className="text-muted-foreground">Likes/day</div><div className="font-bold">{selected?.likes_per_day}</div></div>
              <div className="rounded-xl bg-secondary p-3"><Calendar className="w-4 h-4 text-primary mb-1"/><div className="text-muted-foreground">Duration</div><div className="font-bold">{selected?.duration_days} days</div></div>
            </div>
            <Button onClick={buy} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground font-bold h-12">
              {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <><ThumbsUp className="w-4 h-4 mr-2"/>{selected?.is_free ? "Activate Free Package" : `Buy for ৳${Number(selected?.price_bdt)}`}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
