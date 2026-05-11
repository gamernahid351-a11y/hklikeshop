import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Calendar, Loader2, Upload, Copy, Check, Smartphone, Receipt, Image as ImageIcon, AlertCircle, Heart, Eye, Crown } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_BANNER_API = "https://public-url-host--mehedixffx.replit.app/banner/profile?uid={uid}";

type SearchT = { type?: "like" | "visit" | "levelup" };

export const Route = createFileRoute("/_authenticated/dashboard/packages")({
  validateSearch: (s: Record<string, unknown>): SearchT => ({
    type: s.type === "visit" || s.type === "like" || s.type === "levelup" ? s.type : undefined,
  }),
  component: PackagesPage,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  likes_per_day: number;
  duration_days: number;
  visits_count: number;
  price_bdt: number;
  type: "like" | "visit" | "levelup";
  image_url: string | null;
  sort_order: number;
};
type Settings = {
  banner_api_url: string;
  like_api_url: string;
  visit_api_url: string;
  bkash_number: string;
  bkash_number_visit: string;
  payment_instructions: string;
};

function PackagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/dashboard/packages" });
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<"like" | "visit" | "levelup">(search.type ?? "like");
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
        supabase.from("packages").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("app_settings").select("*").eq("id", 1).single(),
      ]);
      setPkgs((p ?? []) as Pkg[]);
      setSettings(s as Settings | null);
    })();
  }, []);

  useEffect(() => { if (search.type) setTab(search.type); }, [search.type]);

  const filtered = useMemo(() => pkgs.filter((p) => p.type === tab), [pkgs, tab]);
  const isVisit = selected?.type === "visit";
  const isLevelUp = selected?.type === "levelup";
  const bkashNumber = isVisit
    ? settings?.bkash_number_visit || settings?.bkash_number
    : settings?.bkash_number;

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
    if (selected.type !== "levelup" && !/^\d{6,}$/.test(uid)) return toast.error("Valid Free Fire UID din");
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
        ff_uid: selected.type === "levelup" ? null : uid.trim(),
        trx_id: trxId.trim(),
        payment_screenshot_url: path,
        likes_per_day: selected.likes_per_day,
        duration_days: selected.duration_days,
        type: selected.type,
        visits_target: selected.type === "visit" ? selected.visits_count : 0,
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
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Packages</h1>
        <p className="text-sm text-muted-foreground">BD server only</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "like" | "visit" | "levelup")}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="like" className="gap-1.5"><Heart className="w-4 h-4" /> Likes</TabsTrigger>
          <TabsTrigger value="visit" className="gap-1.5"><Eye className="w-4 h-4" /> Visits</TabsTrigger>
          <TabsTrigger value="levelup" className="gap-1.5"><Crown className="w-4 h-4" /> LEVEL UP BOT</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <Card key={p.id} className="bg-gradient-card border-border overflow-hidden shadow-card flex flex-col">
            {p.image_url && (
              <div className="aspect-video bg-secondary/30 overflow-hidden">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-display font-bold text-lg">{p.name}</div>
                  {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                </div>
                <Badge className="bg-primary/15 text-primary border-0">৳{Number(p.price_bdt)}</Badge>
              </div>
              <div className="flex flex-wrap gap-3 my-3 text-sm">
                {p.type === "like" && (
                  <>
                    <div className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary"/>{p.likes_per_day}/day</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-accent"/>{p.duration_days} days</div>
                  </>
                )}
                {p.type === "visit" && (
                  <div className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-accent"/>{p.visits_count.toLocaleString()} visits</div>
                )}
                {p.type === "levelup" && (
                  <>
                    <div className="flex items-center gap-1.5"><Crown className="w-4 h-4 text-primary"/>Username + Password</div>
                    {p.duration_days > 0 && <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-accent"/>{p.duration_days} days</div>}
                  </>
                )}
              </div>
              <Button onClick={() => open(p)} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold mt-auto">Buy now</Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No packages in this category yet.</Card>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {isLevelUp ? <Crown className="w-4 h-4 text-primary" /> : isVisit ? <Eye className="w-4 h-4 text-accent" /> : <Heart className="w-4 h-4 text-primary" />}
              {selected?.name}
            </DialogTitle>
            <DialogDescription>
              {selected?.type === "like"
                ? `${selected?.likes_per_day} likes/day × ${selected?.duration_days} days = ৳${Number(selected?.price_bdt)}`
                : selected?.type === "visit"
                  ? `${selected?.visits_count.toLocaleString()} visits = ৳${Number(selected?.price_bdt)}`
                  : `Username + Password delivery${selected?.duration_days ? ` (${selected.duration_days} days)` : ""} = ৳${Number(selected?.price_bdt)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isLevelUp && (
              <>
                <div>
                  <Label>Free Fire UID</Label>
                  <Input value={uid} onChange={(e) => { setUid(e.target.value); setBannerLoaded(false); setBannerError(false); }} placeholder="Enter your FF UID" inputMode="numeric" />
                </div>

                {uid && /^\d{6,}$/.test(uid) && bannerUrl && (
                  <div className="relative overflow-hidden rounded-lg border border-border bg-background">
                    {!bannerLoaded && !bannerError && (
                      <div className="h-24 grid place-items-center text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading banner…</div>
                      </div>
                    )}
                    {bannerError && (
                      <div className="h-24 grid place-items-center px-4 text-center text-xs text-warning">
                        Banner load hoyni. UID check korun, tarpor abar try korun.
                      </div>
                    )}
                    <img
                      key={bannerUrl}
                      src={bannerUrl}
                      alt="Free Fire profile banner"
                      onLoad={() => setBannerLoaded(true)}
                      onError={() => { setBannerLoaded(true); setBannerError(true); }}
                      className={`block w-full h-auto ${bannerLoaded && !bannerError ? "" : "hidden"}`}
                    />
                  </div>
                )}
              </>
            )}

            {isLevelUp && (
              <div className="rounded-md bg-primary/10 border border-primary/30 p-3 text-xs text-primary">
                Payment confirm hole admin apnar <b>username & password</b> deliver korbe — "My Orders" page e dekhte parben.
              </div>
            )}

            {settings && bkashNumber && (
              <div className="rounded-xl p-4 space-y-3 border border-warning/40 bg-gradient-payment shadow-payment">
                <div className="flex items-center gap-2 text-warning-foreground">
                  <div className="w-8 h-8 rounded-lg bg-background/20 grid place-items-center backdrop-blur">
                    <Smartphone className="w-4 h-4 text-warning-foreground" />
                  </div>
                  <div className="text-sm font-bold">bKash Payment</div>
                  <Badge className="ml-auto bg-background/85 text-foreground border-0 font-bold hover:bg-background/85">৳{Number(selected?.price_bdt)}</Badge>
                </div>

                <div className="rounded-lg bg-background/20 backdrop-blur border border-background/30 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-warning-foreground/80 mb-1">Send Money to</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono font-bold text-xl sm:text-2xl text-warning-foreground tracking-wider drop-shadow break-all">{bkashNumber}</div>
                    <Button
                      size="sm"
                      className={copied ? "bg-background text-foreground hover:bg-background" : "bg-background text-foreground hover:bg-background/90 font-bold"}
                      onClick={() => {
                        navigator.clipboard.writeText(bkashNumber);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <><Check className="w-3.5 h-3.5 mr-1"/>Copied</> : <><Copy className="w-3.5 h-3.5 mr-1"/>Copy</>}
                    </Button>
                  </div>
                </div>

                <ol className="space-y-2 text-xs text-warning-foreground">
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">1</span>
                    <span>bKash app khulun → <b>Send Money</b> select korun</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">2</span>
                    <span>Upore deya number e <b>৳{Number(selected?.price_bdt)}</b> send korun</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">3</span>
                    <span>Confirmation SMS theke <b>TrxID</b> niche bosan + <b>screenshot</b> upload korun</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-400 text-white grid place-items-center font-bold text-[10px]">✓</span>
                    <span>Submit korar pore admin verify korbe (usually 5-30 min)</span>
                  </li>
                </ol>

                {settings.payment_instructions && (
                  <details className="text-xs text-warning-foreground/95">
                    <summary className="cursor-pointer flex items-center gap-1 opacity-90">
                      <AlertCircle className="w-3 h-3" /> More details
                    </summary>
                    <pre className="whitespace-pre-wrap mt-2 font-sans bg-background/20 p-2 rounded border border-background/25">{settings.payment_instructions.replace("{bkash}", bkashNumber)}</pre>
                  </details>
                )}
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5"/> bKash Transaction ID</Label>
              <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 8N7A2B5C9X" className="font-mono" />
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5"/> Payment screenshot</Label>
              <label className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-5 cursor-pointer transition ${file ? "border-success/50 bg-success/5" : "border-border hover:border-primary/50 hover:bg-secondary/50"}`}>
                {file ? <Check className="w-5 h-5 text-success"/> : <Upload className="w-5 h-5 text-muted-foreground"/>}
                <span className="text-sm font-medium">{file ? file.name : "Tap to upload screenshot"}</span>
                <span className="text-[10px] text-muted-foreground">JPG / PNG • Max 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <Button disabled={busy} onClick={submit} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : `Submit Order • ৳${Number(selected?.price_bdt)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
