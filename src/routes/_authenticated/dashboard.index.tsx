import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Calendar, Heart, History, Plus, ShieldCheck, ShoppingCart, ThumbsUp, Wallet, Zap } from "lucide-react";
import { SupportButton } from "@/components/SupportButton";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

type Pkg = {
  id: string; name: string; description: string | null; price_bdt: number;
  likes_per_day: number | null; duration_days: number | null;
};

function Dashboard() {
  const { user } = useAuth();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: prof }] = await Promise.all([
        supabase.from("packages").select("id,name,description,price_bdt,likes_per_day,duration_days").eq("is_active", true).eq("type", "like").order("sort_order").limit(6),
        supabase.from("profiles").select("wallet_balance").eq("user_id", user.id).single(),
      ]);
      setPkgs((p ?? []) as Pkg[]);
      setBalance(Number((prof as any)?.wallet_balance ?? 0));
    })();
  }, [user]);

  const minPrice = useMemo(() => {
    const prices = pkgs.map((p) => Number(p.price_bdt)).filter(Boolean);
    return prices.length ? Math.min(...prices) : 5;
  }, [pkgs]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <Card className="bg-gradient-primary text-primary-foreground border-0 p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest opacity-90">Welcome back,</div>
            <div className="font-display font-bold text-lg truncate">{user?.email?.split("@")[0] ?? "player"}</div>
          </div>
          <Wallet className="w-7 h-7 opacity-80"/>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Wallet Balance</div>
            <div className="font-display font-extrabold text-3xl mt-1">৳{balance.toFixed(2)}</div>
          </div>
          <Link to="/dashboard/deposit">
            <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-bold"><Plus className="w-4 h-4 mr-1"/>Add Funds</Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/dashboard/packages"><Card className="bg-gradient-card border-border p-4 text-center hover:border-primary/40 transition shadow-card"><ShoppingCart className="w-5 h-5 text-primary mx-auto mb-1.5"/><div className="text-xs font-bold">New Order</div></Card></Link>
        <Link to="/dashboard/wallet"><Card className="bg-gradient-card border-border p-4 text-center hover:border-primary/40 transition shadow-card"><History className="w-5 h-5 text-primary mx-auto mb-1.5"/><div className="text-xs font-bold">History</div></Card></Link>
        <Link to="/dashboard/orders"><Card className="bg-gradient-card border-border p-4 text-center hover:border-primary/40 transition shadow-card"><Heart className="w-5 h-5 text-primary mx-auto mb-1.5"/><div className="text-xs font-bold">My Orders</div></Card></Link>
      </div>

      <section className="ff-grid-surface rounded-3xl border border-border p-6 text-center shadow-card">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"><Heart className="w-3.5 h-3.5"/> FF Likes Only</div>
        <h1 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold">Boost your FF Profile <span className="text-primary">Likes</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">Safe BD server likes — starting at ৳{minPrice}. Wallet theke instant purchase.</p>
        <Link to="/dashboard/packages"><Button size="lg" className="mt-4 w-full sm:w-auto sm:min-w-72 rounded-2xl bg-gradient-primary text-primary-foreground font-extrabold"><ShoppingCart className="w-5 h-5 mr-2"/>Browse Packages</Button></Link>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border"/>
          <div className="flex items-center gap-2 font-display font-bold text-sm tracking-widest"><Heart className="w-4 h-4 text-primary"/> POPULAR PACKS</div>
          <div className="flex-1 h-px bg-border"/>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pkgs.map((p) => (
            <Card key={p.id} className="bg-card border-border p-5 shadow-card flex flex-col gap-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{p.likes_per_day} LIKES</div>
              <div className="font-display font-extrabold text-2xl">৳{Number(p.price_bdt).toFixed(2)}</div>
              <div className="text-xs flex items-center gap-1.5 text-success"><BadgeCheck className="w-3 h-3"/>Instant Delivery</div>
              <div className="text-xs flex items-center gap-1.5 text-success"><BadgeCheck className="w-3 h-3"/>{p.duration_days} day duration</div>
              <Link to="/dashboard/packages" className="mt-auto"><Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold rounded-xl">Select Pack</Button></Link>
            </Card>
          ))}
          {pkgs.length === 0 && <Card className="sm:col-span-2 lg:col-span-3 bg-gradient-card border-border p-6 text-center text-sm text-muted-foreground">No packages yet</Card>}
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-card border-border p-4 text-center"><ShieldCheck className="w-6 h-6 text-primary mx-auto mb-2"/><div className="font-bold text-sm">100% Safe</div><div className="text-xs text-muted-foreground">UID chara kichu lage na</div></Card>
        <Card className="bg-gradient-card border-border p-4 text-center"><Zap className="w-6 h-6 text-primary mx-auto mb-2"/><div className="font-bold text-sm">Instant</div><div className="text-xs text-muted-foreground">Wallet theke shoja deduct</div></Card>
        <Card className="bg-gradient-card border-border p-4 text-center"><Calendar className="w-6 h-6 text-primary mx-auto mb-2"/><div className="font-bold text-sm">Daily Delivery</div><div className="text-xs text-muted-foreground">Duration porjonto cholbe</div></Card>
      </section>

      <SupportButton />
    </div>
  );
}
