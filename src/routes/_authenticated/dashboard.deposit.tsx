import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Copy, Image as ImageIcon, Loader2, Receipt, Smartphone, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/deposit")({
  component: DepositPage,
});

type S = { bkash_number: string; nagad_number: string; min_deposit: number };

function DepositPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState<S | null>(null);
  const [balance, setBalance] = useState(0);
  const [method, setMethod] = useState<"bkash" | "nagad">("bkash");
  const [amount, setAmount] = useState<number>(0);
  const [trxId, setTrxId] = useState("");
  const [sender, setSender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: settings }, { data: prof }] = await Promise.all([
        supabase.from("app_settings").select("bkash_number,nagad_number,min_deposit").eq("id", 1).single(),
        user ? supabase.from("profiles").select("wallet_balance").eq("user_id", user.id).single() : Promise.resolve({ data: null } as any),
      ]);
      setS((settings as any) ?? { bkash_number: "", nagad_number: "", min_deposit: 10 });
      setBalance(Number((prof as any)?.wallet_balance ?? 0));
    })();
  }, [user]);

  const target = method === "bkash" ? s?.bkash_number : s?.nagad_number;
  const minDep = Number(s?.min_deposit ?? 10);
  const quick = [50, 100, 200, 500, 1000, 2000];

  async function submit() {
    if (!user) return;
    if (!amount || amount < minDep) return toast.error(`Min deposit ৳${minDep}`);
    if (!trxId.trim()) return toast.error("TrxID din");
    if (!file) return toast.error("Screenshot upload korun");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("deposit_orders").insert({
        user_id: user.id, amount: Number(amount), method, trx_id: trxId.trim(),
        sender_number: sender.trim() || null, payment_screenshot_url: path,
      });
      if (error) throw error;
      toast.success("Deposit request submit hoyeche! Admin verify er pore balance jog hobe.");
      navigate({ to: "/dashboard/wallet" });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
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
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 grid place-items-center"><Wallet className="w-7 h-7 text-primary"/></div>
          <h1 className="mt-3 font-display font-extrabold text-2xl">Add Funds</h1>
          <p className="text-sm text-muted-foreground">Instant secure payment gateway</p>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select Payment Method</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(["bkash","nagad"] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`rounded-xl border-2 p-3 text-center transition ${method===m?'border-primary bg-primary/10':'border-border bg-secondary/30'}`}>
                <Smartphone className={`w-5 h-5 mx-auto mb-1 ${method===m?'text-primary':'text-muted-foreground'}`}/>
                <div className="text-sm font-bold uppercase">{m}</div>
              </button>
            ))}
          </div>
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

        {target && (
          <div className="rounded-xl bg-gradient-payment p-4 space-y-3 border border-warning/40">
            <div className="text-xs text-warning-foreground/80 uppercase tracking-widest">Send Money to ({method.toUpperCase()})</div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono font-bold text-2xl text-warning-foreground">{target}</div>
              <Button size="sm" className="bg-background text-foreground hover:bg-background/90 font-bold" onClick={() => { navigator.clipboard.writeText(target); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <><Check className="w-3.5 h-3.5 mr-1"/>Copied</> : <><Copy className="w-3.5 h-3.5 mr-1"/>Copy</>}
              </Button>
            </div>
          </div>
        )}

        <div>
          <Label className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5"/> Transaction ID</Label>
          <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 8N7A2B5C9X" className="font-mono"/>
        </div>
        <div>
          <Label>Sender Number <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX"/>
        </div>

        <div>
          <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5"/> Payment screenshot</Label>
          <label className={`mt-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-5 cursor-pointer transition ${file?'border-success/50 bg-success/5':'border-border hover:border-primary/50'}`}>
            {file ? <Check className="w-5 h-5 text-success"/> : <Upload className="w-5 h-5 text-muted-foreground"/>}
            <span className="text-sm font-medium">{file ? file.name : "Tap to upload screenshot"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)}/>
          </label>
        </div>

        <Button disabled={busy} onClick={submit} className="w-full bg-gradient-primary text-primary-foreground font-bold h-12">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : `Proceed to Payment →`}
        </Button>
      </Card>
    </div>
  );
}
