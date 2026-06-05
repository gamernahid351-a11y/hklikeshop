import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/deposit-result")({
  validateSearch: (s: Record<string, unknown>) => ({
    dep: typeof s.dep === "string" ? s.dep : undefined,
    cancel: s.cancel === "1" || s.cancel === 1,
  }),
  component: DepositResult,
});

function DepositResult() {
  const { dep, cancel } = useSearch({ from: Route.id });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "approved" | "pending" | "rejected">("checking");
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    if (!dep) { setStatus("rejected"); return; }
    let tries = 0;
    let timer: any;
    const poll = async () => {
      const { data } = await supabase.from("deposit_orders").select("status,amount").eq("id", dep).maybeSingle();
      if (data) {
        setAmount(Number(data.amount));
        if (data.status === "approved") { setStatus("approved"); return; }
        if (data.status === "rejected") { setStatus("rejected"); return; }
      }
      tries++;
      if (tries < 10 && !cancel) timer = setTimeout(poll, 1500);
      else setStatus(cancel ? "rejected" : "pending");
    };
    poll();
    return () => timer && clearTimeout(timer);
  }, [dep, cancel]);

  return (
    <div className="max-w-md mx-auto py-10">
      <Card className="bg-card border-border p-8 text-center space-y-4 shadow-card">
        {status === "checking" && (
          <>
            <Loader2 className="w-14 h-14 text-primary mx-auto animate-spin"/>
            <h1 className="font-display font-bold text-xl">Verifying payment…</h1>
            <p className="text-sm text-muted-foreground">Hold on, we are confirming your transaction.</p>
          </>
        )}
        {status === "approved" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-success mx-auto"/>
            <h1 className="font-display font-extrabold text-2xl">Payment Successful</h1>
            <p className="text-sm text-muted-foreground">৳{amount.toFixed(2)} added to your wallet.</p>
            <Button onClick={() => navigate({ to: "/dashboard/wallet" })} className="bg-gradient-primary text-primary-foreground font-bold w-full"><Wallet className="w-4 h-4 mr-2"/>Open Wallet</Button>
          </>
        )}
        {status === "pending" && (
          <>
            <Loader2 className="w-14 h-14 text-warning mx-auto animate-spin"/>
            <h1 className="font-display font-bold text-xl">Payment is processing</h1>
            <p className="text-sm text-muted-foreground">Confirmation may take a minute. Your wallet will be credited automatically.</p>
            <Link to="/dashboard/wallet"><Button variant="outline" className="w-full">Go to wallet</Button></Link>
          </>
        )}
        {status === "rejected" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto"/>
            <h1 className="font-display font-bold text-xl">Payment {cancel ? "cancelled" : "failed"}</h1>
            <p className="text-sm text-muted-foreground">No amount was deducted. You can try again.</p>
            <Link to="/dashboard/deposit"><Button className="bg-gradient-primary text-primary-foreground font-bold w-full">Try again</Button></Link>
          </>
        )}
      </Card>
    </div>
  );
}
