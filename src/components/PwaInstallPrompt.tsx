import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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

  if (!isVisible || !deferredPrompt) return null;

  return (
    <div 
      data-no-ad="true"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-500"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-xl p-4 shadow-2xl shadow-primary/20 flex items-center gap-3.5">
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-500 to-primary" />

        <div className="w-11 h-11 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground shadow-glow shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <span>Install PixelPopLK App</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            Add to home screen for faster downloads & offline mode!
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-full bg-gradient-primary text-primary-foreground text-xs font-bold shadow-glow hover:opacity-95 transition cursor-pointer flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Close"
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
