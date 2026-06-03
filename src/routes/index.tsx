import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLandingData } from "@/lib/landing.functions";
import { BadgeCheck, Clock, Heart, Menu, ShieldCheck, ShoppingCart, Star, ThumbsUp, User as UserIcon, Zap } from "lucide-react";
import gsLogo from "@/assets/gs-shop-logo.png";
import { LandingNoticePopup } from "@/components/LandingNoticePopup";
import { SupportButton } from "@/components/SupportButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FF Likes BD — Free Fire Like Service" },
      { name: "description", content: "Buy Free Fire profile likes for Bangladesh server with safe, fast delivery and simple bKash payment." },
      { property: "og:title", content: "FF Likes BD" },
      { property: "og:description", content: "Free Fire profile like service for BD players." },
    ],
  }),
  component: Landing,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  price_bdt: number;
  likes_per_day?: number | null;
  duration_days?: number | null;
  type: string;
};

type Notice = { enabled: boolean; imageUrl: string; telegramUrl: string; text: string };

function Landing() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: isAdmin ? "/admin" : "/dashboard" });
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    getLandingData().then((data) => {
      setPkgs(((data as any).packages ?? []).filter((p: Pkg) => p.type === "like"));
      setLogoUrl(((data as any).logoUrl ?? null) as string | null);
      if ((data as any).notice) setNotice((data as any).notice);
    });
  }, []);

  const minPrice = useMemo(() => {
    const prices = pkgs.map((p) => Number(p.price_bdt)).filter(Boolean);
    return prices.length ? Math.min(...prices) : 5;
  }, [pkgs]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNoticePopup notice={notice} />
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src={logoUrl || gsLogo} alt="FF Likes BD logo" className="w-10 h-10 rounded-lg object-cover ring-1 ring-border" />
            <div className="font-display font-extrabold text-lg sm:text-xl leading-none">
              FF LIKES <span className="text-primary">BD</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button size="icon" className="rounded-xl bg-gradient-primary text-primary-foreground" aria-label="Login">
                <UserIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="icon" variant="ghost" className="rounded-xl" aria-label="Menu">
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="ff-grid-surface px-4 pt-20 pb-14 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs sm:text-sm font-bold text-primary shadow-card">
              <span className="w-2 h-2 rounded-full bg-primary" /> #1 Trusted FF Likes Provider in BD
            </div>
            <h1 className="mt-8 font-display text-4xl sm:text-6xl font-extrabold leading-tight text-foreground">
              Show Off your FF Profile <span className="text-primary">Like a Pro.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl leading-8 text-muted-foreground">
              Get instant player likes for your Free Fire profile. 100% safe, permanent, and fast delivery starting at just <b className="text-primary">৳{minPrice}</b>.
            </p>
            <div className="mt-8">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto sm:min-w-80 h-14 rounded-2xl bg-gradient-primary text-primary-foreground text-base font-extrabold">
                  <ShoppingCart className="w-5 h-5 mr-2" /> Buy Likes Now
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-10 border-y border-border bg-card/55">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3 text-center">
            <Stat value="50K+" label="Orders" />
            <Stat value="100%" label="Safe" />
            <Stat value="24H" label="Delivery" />
          </div>
        </section>

        <section className="px-4 py-12 max-w-5xl mx-auto">
          <div className="text-center mb-7">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl">LIKE PACKAGES</h2>
            <p className="mt-2 text-sm text-muted-foreground">Package select korun, UID din, payment submit korun.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pkgs.map((pkg) => <LikePackageCard key={pkg.id} pkg={pkg} />)}
            {pkgs.length === 0 && (
              <Card className="sm:col-span-2 lg:col-span-3 border-border bg-gradient-card p-6 text-center text-sm text-muted-foreground">
                Like package ekhono add kora hoyni.
              </Card>
            )}
          </div>
        </section>

        <section className="px-4 pb-14 max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-4">
            <Feature icon={ShieldCheck} title="Safe Service" text="UID chara kono login details lage na." />
            <Feature icon={Zap} title="Fast Start" text="Payment verify hole order quick start hoy." />
            <Feature icon={Clock} title="Daily Likes" text="Package duration onujayi likes delivery cholbe." />
          </div>
        </section>
      </main>

      <footer className="px-4 py-7 text-center text-xs text-muted-foreground border-t border-border bg-card/60">
        © {new Date().getFullYear()} FF LIKES BD. Free Fire like service only.
      </footer>
      <SupportButton />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl sm:text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
}

function LikePackageCard({ pkg }: { pkg: Pkg }) {
  return (
    <Card className="border-border bg-gradient-card p-5 shadow-card flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center shrink-0">
          <ThumbsUp className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-extrabold text-base leading-tight">{pkg.name}</div>
          <div className="mt-1 text-xs text-success flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Verified like package</div>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground min-h-12">
        {pkg.description || "Free Fire profile e daily likes delivery. BD server er jonno safe auto like package."}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-secondary p-3">
          <div className="text-muted-foreground">Likes/day</div>
          <div className="font-bold text-foreground">{pkg.likes_per_day || "Auto"}</div>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <div className="text-muted-foreground">Duration</div>
          <div className="font-bold text-foreground">{pkg.duration_days ? `${pkg.duration_days} days` : "Package"}</div>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Price</div>
          <div className="font-display text-2xl font-extrabold text-primary">৳{Number(pkg.price_bdt)}</div>
        </div>
        <Link to="/auth">
          <Button className="rounded-xl bg-gradient-primary text-primary-foreground font-bold">
            <Heart className="w-4 h-4 mr-1.5" /> Buy
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function Feature({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card className="border-border bg-gradient-card p-5 text-center shadow-card">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center mb-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div className="font-display font-bold text-sm">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{text}</div>
    </Card>
  );
}
