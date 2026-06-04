import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Plus, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  component: WalletPage,
});

type Txn = {
  id: string;
  amount: number;
  kind: "deposit" | "purchase" | "refund" | "adjust";
  description: string | null;
  balance_after: number;
  created_at: string;
};

type Deposit = {
  id: string;
  amount: number;
  method: string;
  status: "pending" | "approved" | "rejected";
  trx_id: string;
  rejection_reason: string | null;
  created_at: string;
};

function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: t }, { data: d }] = await Promise.all([
        supabase.from("profiles").select("wallet_balance").eq("user_id", user.id).single(),
        supabase.from("wallet_transactions").select("id,amount,kind,description,balance_after,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("deposit_orders").select("id,amount,method,status,trx_id,rejection_reason,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setBalance(Number((p as any)?.wallet_balance ?? 0));
      setTxns((t ?? []) as Txn[]);
      setDeposits((d ?? []) as Deposit[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <Card className="bg-gradient-primary text-primary-foreground p-6 shadow-card border-0">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90"><Wallet className="w-4 h-4"/> Current Balance</div>
        <div className="mt-2 font-display font-extrabold text-4xl">৳{balance.toFixed(2)}</div>
        <div className="text-xs opacity-80 mt-1">Ready to boost your profile</div>
        <Link to="/dashboard/deposit"><Button className="mt-4 bg-white text-primary hover:bg-white/90 font-bold"><Plus className="w-4 h-4 mr-1"/> Add Funds</Button></Link>
      </Card>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Deposit Requests</h2>
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto"/> :
        deposits.length === 0 ? <Card className="bg-gradient-card border-border p-5 text-center text-sm text-muted-foreground">No deposit requests yet</Card> :
        <div className="space-y-2">
          {deposits.map((d) => (
            <Card key={d.id} className="bg-gradient-card border-border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold">৳{Number(d.amount)} <span className="text-xs text-muted-foreground uppercase">via {d.method}</span></div>
                <div className="text-xs text-muted-foreground font-mono truncate">{d.trx_id}</div>
                {d.rejection_reason && <div className="text-xs text-destructive">Reason: {d.rejection_reason}</div>}
              </div>
              <Badge variant="outline" className={`capitalize ${d.status==='approved'?'text-success border-success/30':d.status==='rejected'?'text-destructive border-destructive/30':'text-warning border-warning/30'}`}>{d.status}</Badge>
            </Card>
          ))}
        </div>}
      </section>

      <section>
        <h2 className="font-display font-bold text-lg mb-3">Transaction History</h2>
        {txns.length === 0 ? <Card className="bg-gradient-card border-border p-5 text-center text-sm text-muted-foreground">No transactions yet</Card> :
        <div className="space-y-2">
          {txns.map((t) => {
            const credit = t.amount >= 0;
            return (
              <Card key={t.id} className="bg-gradient-card border-border p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${credit?'bg-success/15 text-success':'bg-destructive/15 text-destructive'}`}>
                  {credit ? <ArrowDownCircle className="w-5 h-5"/> : <ArrowUpCircle className="w-5 h-5"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.description || t.kind}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-bold ${credit?'text-success':'text-destructive'}`}>{credit?'+':''}৳{Number(t.amount).toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">Bal ৳{Number(t.balance_after).toFixed(2)}</div>
                </div>
              </Card>
            );
          })}
        </div>}
      </section>
    </div>
  );
}
