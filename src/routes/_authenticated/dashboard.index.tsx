import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Clock, Heart, ShieldCheck, ShoppingCart, ThumbsUp, Zap } from "lucide-react";
import { SupportButton } from "@/components/SupportButton";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price_bdt: number;
  likes_per_day: number | null;
  duration_days: number | null;
  type: "like" | "visit" | "levelup";
};

function Dashboard() {
  const { user } = useAuth();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);

  useEffect(() => {
    supabase
      .from("packages")
      .select("id,name,description,price_bdt,likes_per_day,duration_days,type")
      .eq("is_active", true)
      .eq("type", "like")
      .order("sort_order")
      .then(({ data }) => setPkgs((data ?? []) as Pkg[]));
  }, []);

  const minPrice = useMemo(() => {
    const prices = pkgs.map((p) => Number(p.price_bdt)).filter(Boolean);
    return prices.length ? Math.min(...prices) : 5;
  }, [pkgs]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-8">
      <section className="ff-grid-surface rounded-3xl border border-border px-5 py-10 text-center overflow-hidden shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
          <span className="w-2 h-2 rounded-full bg-primary" /> Welcome {user?.email?.split("@")[0] ?? "player"}
        </div>
        <h1 className="mt-6 font-display text-3xl sm:text-5xl font-extrabold leading-tight">
          Boost your FF Profile <span className="text-primary">Likes</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg leading-7 text-muted-foreground">
          Safe Free Fire like service for BD server. Package choose korun, UID submit korun, delivery start hobe admin approve korar pore.
        </p>
        <Link to="/dashboard/packages">
          <Button size="lg" className="mt-7 w-full sm:w-auto sm:min-w-72 h-13 rounded-2xl bg-gradient-primary text-primary-foreground font-extrabold">
            <ShoppingCart className="w-5 h-5 mr-2" /> Buy Likes Now
          </Button>
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center">
        <Stat value="50K+" label="Orders" />
        <Stat value="100%" label="Safe" />
        <Stat value={`৳${minPrice}`} label="Start" />
      </section>

      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2 font-display font-bold text-sm tracking-widest"><Heart className="w-4 h-4 text-primary" /> LIKE PACKAGES</div>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pkgs.map((pkg) => <LikePackageCard key={pkg.id} pkg={pkg} />)}
          {pkgs.length === 0 && <Card className="sm:col-span-2 lg:col-span-3 bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No like packages added yet.</Card>}
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <Feature icon={ShieldCheck} title="No Login Needed" text="Only Free Fire UID diye order hobe." />
        <Feature icon={Zap} title="Fast Process" text="Payment verify hole service start." />
        <Feature icon={Clock} title="Daily Delivery" text="Duration porjonto like delivery cholbe." />
      </section>

      <SupportButton />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card className="bg-gradient-card border-border p-4 shadow-card">
      <div className="font-display font-extrabold text-2xl text-primary">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function LikePackageCard({ pkg }: { pkg: Pkg }) {
  return (
    <Card className="bg-gradient-card border-border p-5 shadow-card flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center shrink-0"><ThumbsUp className="w-6 h-6 text-primary" /></div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-extrabold text-base leading-tight">{pkg.name}</div>
          <div className="text-[10px] text-success flex items-center gap-1 mt-1"><BadgeCheck className="w-3 h-3" /> Verified package</div>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground min-h-12">{pkg.description || "Free Fire profile e safe likes delivery. BD server like package."}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-secondary p-3"><div className="text-muted-foreground">Likes/day</div><div className="font-bold">{pkg.likes_per_day || "Auto"}</div></div>
        <div className="rounded-xl bg-secondary p-3"><div className="text-muted-foreground">Duration</div><div className="font-bold">{pkg.duration_days ? `${pkg.duration_days} days` : "Package"}</div></div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="font-display text-2xl font-extrabold text-primary">৳{Number(pkg.price_bdt)}</div>
        <Link to="/dashboard/packages"><Button className="rounded-xl bg-gradient-primary text-primary-foreground font-bold"><ShoppingCart className="w-4 h-4 mr-1.5" /> Buy</Button></Link>
      </div>
    </Card>
  );
}

function Feature({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card className="border-border bg-gradient-card p-5 text-center shadow-card">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center mb-3"><Icon className="w-6 h-6 text-primary" /></div>
      <div className="font-display font-bold text-sm">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{text}</div>
    </Card>
  );
}
