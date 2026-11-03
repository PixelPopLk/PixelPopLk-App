import { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles, Megaphone, Send } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const AD_PROMOTION_LAST_SHOWN_KEY = "pixelpop_ad_promotion_last_shown";
const AD_PROMOTION_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const AD_PROMOTION_TELEGRAM_URL = "https://t.me/Madusankha789";

function AdvertisingPromotionPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Keep the promotion away from the admin area.
    if (
      window.location.pathname === "/manage-admin" ||
      window.location.pathname.startsWith("/manage-admin/")
    ) {
      return;
    }

    let lastShownAt = 0;
    try {
      lastShownAt = Number(localStorage.getItem(AD_PROMOTION_LAST_SHOWN_KEY) || 0);
    } catch {
      // If storage is unavailable, show once for this page load only.
    }

    if (Number.isFinite(lastShownAt) && Date.now() - lastShownAt < AD_PROMOTION_COOLDOWN_MS) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
      try {
        // Start the 30-day cooldown only when the visitor actually sees the popup.
        localStorage.setItem(AD_PROMOTION_LAST_SHOWN_KEY, String(Date.now()));
      } catch {
        // The popup still works when browser storage is disabled.
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      data-no-ad="true"
      className="fixed inset-0 z-[100001] flex items-center justify-center overflow-y-auto modal-backdrop px-4 py-6 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-promotion-title"
      aria-describedby="ad-promotion-description"
    >
      <div className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-primary to-amber-400" />

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close promotion"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Megaphone className="h-7 w-7" />
        </div>

        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            PixelPopLK Promotions
          </p>
          <h2
            id="ad-promotion-title"
            className="mt-3 text-xl font-black leading-snug text-foreground sm:text-2xl"
          >
            ඔබගේ දැන්වීම් ප්‍රචාරය කරගන්න කැමතිද?
          </h2>
          <p
            id="ad-promotion-description"
            className="mt-3 text-sm leading-7 text-muted-foreground"
          >
            අපගේ Telegram Channel එක සහ Website එක හරහා ඔබගේ දැන්වීම් පළකරවා ගැනීමට අවශ්‍යද?
          </p>
        </div>

        <div className="mt-7 grid gap-3">
          <a
            href={AD_PROMOTION_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          >
            <Send className="h-4 w-4" />
            ඔව්! දැන්වීම් පළකරන්න
          </a>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full rounded-xl border border-border bg-muted/50 px-5 py-3.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            මගහරින්න
          </button>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          මෙම පණිවිඩය දින 30කට වරක් පමණක් පෙන්වනු ලැබේ.
        </p>
      </div>
    </div>
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user already dismissed prompt recently (7 days)
    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Check if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 3 seconds after page load before showing prompt
      setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setIsVisible(false);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa_prompt_dismissed", String(Date.now()));
  };

  return (
    <>
      <AdvertisingPromotionPopup />
      {isVisible && deferredPrompt && (
        <div
          data-no-ad="true"
          className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-500 sm:left-auto sm:right-6 sm:max-w-md"
        >
          <div className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-2xl shadow-primary/20 backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-500 to-primary" />
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>Install PixelPopLK App</span>
                <Sparkles className="h-3 w-3 text-amber-400" />
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Add to home screen for faster downloads & offline mode!
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={handleInstallClick}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-gradient-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-glow transition hover:opacity-95"
              >
                <Download className="h-3 w-3" />
                Install
              </button>
              <button
                onClick={handleDismiss}
                aria-label="Close"
                className="cursor-pointer rounded-lg p-1 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
