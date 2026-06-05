import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, ShieldCheck, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { createBohudurDeposit } from "@/lib/bohudur.functions";

export const Route = createFileRoute("/_authenticated/dashboard/deposit")({
  component: DepositPage,
});

function DepositPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createDep = useServerFn(createBohudurDeposit);
  const [balance, setBalance] = useState(0);
  const [minDep, setMinDep] = useState(10);
  const [amount, setAmount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: settings }, { data: prof }] = await Promise.all([
        supabase.from("app_settings").select("min_deposit").eq("id", 1).single(),
        user ? supabase.from("profiles").select("wallet_balance").eq("user_id", user.id).single() : Promise.resolve({ data: null } as any),
      ]);
      setMinDep(Number((settings as any)?.min_deposit ?? 10));
      setBalance(Number((prof as any)?.wallet_balance ?? 0));
    })();
  }, [user]);

  const quick = [50, 100, 200, 500, 1000, 2000];

  async function pay() {
    if (!amount || amount < minDep) return toast.error(`Min deposit ৳${minDep}`);
    setBusy(true);
    try {
      const res = await createDep({ data: { amount: Number(amount) } });
      if (!res?.paymentUrl) throw new Error("Could not create payment");
      window.location.href = res.paymentUrl;
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-md mx-auto">
      <button onClick={() => navigate({ to: "/dashboard/wallet" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4"/> Back</button>

      <Card className="bg-gradient-primary text-primary-foreground p-5 border-0 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-90 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5"/> Current Balance</div>
            <div className="font-display font-extrabold text-3xl mt-1">৳{balance.toFixed(2)}</div>
          </div>
          <Badge className="bg-white/20 border-0 text-white">BDT</Badge>
        </div>
      </Card>

      <Card className="bg-card border-border p-5 space-y-4 shadow-card">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 grid place-items-center"><Zap className="w-7 h-7 text-primary"/></div>
          <h1 className="mt-3 font-display font-extrabold text-2xl">Auto Add Funds</h1>
          <p className="text-sm text-muted-foreground">bKash, Nagad & cards via Bohudur — instant credit</p>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Enter Amount</Label>
          <Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0" className="text-2xl font-bold h-14 mt-2"/>
          <div className="text-xs text-muted-foreground mt-1">Minimum deposit: ৳{minDep}</div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {quick.map((q) => (
              <button key={q} onClick={() => setAmount(q)} className="rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2.5 text-sm transition">৳{q}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-secondary/60 border border-border p-3 text-xs text-muted-foreground flex gap-2">
          <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5"/>
          <span>Secure auto payment via <b className="text-foreground">Bohudur</b>. After successful payment, your balance updates automatically within seconds.</span>
        </div>

        <Button disabled={busy} onClick={pay} className="w-full bg-gradient-primary text-primary-foreground font-bold h-12">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : `Pay ৳${amount || 0} Now →`}
        </Button>
        <div className="text-center text-xs">
          <Link to="/dashboard/wallet" className="text-muted-foreground hover:text-primary">View transaction history</Link>
        </div>
      </Card>
    </div>
  );
}
