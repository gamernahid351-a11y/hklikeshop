import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Heart, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: AdminPackages,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  likes_per_day: number;
  duration_days: number;
  price_bdt: number;
  is_active: boolean;
  sort_order: number;
  like_api_url: string | null;
};

const empty: Omit<Pkg, "id"> = {
  name: "",
  description: "",
  likes_per_day: 100,
  duration_days: 7,
  price_bdt: 60,
  is_active: true,
  sort_order: 0,
  like_api_url: "",
};

function AdminPackages() {
  const [items, setItems] = useState<Pkg[]>([]);
  const [edit, setEdit] = useState<Pkg | null>(null);
  const [form, setForm] = useState<Omit<Pkg, "id">>(empty);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("packages")
      .select("id,name,description,likes_per_day,duration_days,price_bdt,is_active,sort_order,like_api_url")
      .eq("type", "like")
      .order("sort_order");
    setItems((data ?? []) as Pkg[]);
  }
  useEffect(() => { load(); }, []);

  function open(p?: Pkg) {
    if (p) { setEdit(p); setForm({ ...p, description: p.description ?? "", like_api_url: p.like_api_url ?? "" }); }
    else { setEdit({ id: "" } as Pkg); setForm(empty); }
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name din");
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
        type: "like" as const,
        visits_count: 0,
        image_url: null,
        category_id: null,
        price_bdt: Number(form.price_bdt),
        likes_per_day: Number(form.likes_per_day),
        duration_days: Number(form.duration_days),
        like_api_url: form.like_api_url?.trim() || null,
      };
      if (edit?.id) {
        const { error } = await supabase.from("packages").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      setEdit(null);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this like package?")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  async function toggleActive(p: Pkg, v: boolean) {
    setItems((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: v } : x));
    const { error } = await supabase.from("packages").update({ is_active: v }).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      setItems((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !v } : x));
    } else {
      toast.success(v ? "Package on" : "Package off");
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> Like Packages</h1>
          <p className="text-sm text-muted-foreground">Each package can have its own Like API URL</p>
        </div>
        <Button onClick={() => open()} className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" />New</Button>
      </div>

      <div className="space-y-3">
        {items.map((p) => (
          <Card key={p.id} className="bg-gradient-card border-border p-4 flex items-center gap-3 shadow-card">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center shrink-0"><Heart className="w-5 h-5 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.name}{!p.is_active && <span className="text-xs text-muted-foreground ml-1">(hidden)</span>}</div>
              <div className="text-xs text-muted-foreground">{p.likes_per_day}/day × {p.duration_days}d • ৳{Number(p.price_bdt)}</div>
              {p.like_api_url && <div className="text-[10px] text-success truncate mt-0.5">API: {p.like_api_url}</div>}
            </div>
            <div className="flex gap-2">
              <Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p, v)} />
              <Button size="sm" variant="outline" onClick={() => open(p)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="destructive" onClick={() => del(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card className="bg-gradient-card border-border p-6 text-center text-muted-foreground text-sm">No like packages</Card>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit like package" : "New like package"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Likes/day</Label><Input type="number" value={form.likes_per_day} onChange={(e) => setForm({ ...form, likes_per_day: Number(e.target.value) })} /></div>
              <div><Label>Days</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
              <div><Label>Price ৳</Label><Input type="number" value={form.price_bdt} onChange={(e) => setForm({ ...form, price_bdt: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label>Like API URL <span className="text-xs text-muted-foreground">(use {"{uid}"} placeholder)</span></Label>
              <Input value={form.like_api_url ?? ""} onChange={(e) => setForm({ ...form, like_api_url: e.target.value })} placeholder="https://your-api.com/like?uid={uid}" />
              <div className="text-[10px] text-muted-foreground mt-1">Empty hole global Like API URL use hobe. Cron 24hr por por call korbe duration din porjonto.</div>
            </div>
            <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> <Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-gradient-primary text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
