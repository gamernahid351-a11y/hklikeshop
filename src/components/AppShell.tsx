import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package as Pkg, ShoppingCart, Settings, LogOut, ShieldCheck, Inbox, Wallet } from "lucide-react";
import hkLogo from "@/assets/hk-logo.jpg.asset.json";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function AppShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { signOut, user } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();

  const userNav = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/dashboard/packages", label: "Packages", icon: Pkg },
    { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
    { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  ];
  const adminNav = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/deposits", label: "Deposits", icon: Wallet },
    { to: "/admin/orders", label: "Orders", icon: Inbox },
    { to: "/admin/packages", label: "Pkgs", icon: Pkg },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];
  const nav = admin ? adminNav : userNav;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={admin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <img src={hkLogo.url} alt="MEHEDI LIKE" className="w-8 h-8 rounded-lg object-cover ring-1 ring-primary/40" />
            <div>
              <div className="font-display font-bold text-sm leading-none">MEHEDI <span className="text-primary">LIKE</span></div>
              {admin && <div className="text-[10px] text-accent leading-none mt-0.5 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>ADMIN</div>}
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[160px]">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border bg-card/95 backdrop-blur">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/admin" && n.to !== "/dashboard" && loc.pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to} className={`flex flex-col items-center justify-center py-2.5 text-[10px] gap-0.5 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <n.icon className="w-5 h-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto flex">
        <aside className="hidden lg:block w-56 shrink-0 py-6 pr-4 border-r border-border min-h-[calc(100vh-3.5rem)]">
          <nav className="space-y-1">
            {nav.map((n) => {
              const active = loc.pathname === n.to || (n.to !== "/admin" && n.to !== "/dashboard" && loc.pathname.startsWith(n.to));
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                  <n.icon className="w-4 h-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 px-4 py-5 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
