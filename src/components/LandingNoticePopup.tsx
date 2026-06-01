import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";

type Notice = { enabled: boolean; imageUrl: string; telegramUrl: string; text: string };

export function LandingNoticePopup({ notice }: { notice: Notice | null | undefined }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!notice?.enabled) return;
    if (!notice.imageUrl && !notice.text) return;
    if (typeof window !== "undefined" && sessionStorage.getItem("gs_notice_seen") === "1") return;
    setShow(true);
    sessionStorage.setItem("gs_notice_seen", "1");
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, [notice?.enabled, notice?.imageUrl, notice?.text]);

  if (!show || !notice) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-card border border-border shadow-2xl animate-in zoom-in-95">
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 grid place-items-center text-white"
        >
          <X className="w-4 h-4" />
        </button>
        {notice.imageUrl && (
          <img src={notice.imageUrl} alt="Notice" className="w-full aspect-square object-cover" />
        )}
        <div className="p-4 text-center space-y-3">
          {notice.text && <div className="text-sm font-medium">{notice.text}</div>}
          {notice.telegramUrl && (
            <a
              href={notice.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-[#229ED9] text-white font-semibold"
            >
              <Send className="w-4 h-4" /> Join Telegram
            </a>
          )}
          <div className="text-[10px] text-muted-foreground">Auto-closes in a few seconds…</div>
        </div>
      </div>
    </div>
  );
}
