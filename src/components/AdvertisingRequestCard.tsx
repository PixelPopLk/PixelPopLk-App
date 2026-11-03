import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Megaphone, Send, X } from "lucide-react";

type Placement = "Website" | "Telegram Channel" | "Website + Telegram";

export function AdvertisingRequestCard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [placement, setPlacement] = useState<Placement>("Website + Telegram");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setIsFormOpen(false);
    setStatus("idle");
    setErrorMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/advertising-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message, placement, website }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "ඉල්ලීම යැවීමට නොහැකි වුණා.");
      setStatus("success");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
      setWebsite("");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "නැවත උත්සාහ කරන්න.");
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-primary/25 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-foreground sm:text-lg">
            ඔබගේ දැන්වීම් ප්‍රචාරය කරගන්න කැමතිද?
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            අපගේ Telegram Channel එක සහ Website එක හරහා ඔබගේ දැන්වීම් පළකරවා ගැනීමට අවශ්‍යද?
          </p>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
          >
            ඔව්! <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-[100002] flex items-center justify-center overflow-y-auto modal-backdrop p-3 backdrop-blur-sm sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="advertising-request-title"
        >
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h4 id="advertising-request-title" className="font-bold text-foreground">
                  දැන්වීම් ඉල්ලීම
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ඔබගේ විස්තර ලබාදෙන්න. අපි ඔබව සම්බන්ධ කරගන්නම්.
                </p>
              </div>
              <button type="button" onClick={resetForm} aria-label="Close form" className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === "success" ? (
              <div className="p-7 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <h5 className="mt-3 text-lg font-bold text-foreground">ඔබගේ ඉල්ලීම ලැබුණා!</h5>
                <p className="mt-2 text-sm text-muted-foreground">ස්තුතියි. අපි හැකි ඉක්මනින් ඔබව සම්බන්ධ කරගන්නම්.</p>
                <button type="button" onClick={resetForm} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">හරි</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <div>
                  <label htmlFor="ad-request-name" className="mb-1.5 block text-xs font-bold text-foreground">ඔබගේ නම *</label>
                  <input id="ad-request-name" required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="නම ඇතුළත් කරන්න" className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label htmlFor="ad-request-phone" className="mb-1.5 block text-xs font-bold text-foreground">දුරකථන අංකය *</label>
                  <input id="ad-request-phone" required maxLength={30} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 ..." className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label htmlFor="ad-request-email" className="mb-1.5 block text-xs font-bold text-foreground">Email (විකල්පයි)</label>
                  <input id="ad-request-email" type="email" maxLength={120} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label htmlFor="ad-request-placement" className="mb-1.5 block text-xs font-bold text-foreground">දැන්වීම පළ කිරීමට අවශ්‍ය ස්ථානය *</label>
                  <select id="ad-request-placement" value={placement} onChange={(e) => setPlacement(e.target.value as Placement)} className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <option value="Website">Website</option>
                    <option value="Telegram Channel">Telegram Channel</option>
                    <option value="Website + Telegram">Website + Telegram දෙකම</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ad-request-message" className="mb-1.5 block text-xs font-bold text-foreground">දැන්වීම පිළිබඳ විස්තර *</label>
                  <textarea id="ad-request-message" required minLength={5} maxLength={1500} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ඔබ ප්‍රචාරය කිරීමට කැමති දේ සහ අවශ්‍ය විස්තර ලියන්න..." className="w-full resize-y rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div aria-hidden="true" className="hidden">
                  <label htmlFor="ad-request-website">Leave this field empty</label>
                  <input id="ad-request-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                {status === "error" && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
                <button type="submit" disabled={status === "sending"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> යවමින්...</> : <><Send className="h-4 w-4" /> දැන්වීම් ඉල්ලීම යවන්න</>}
                </button>
                <p className="text-center text-[11px] text-muted-foreground">ඔබ ලබාදෙන තොරතුරු දැන්වීම් ඉල්ලීම සම්බන්ධයෙන් පමණක් භාවිතා කරයි.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
