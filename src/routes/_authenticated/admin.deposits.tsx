import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Eye, Image as ImageIcon, Loader2, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/deposits")({
  component: AdminDeposits,
});

type D = {
  id: string; user_id: string; amount: number; method: string;
  trx_id: string; sender_number: string | null; payment_screenshot_url: string | null;
  status: "pending" | "approved" | "rejected"; rejection_reason: string | null;
  created_at: string; user_email?: string | null;
};

function AdminDeposits() {
  const [items, setItems] = useState<D[]>([]);
  const [tab, setTab] = useState<"pending"|"approved"|"rejected"|"all">("pending");
  const [view, setView] = useState<D | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [reject, setReject] = useState<D | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("deposit_orders").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as D[];
    if (list.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", Array.from(new Set(list.map((o) => o.user_id))));
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.email]));
      list.forEach((o) => { o.user_email = map.get(o.user_id) ?? null; });
    }
    setItems(list);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openShot(d: D) {
    setView(d); setShotUrl(null);
    if (d.payment_screenshot_url) {
      const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(d.payment_screenshot_url, 600);
      if (data) setShotUrl(data.signedUrl);
    }
  }

  async function approve(d: D) {
    setBusy(d.id);
    try {
      const { data, error } = await supabase.rpc("approve_deposit_order", { _deposit_id: d.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) throw new Error(row?.message || "Failed");
      toast.success(`Approved. New balance ৳${Number(row.new_balance).toFixed(2)}`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function doReject() {
    if (!reject) return;
    setBusy(reject.id);
    try {
      const { error } = await supabase.from("deposit_orders").update({ status: "rejected", rejection_reason: reason || "Rejected" }).eq("id", reject.id);
      if (error) throw error;
      toast.success("Rejected");
      setReject(null); setReason(""); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  const filtered = tab === "all" ? items : items.filter((x) => x.status === tab);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-2xl flex items-center gap-2"><Wallet className="w-5 h-5 text-primary"/> Deposits</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-3 mt-4">
          {loading && <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto"/>}
          {!loading && filtered.length === 0 && <Card className="bg-gradient-card border-border p-8 text-center text-muted-foreground">No deposits here.</Card>}
          {filtered.map((d) => (
            <Card key={d.id} className="bg-gradient-card border-border p-4 space-y-2 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display font-bold text-lg">৳{Number(d.amount)} <span className="text-xs uppercase text-muted-foreground">{d.method}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{d.user_email}</div>
                  <div className="text-xs font-mono text-muted-foreground">TrxID: {d.trx_id}{d.sender_number ? ` • ${d.sender_number}` : ""}</div>
                </div>
                <Badge variant="outline" className="capitalize">{d.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openShot(d)}><Eye className="w-3.5 h-3.5 mr-1"/>View proof</Button>
                {d.status === "pending" && <>
                  <Button size="sm" disabled={busy===d.id} onClick={() => approve(d)} className="bg-success text-success-foreground hover:bg-success/90">{busy===d.id?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<><CheckCircle2 className="w-3.5 h-3.5 mr-1"/>Approve</>}</Button>
                  <Button size="sm" variant="destructive" onClick={() => setReject(d)}><XCircle className="w-3.5 h-3.5 mr-1"/>Reject</Button>
                </>}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Deposit ৳{view ? Number(view.amount) : ""}</DialogTitle></DialogHeader>
          <div className="rounded-md border border-border bg-background min-h-[180px] grid place-items-center overflow-hidden">
            {!view?.payment_screenshot_url && <ImageIcon className="w-8 h-8 text-muted-foreground"/>}
            {view?.payment_screenshot_url && !shotUrl && <Loader2 className="w-5 h-5 animate-spin"/>}
            {shotUrl && <img src={shotUrl} className="w-full max-h-[420px] object-contain"/>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reject} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Reject deposit</DialogTitle></DialogHeader>
          <Label>Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Invalid TrxID"/>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReject(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy===reject?.id} onClick={doReject}>{busy===reject?.id?<Loader2 className="w-4 h-4 animate-spin"/>:"Reject"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
