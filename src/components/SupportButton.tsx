import { useEffect, useState } from "react";
import { Headphones, X, Send, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Links = { whatsapp: string; telegram: string; messenger: string; youtube: string };

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Links>({ whatsapp: "", telegram: "", messenger: "", youtube: "" });

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("support_whatsapp_url, support_telegram_url, support_messenger_url, support_youtube_url, admin_telegram")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const d: any = data ?? {};
        const tg = d.support_telegram_url || (d.admin_telegram ? `https://t.me/${String(d.admin_telegram).replace(/^@/, "")}` : "");
        setLinks({
          whatsapp: d.support_whatsapp_url || "",
          telegram: tg,
          messenger: d.support_messenger_url || "",
          youtube: d.support_youtube_url || "",
        });
      });
  }, []);

  const items = [
    { key: "whatsapp", label: "WhatsApp", color: "#25D366", url: links.whatsapp, icon: WhatsAppIcon },
    { key: "telegram", label: "Telegram", color: "#229ED9", url: links.telegram, icon: Send },
    { key: "messenger", label: "Messenger", color: "#0084FF", url: links.messenger, icon: MessengerIcon },
    { key: "youtube", label: "YouTube", color: "#FF0000", url: links.youtube, icon: Youtube },
  ].filter((i) => i.url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Support"
        className="fixed bottom-5 left-5 z-50 w-12 h-12 rounded-full grid place-items-center bg-gradient-primary text-primary-foreground shadow-[0_0_20px_rgba(30,102,255,0.5)] ring-2 ring-primary/40"
      >
        {open ? <X className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-20 left-5 z-50 flex flex-col items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          {items.length === 0 && (
            <div className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground shadow-lg">
              No contacts configured
            </div>
          )}
          {items.map((it) => (
            <a
              key={it.key}
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              aria-label={it.label}
              title={it.label}
              className="w-11 h-11 rounded-full grid place-items-center text-white shadow-lg ring-2 ring-white/40 hover:scale-110 transition"
              style={{ backgroundColor: it.color }}
            >
              <it.icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 .1 5.3.1 11.9c0 2.1.6 4.1 1.6 5.9L0 24l6.4-1.7a11.9 11.9 0 0 0 5.6 1.4h.01c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.1-3.4-8.3zM12 21.4c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.5 9.5 0 0 1-1.5-5.1c0-5.3 4.3-9.6 9.6-9.6 2.6 0 5 1 6.8 2.8a9.55 9.55 0 0 1 2.8 6.8c0 5.3-4.3 9.6-9.6 9.6zm5.5-7.2c-.3-.2-1.8-.9-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0c-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.4-.6.1-.2.2-.3.3-.5s0-.4 0-.5c-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3c.2.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4 0-.1-.2-.2-.5-.4z"/>
    </svg>
  );
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 4.97 0 11.1c0 3.49 1.74 6.6 4.46 8.64V24l4.08-2.24c1.09.3 2.24.46 3.46.46 6.63 0 12-4.97 12-11.12C24 4.97 18.63 0 12 0zm1.19 14.96l-3.05-3.26-5.96 3.26 6.56-6.97 3.13 3.26 5.88-3.26-6.56 6.97z"/>
    </svg>
  );
}
