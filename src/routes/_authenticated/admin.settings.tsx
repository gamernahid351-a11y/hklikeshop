import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type S = {
  banner_api_url: string;
  like_api_url: string;
  visit_api_url: string;
  bkash_number: string;
  nagad_number: string;
  min_deposit: number;
  bkash_number_visit: string;
  bkash_number_guild: string;
  payment_instructions: string;
  admin_telegram: string;
  level_up_web_url: string;
  guild_info_api_url: string;
  logo_url: string | null;
  coupon_price_like: number;
  coupon_price_visit: number;
  coupon_price_panel: number;
  support_whatsapp_url: string;
  support_telegram_url: string;
  support_messenger_url: string;
  support_youtube_url: string;
  landing_notice_enabled: boolean;
  landing_notice_image_url: string;
  landing_notice_telegram_url: string;
  landing_notice_text: string;
};

function AdminSettings() {
  const [s, setS] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("*").eq("id", 1).single().then(({ data }) => setS(data as S));
    supabase.from("secure_settings").select("bohudur_api_key").eq("id", 1).maybeSingle()
      .then(({ data }) => setApiKey((data?.bohudur_api_key as string) ?? ""));
  }, []);

  async function saveApiKey() {
    setSavingKey(true);
    const { error } = await supabase.from("secure_settings").update({ bohudur_api_key: apiKey.trim() }).eq("id", 1);
    setSavingKey(false);
    if (error) return toast.error(error.message);
    toast.success("Payment gateway API key saved");
  }

  async function save() {
    if (!s) return;
    setBusy(true);
    const { error } = await supabase.from("app_settings").update(s).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  }

  if (!s) return <div className="grid place-items-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;

  async function uploadImage(file: File, folder: string, field: keyof S) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setS((prev) => prev ? { ...prev, [field]: data.publicUrl } as S : prev);
      toast.success("Uploaded");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }
  const uploadLogo = (file: File) => uploadImage(file, "logo", "logo_url");

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="font-display font-bold text-2xl">Settings</h1>
      <Card className="bg-gradient-card border-border p-5 space-y-4">
        <div>
          <Label>Site Logo</Label>
          <div className="mt-1 rounded-lg border border-border overflow-hidden">
            {s.logo_url ? <div className="aspect-[3/1] bg-secondary/40 grid place-items-center"><img src={s.logo_url} alt="logo" className="max-h-24 object-contain"/></div>
              : <div className="aspect-[3/1] grid place-items-center text-muted-foreground text-xs"><ImageIcon className="w-5 h-5 mr-1"/>No logo</div>}
            <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
              <span>{uploading ? "Uploading..." : "Upload logo"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
          </div>
        </div>
        <div>
          <Label>Banner API URL <span className="text-xs text-muted-foreground">(use {"{uid}"} placeholder)</span></Label>
          <Input value={s.banner_api_url} onChange={(e) => setS({ ...s, banner_api_url: e.target.value })} placeholder="https://public-url-host--mehedixffx.replit.app/banner/profile?uid={uid}" />
        </div>
        <div>
          <Label>Like API URL <span className="text-xs text-muted-foreground">(use {"{uid}"} placeholder)</span></Label>
          <Input value={s.like_api_url} onChange={(e) => setS({ ...s, like_api_url: e.target.value })} />
        </div>
        <div>
          <Label>Visit API URL <span className="text-xs text-muted-foreground">(use {"{uid}"} placeholder, returns ~10k visits per call)</span></Label>
          <Input value={s.visit_api_url} onChange={(e) => setS({ ...s, visit_api_url: e.target.value })} placeholder="https://your-domain.com/visit?uid={uid}&region=bd" />
        </div>
        <div>
          <Label>bKash Number (Likes / Deposits)</Label>
          <Input value={s.bkash_number} onChange={(e) => setS({ ...s, bkash_number: e.target.value })} placeholder="01XXXXXXXXX" />
        </div>
        <div>
          <Label>Nagad Number (Deposits)</Label>
          <Input value={s.nagad_number ?? ""} onChange={(e) => setS({ ...s, nagad_number: e.target.value })} placeholder="01XXXXXXXXX" />
        </div>
        <div>
          <Label>Minimum Deposit ৳</Label>
          <Input type="number" value={s.min_deposit ?? 10} onChange={(e) => setS({ ...s, min_deposit: Number(e.target.value) })} />
        </div>
        <div>
          <Label>bKash Number (Visits)</Label>
          <Input value={s.bkash_number_visit} onChange={(e) => setS({ ...s, bkash_number_visit: e.target.value })} placeholder="Separate bKash number for visit packages" />
        </div>
        <div>
          <Label>bKash Number (Guild Bots)</Label>
          <Input value={s.bkash_number_guild ?? ""} onChange={(e) => setS({ ...s, bkash_number_guild: e.target.value })} placeholder="Separate bKash number for guild bot packages" />
        </div>
        <div>
          <Label>LEVEL UP WEB URL <span className="text-xs text-muted-foreground">(redirect button on landing & dashboard)</span></Label>
          <Input value={s.level_up_web_url ?? ""} onChange={(e) => setS({ ...s, level_up_web_url: e.target.value })} placeholder="https://gslevelup.lovable.app/" />
        </div>
        <div>
          <Label>Guild Info API URL <span className="text-xs text-muted-foreground">(use {"{guild_id}"} placeholder — user's guild id will be inserted automatically)</span></Label>
          <Input value={s.guild_info_api_url ?? ""} onChange={(e) => setS({ ...s, guild_info_api_url: e.target.value })} placeholder="https://danger-guild-management-web.vercel.app/guild?guild_id={guild_id}&region=bd" />
        </div>
        <div>
          <Label>Admin Telegram <span className="text-xs text-muted-foreground">(shown as a Contact Admin button to users)</span></Label>
          <Input value={s.admin_telegram} onChange={(e) => setS({ ...s, admin_telegram: e.target.value })} placeholder="@proxaura" />
        </div>
        <div>
          <Label>Payment Instructions <span className="text-xs text-muted-foreground">(use {"{bkash}"} placeholder)</span></Label>
          <Textarea rows={6} value={s.payment_instructions} onChange={(e) => setS({ ...s, payment_instructions: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Coupon ৳ (Like)</Label><Input type="number" value={s.coupon_price_like} onChange={(e) => setS({ ...s, coupon_price_like: Number(e.target.value) })} /></div>
          <div><Label>Coupon ৳ (Visit)</Label><Input type="number" value={s.coupon_price_visit} onChange={(e) => setS({ ...s, coupon_price_visit: Number(e.target.value) })} /></div>
          <div><Label>Coupon ৳ (Panel)</Label><Input type="number" value={s.coupon_price_panel} onChange={(e) => setS({ ...s, coupon_price_panel: Number(e.target.value) })} /></div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="font-display font-bold text-sm mb-2">Support Contacts <span className="text-xs text-muted-foreground font-normal">(headphone button on dashboard)</span></div>
          <div className="space-y-3">
            <div>
              <Label>WhatsApp URL</Label>
              <Input value={s.support_whatsapp_url ?? ""} onChange={(e) => setS({ ...s, support_whatsapp_url: e.target.value })} placeholder="https://wa.me/8801XXXXXXXXX" />
            </div>
            <div>
              <Label>Telegram URL</Label>
              <Input value={s.support_telegram_url ?? ""} onChange={(e) => setS({ ...s, support_telegram_url: e.target.value })} placeholder="https://t.me/yourhandle" />
            </div>
            <div>
              <Label>Messenger URL</Label>
              <Input value={s.support_messenger_url ?? ""} onChange={(e) => setS({ ...s, support_messenger_url: e.target.value })} placeholder="https://m.me/yourpage" />
            </div>
            <div>
              <Label>YouTube URL</Label>
              <Input value={s.support_youtube_url ?? ""} onChange={(e) => setS({ ...s, support_youtube_url: e.target.value })} placeholder="https://youtube.com/@yourchannel" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="font-display font-bold text-sm mb-2">Landing Page Notice Popup <span className="text-xs text-muted-foreground font-normal">(shows when web opens, auto-closes in 5s)</span></div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!s.landing_notice_enabled} onChange={(e) => setS({ ...s, landing_notice_enabled: e.target.checked })} />
              Enable notice popup
            </label>
            <div>
              <Label>Notice Image</Label>
              <div className="mt-1 rounded-lg border border-border overflow-hidden">
                {s.landing_notice_image_url ? <div className="aspect-square bg-secondary/40 grid place-items-center max-h-48"><img src={s.landing_notice_image_url} alt="notice" className="max-h-48 object-contain"/></div>
                  : <div className="aspect-[3/1] grid place-items-center text-muted-foreground text-xs"><ImageIcon className="w-5 h-5 mr-1"/>No image</div>}
                <label className="flex items-center justify-center gap-2 p-2 border-t border-border bg-secondary/30 cursor-pointer text-sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                  <span>{uploading ? "Uploading..." : "Upload notice image"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "notice", "landing_notice_image_url")} />
                </label>
              </div>
            </div>
            <div>
              <Label>Notice Text</Label>
              <Input value={s.landing_notice_text ?? ""} onChange={(e) => setS({ ...s, landing_notice_text: e.target.value })} placeholder="Join our Telegram channel!" />
            </div>
            <div>
              <Label>Telegram Channel URL <span className="text-xs text-muted-foreground">(button on the notice)</span></Label>
              <Input value={s.landing_notice_telegram_url ?? ""} onChange={(e) => setS({ ...s, landing_notice_telegram_url: e.target.value })} placeholder="https://t.me/yourchannel" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="font-display font-bold text-sm mb-2">Payment Gateway <span className="text-xs text-muted-foreground font-normal">(Bohudur API key — admin only)</span></div>
          <div className="space-y-2">
            <div>
              <Label>Bohudur API Key</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AH-BOHUDUR-API-KEY" />
            </div>
            <Button onClick={saveApiKey} disabled={savingKey} variant="outline" className="w-full">
              {savingKey ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save API key"}
            </Button>
          </div>
        </div>

        <Button onClick={save} disabled={busy} className="bg-gradient-primary text-primary-foreground hover:opacity-90 w-full">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save settings"}
        </Button>
      </Card>
    </div>
  );
}
