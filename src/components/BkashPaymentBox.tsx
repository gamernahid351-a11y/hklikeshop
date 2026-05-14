import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Copy, Check, AlertCircle } from "lucide-react";

export function BkashPaymentBox({
  number,
  amount,
  instructions,
}: {
  number: string;
  amount: number | string;
  instructions?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  if (!number) return null;
  return (
    <div className="rounded-xl p-4 space-y-3 border border-warning/40 bg-gradient-payment shadow-payment">
      <div className="flex items-center gap-2 text-warning-foreground">
        <div className="w-8 h-8 rounded-lg bg-background/20 grid place-items-center backdrop-blur">
          <Smartphone className="w-4 h-4 text-warning-foreground" />
        </div>
        <div className="text-sm font-bold">bKash Payment</div>
        <Badge className="ml-auto bg-background/85 text-foreground border-0 font-bold hover:bg-background/85">৳{Number(amount)}</Badge>
      </div>

      <div className="rounded-lg bg-background/20 backdrop-blur border border-background/30 p-3">
        <div className="text-[10px] uppercase tracking-widest text-warning-foreground/80 mb-1">Send Money to</div>
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono font-bold text-xl sm:text-2xl text-warning-foreground tracking-wider drop-shadow break-all">{number}</div>
          <Button
            size="sm"
            className={copied ? "bg-background text-foreground hover:bg-background" : "bg-background text-foreground hover:bg-background/90 font-bold"}
            onClick={() => {
              navigator.clipboard.writeText(number);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <><Check className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
          </Button>
        </div>
      </div>

      <ol className="space-y-2 text-xs text-warning-foreground">
        <li className="flex gap-2 items-start">
          <span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">1</span>
          <span>bKash app khulun → <b>Send Money</b> select korun</span>
        </li>
        <li className="flex gap-2 items-start">
          <span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">2</span>
          <span>Upore deya number e <b>৳{Number(amount)}</b> send korun</span>
        </li>
        <li className="flex gap-2 items-start">
          <span className="w-5 h-5 shrink-0 rounded-full bg-background text-foreground grid place-items-center font-bold text-[10px]">3</span>
          <span>Confirmation SMS theke <b>TrxID</b> niche bosan + <b>screenshot</b> upload korun</span>
        </li>
        <li className="flex gap-2 items-start">
          <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-400 text-white grid place-items-center font-bold text-[10px]">✓</span>
          <span>Submit korar pore admin verify korbe (usually 5-30 min)</span>
        </li>
      </ol>

      {instructions && (
        <details className="text-xs text-warning-foreground/95">
          <summary className="cursor-pointer flex items-center gap-1 opacity-90">
            <AlertCircle className="w-3 h-3" /> More details
          </summary>
          <pre className="whitespace-pre-wrap mt-2 font-sans bg-background/20 p-2 rounded border border-background/25">{instructions.replace("{bkash}", number)}</pre>
        </details>
      )}
    </div>
  );
}
