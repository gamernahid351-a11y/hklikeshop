import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, BadgeCheck, Calendar, Check, Copy, Heart, Image as ImageIcon, Loader2, Receipt, ShieldCheck, Smartphone, ThumbsUp, Upload, Zap } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_BANNER_API = "https://public-url-host--mehedixffx.replit.app/banner/profile?uid={uid}";

export const Route = createFileRoute("/_authenticated/dashboard/packages")({
  component: PackagesPage,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  likes_per_day: number;
  duration_days: number;
  price_bdt: number;
  type: string;
  sort_order: number;
};

type Settings = {
  banner_api_url: string;
  bkash_number: string;
  payment_instructions: string;
};

function PackagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [uid, setUid] = useState("");
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [trxId, setTrxId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("packages").select("id,name,description,likes_per_day,duration_days,price_bdt,type,sort_order").eq("is_active", true).eq("type", "like").order("sort_order"),
        supabase.from("app_settings").select("banner_api_url,bkash_number,payment_instructions").eq("id", 1).single(),
      ]);
      setPkgs((p ?? []) as Pkg[]);
      setSettings(s as Settings | null);
    })();
  }, []);

  const minPrice = useMemo(() => {
    const prices = pkgs.map((p) => Number(p.price_bdt)).filter(Boolean);
    return prices.length ? Math.min(...prices) : 5;
  }, [pkgs]);

  function open(p: Pkg) {
    setSelected(p);
    setUid("");
    setTrxId("");
    setFile(null);
    setBannerLoaded(false);
    setBannerError(false);
  }

  const bannerTpl = settings?.banner_api_url?.trim() || DEFAULT_BANNER_API;
  const bannerUrl = uid ? bannerTpl.replace("{uid}", encodeURIComponent(uid.trim())) : "";

  async function submit() {
    if (!user || !selected) return;
    if (!/^\d{6,}$/.test(uid)) return toast.error("Valid Free Fire UID din");
    if (!trxId.trim()) return toast.error("TrxID din");
    if (!file) return toast.error("Payment screenshot upload korun");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("orders").insert({
        user_id: user.id,
        package_id: selected.id,
        ff_uid: uid.trim(),
        trx_id: trxId.trim(),
        payment_screenshot_url: path,
        likes_per_day: selected.likes_per_day,
        duration_days: selected.duration_days,
        type: "like",
        visits_target: 0,
      });
      if (insErr) throw insErr;
      toast.success("Order submit hoyeche! Admin verify korar pore start hobe.");
      setSelected(null);
      navigate({ to: "/dashboard/orders" });
    } catch (e: any) {
      toast.error(e.message || "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <section className="ff-grid-surface rounded-3xl border border-border p-6 text-center shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
          <Heart className="w-3.5 h-3.5" /> FF Likes only
        </div>
        <h1 className="mt-4 font-display font-extrabold text-3xl">Like Packages</h1>
        <p className="mt-2 text-sm text-muted-foreground">BD server safe likes — starting at ৳{minPrice}</p>
      </section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pkgs.map((p) => (
          <Card key={p.id} className="bg-gradient-card border-border p-5 shadow-card flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
                <ThumbsUp className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-extrabold text-base leading-tight">{p.name}</div>
                <div className="text-[10px] text-success flex items-center gap-1 mt-1"><BadgeCheck className="w-3 h-3" /> Verified</div>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground min-h-12">{p.description || "Free Fire profile e daily safe likes delivery. UID diye order korun."}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-secondary p-3"><Zap className="w-4 h-4 text-primary mb-1" /><div className="text-muted-foreground">Likes/day</div><div className="font-bold">{p.likes_per_day}</div></div>
              <div className="rounded-xl bg-secondary p-3"><Calendar className="w-4 h-4 text-primary mb-1" /><div className="text-muted-foreground">Duration</div><div className="font-bold">{p.duration_days} days</div></div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3">
              <div className="font-display text-2xl font-extrabold text-primary">৳{Number(p.price_bdt)}</div>
              <Button onClick={() => open(p)} className="rounded-xl bg-gradient-primary text-primary-foreground font-bold">Buy now</Button>
            </div>
          </Card>
        ))}
        {pkgs.length === 0 && <Card className="sm:col-span-2 lg:col-span-3 bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No like packages added yet.</Card>}
      </div>

      <Card className="bg-gradient-card border-border p-4 flex items-start gap-3 text-sm text-muted-foreground">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>Order korte Free Fire UID chara kono password lage na. Payment verify hole admin order start korbe.</div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Heart className="w-4 h-4 text-primary" /> {selected?.name}</DialogTitle>
            <DialogDescription>{selected?.likes_per_day} likes/day × {selected?.duration_days} days = ৳{Number(selected?.price_bdt)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Free Fire UID</Label>
              <Input value={uid} onChange={(e) => { setUid(e.target.value); setBannerLoaded(false); setBannerError(false); }} placeholder="Enter your FF UID" inputMode="numeric" />
            </div>

            {uid && /^\d{6,}$/.test(uid) && bannerUrl && (
              <div className="relative overflow-hidden rounded-lg border border-border bg-background">
                {!bannerLoaded && !bannerError && (
                  <div className="h-24 grid place-items-center text-xs text-muted-foreground"><div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading banner…</div></div>
                )}
                {bannerError && <div className="h-24 grid place-items-center px-4 text-center text-xs text-warning">Banner load hoyni. UID check korun.</div>}
                <img key={bannerUrl} src={bannerUrl} alt="Free Fire profile banner" onLoad={() => setBannerLoaded(true)} onError={() => { setBannerLoaded(true); setBannerError(true); }} className={`block w-full h-auto ${bannerLoaded && !bannerError ? "" : "hidden"}`} />
              </div>
            )}

            {settings?.bkash_number && (
              <div className="rounded-xl p-4 space-y-3 border border-warning/40 bg-gradient-payment shadow-payment">
                <div className="flex items-center gap-2 text-warning-foreground">
                  <div className="w-8 h-8 rounded-lg bg-background/20 grid place-items-center"><Smartphone className="w-4 h-4" /></div>
                  <div className="text-sm font-bold">bKash Payment</div>
                  <Badge className="ml-auto bg-background/85 text-foreground border-0 font-bold hover:bg-background/85">৳{Number(selected?.price_bdt)}</Badge>
                </div>
                <div className="rounded-lg bg-background/20 border border-background/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-warning-foreground/80 mb-1">Send Money to</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-xl text-warning-foreground break-all">{settings.bkash_number}</div>
                    <Button size="sm" className="bg-background text-foreground hover:bg-background/90 font-bold" onClick={() => { navigator.clipboard.writeText(settings.bkash_number); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                      {copied ? <><Check className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
                    </Button>
                  </div>
                </div>
                <ol className="space-y-2 text-xs text-warning-foreground">
                  <li className="flex gap-2 items-start"><span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">1</span><span>bKash app → <b>Send Money</b></span></li>
                  <li className="flex gap-2 items-start"><span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">2</span><span>৳{Number(selected?.price_bdt)} send korun</span></li>
                  <li className="flex gap-2 items-start"><span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">3</span><span>TrxID + screenshot upload korun</span></li>
                </ol>
                {settings.payment_instructions && <details className="text-xs text-warning-foreground/95"><summary className="cursor-pointer flex items-center gap-1"><AlertCircle className="w-3 h-3" /> More details</summary><pre className="whitespace-pre-wrap mt-2 font-sans bg-background/20 p-2 rounded border border-background/25">{settings.payment_instructions.replace("{bkash}", settings.bkash_number)}</pre></details>}
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> bKash Transaction ID</Label>
              <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 8N7A2B5C9X" className="font-mono" />
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Payment screenshot</Label>
              <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-5 cursor-pointer transition ${file ? "border-success/50 bg-success/5" : "border-border hover:border-primary/50 hover:bg-secondary/50"}`}>
                {file ? <Check className="w-5 h-5 text-success" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                <span className="text-sm font-medium">{file ? file.name : "Tap to upload screenshot"}</span>
                <span className="text-[10px] text-muted-foreground">JPG / PNG • Max 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <Button disabled={busy} onClick={submit} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Submit Order • ৳${Number(selected?.price_bdt)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
