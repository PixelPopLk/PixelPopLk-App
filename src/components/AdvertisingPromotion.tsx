import { useState, type FormEvent } from "react";
import { Megaphone, X, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Placement = "Website" | "Telegram Channel" | "Website + Telegram";

export function AdvertisingPromotion() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [placement, setPlacement] = useState<Placement>("Website + Telegram");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const close = () => {
    if (status !== "sending") {
      setIsOpen(false);
      setStatus("idle");
      setError("");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/advertising-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message, placement, website }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "ඉල්ලීම යැවීමට නොහැකි වුණා. නැවත උත්සාහ කරන්න.");
      }
      setStatus("success");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
      setWebsite("");
      setPlacement("Website + Telegram");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "දෝෂයක් ඇතිවුණා. නැවත උත්සාහ කරන්න.");
    }
  };

  return (
    <>
      <section className="mt-6 rounded-2xl border border-primary/25 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-snug text-foreground sm:text-lg">
              ඔබගේ දැන්වීම් ප්‍රචාරය කරගන්න කැමතිද?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              අපගේ Telegram Channel එක සහ Website එක හරහා ඔබගේ දැන්වීම් පළකරවා ගැනීමට අවශ්‍යද?
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              ඔව්! දැන්වීමක් පළකරන්න
            </button>
          </div>
        </div>
      </section>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto bg-black/75 px-3 py-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="advertising-request-title"
            className="relative my-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-7"
          >
            <button
              type="button"
              onClick={close}
              disabled={status === "sending"}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-9">
              <div className="flex items-center gap-2 text-primary">
                <Megaphone className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">PixelPopLK Promotions</span>
              </div>
              <h2 id="advertising-request-title" className="mt-3 text-xl font-extrabold text-foreground">
                දැන්වීම් ඉල්ලීමක් යවන්න
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ඔබගේ විස්තර ලබාදෙන්න. අපි ඉක්මනින් ඔබව සම්බන්ධ කරගන්නම්.
              </p>
            </div>

            {status === "success" ? (
              <div className="mt-7 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <h3 className="mt-3 font-bold text-foreground">ඔබගේ ඉල්ලීම ලැබුණා!</h3>
                <p className="mt-2 text-sm text-muted-foreground">ස්තූතියි. අපි ඔබව ඉක්මනින් සම්බන්ධ කරගන්නම්.</p>
                <button type="button" onClick={close} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
                  හරි
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="ad-name" className="mb-1.5 block text-xs font-bold text-foreground">ඔබගේ නම *</label>
                  <input id="ad-name" name="name" required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="නම ඇතුළත් කරන්න" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </div>
                <div>
                  <label htmlFor="ad-phone" className="mb-1.5 block text-xs font-bold text-foreground">දුරකථන අංකය *</label>
                  <input id="ad-phone" name="phone" required maxLength={30} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 7X XXX XXXX" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </div>
                <div>
                  <label htmlFor="ad-email" className="mb-1.5 block text-xs font-bold text-foreground">Email (විකල්පයි)</label>
                  <input id="ad-email" name="email" type="email" maxLength={120} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </div>
                <div>
                  <label htmlFor="ad-placement" className="mb-1.5 block text-xs font-bold text-foreground">දැන්වීම පළ කිරීමට අවශ්‍ය ස්ථානය *</label>
                  <select id="ad-placement" value={placement} onChange={(e) => setPlacement(e.target.value as Placement)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                    <option value="Website">Website එකේ</option>
                    <option value="Telegram Channel">Telegram Channel එකේ</option>
                    <option value="Website + Telegram">දෙකේම</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ad-message" className="mb-1.5 block text-xs font-bold text-foreground">ඔබ පළ කිරීමට බලාපොරොත්තු වන දැන්වීම ගැන *</label>
                  <textarea id="ad-message" name="message" required minLength={5} maxLength={1500} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ඔබගේ දැන්වීම සහ අවශ්‍ය විස්තර මෙහි ලියන්න..." className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </div>
                <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="ad-website">Leave this field empty</label>
                  <input id="ad-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                {status === "error" && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button type="submit" disabled={status === "sending"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                  {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {status === "sending" ? "යවමින් පවතී..." : "දැන්වීම් ඉල්ලීම යවන්න"}
                </button>
                <p className="text-center text-[11px] text-muted-foreground">ඔබ ලබාදෙන තොරතුරු දැන්වීම් ඉල්ලීම සම්බන්ධයෙන් පමණක් භාවිතා කරයි.</p>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
