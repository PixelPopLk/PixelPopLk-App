import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Lock, AlertTriangle, CheckCircle, X } from "lucide-react";

// Monetag සහ Adsterra 50/50 සසම්භාවීව මාරු වීම සඳහා URL දෙකම ඇතුළත් කර ඇත
const MONETAG_URL = "https://omg10.com/4/11202064";
const ADSTERRA_URL = "https://www.effectivecpmnetwork.com/b795sywmp?key=20b07ce2b76b7238eae7acf49dd3a534";

const COUNTDOWN_SECONDS = 5;

// සසම්භාවීව දැන්වීම් URL එකක් ලබා ගන්නා සරල ශ්‍රිතය
const getRandomAdUrl = () => Math.random() < 0.5 ? MONETAG_URL : ADSTERRA_URL;

/**
 * Sanitizes and validates a URL to prevent protocol-based XSS attacks (e.g. javascript: URLs)
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith("/")) return true;
    const parsed = new URL(cleanUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "ipfs:";
  } catch {
    return false;
  }
}

interface DownloadCountdownModalProps {
  downloadLink: string;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export function DownloadCountdownModal({
  downloadLink,
  onClose,
  onUnlockSuccess,
}: DownloadCountdownModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [status, setStatus] = useState<"verifying" | "warning" | "completed">("verifying");

  const blurTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPageVisibleRef = useRef<boolean>(true);

  // පළමු වතාවට මෝඩල් එක ඕපන් වන විට පමණක් මුල සිට ටයිමරය පටන් ගනී
  const startVerification = () => {
    accumulatedTimeRef.current = 0;
    blurTimeRef.current = null;
    setSecondsLeft(COUNTDOWN_SECONDS);
    setStatus("verifying");
  };

  useEffect(() => {
    if (status !== "verifying") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Set initial visibility state
    const isVisible = document.visibilityState === "visible";
    isPageVisibleRef.current = isVisible;
    if (!isVisible) {
      blurTimeRef.current = Date.now();
    } else {
      blurTimeRef.current = null;
    }

    const updateTimer = () => {
      const now = Date.now();
      let currentSessionTime = 0;
      if (blurTimeRef.current !== null) {
        currentSessionTime = now - blurTimeRef.current;
      }
      const totalMs = accumulatedTimeRef.current + currentSessionTime;
      const remainingSeconds = Math.max(0, COUNTDOWN_SECONDS - Math.floor(totalMs / 1000));
      setSecondsLeft(remainingSeconds);

      if (totalMs >= COUNTDOWN_SECONDS * 1000) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("completed");
        onUnlockSuccess();
      }
    };

    timerRef.current = setInterval(updateTimer, 100);

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      const now = Date.now();

      if (isVisible) {
        isPageVisibleRef.current = true;
        if (blurTimeRef.current !== null) {
          accumulatedTimeRef.current += now - blurTimeRef.current;
          blurTimeRef.current = null;
        }

        // පරිශීලකයා නියමිත කාලයට පෙර නැවත පැමිණියහොත් ටයිමරය නතර (Freeze) කර Warning තත්ත්වයට පත් කරයි
        if (accumulatedTimeRef.current < COUNTDOWN_SECONDS * 1000) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus("warning");
        }
      } else {
        isPageVisibleRef.current = false;
        blurTimeRef.current = now;
      }
    };

    const handleBlur = () => {
      const now = Date.now();
      if (isPageVisibleRef.current) {
        isPageVisibleRef.current = false;
        blurTimeRef.current = now;
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      if (!isPageVisibleRef.current) {
        isPageVisibleRef.current = true;
        if (blurTimeRef.current !== null) {
          accumulatedTimeRef.current += now - blurTimeRef.current;
          blurTimeRef.current = null;
        }

        if (accumulatedTimeRef.current < COUNTDOWN_SECONDS * 1000) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus("warning");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [status]);

  // 🔥 Freeze වූ තත්පර ගණනින් නැවත ආරම්භ කිරීම (Resume Logic)
  const handleResume = () => {
    // නැවතත් 50% සසම්භාවීව ඇඩ් එකක් අලුත් ටැබ් එකකින් විවෘත කරයි
    const activeAdUrl = getRandomAdUrl();
    try {
      const w = window.open(activeAdUrl, "_blank", "noopener,noreferrer");
      if (w) w.opener = null;
    } catch {
      /* noop */
    }
    
    // දත්ත ඉතිරි තත්පර ගණනින් පටන් ගැනීමට සලස්වයි
    blurTimeRef.current = null;
    setStatus("verifying");
  };

  const circumference = 2 * Math.PI * 32; // r=32
  const dashOffset = circumference * (secondsLeft / COUNTDOWN_SECONDS);

  const safeDownloadLink = isSafeUrl(downloadLink) ? downloadLink : "#";

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          key="modal-card"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-sm rounded-3xl border border-border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden"
          style={{
            background: "linear-gradient(160deg, oklch(0.20 0.01 20 / 0.98), oklch(0.14 0.008 20 / 0.98))",
          }}
        >
          {/* Top glow strip */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-primary opacity-80" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="p-8 flex flex-col items-center text-center gap-5">
            {status === "warning" ? (
              /* Warning/Paused state when returned too early */
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 grid place-items-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Verification Paused</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    You returned too early! Please stay on the sponsor page for at least{" "}
                    <span className="text-amber-400 font-semibold">{secondsLeft} more seconds</span> to unlock the download.
                  </p>
                </div>
                <button
                  onClick={handleResume} // <-- Resume button එක
                  className="px-6 py-2.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-bold shadow-glow hover:opacity-90 transition cursor-pointer w-full"
                >
                  Resume Unlocking
                </button>
              </>
            ) : status === "completed" ? (
              /* Completed state */
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Download Unlocked!</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Your secure download link has been unlocked.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <a
                    href={safeDownloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (safeDownloadLink === "#") {
                        e.preventDefault();
                        alert("Invalid or unsafe download link detected.");
                      } else {
                        onClose();
                      }
                    }}
                    className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold text-center transition cursor-pointer w-full"
                  >
                    Start Download
                  </a>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-full bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition cursor-pointer w-full"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              /* Countdown state */
              <>
                {/* SVG Countdown Ring */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
                    {/* Track */}
                    <circle cx="48" cy="48" r="32" fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="6" />
                    {/* Progress */}
                    <circle
                      cx="48"
                      cy="48"
                      r="32"
                      fill="none"
                      stroke="url(#ring-gradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: "stroke-dashoffset 0.1s linear" }}
                    />
                    <defs>
                      <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="oklch(0.62 0.24 25)" />
                        <stop offset="100%" stopColor="oklch(0.55 0.25 18)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-extrabold tabular-nums text-gradient leading-none">
                      {secondsLeft}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">sec</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      Verifying Ad View
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    Unlocking download link...
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    Please stay on the sponsor page for{" "}
                    <span className="text-foreground font-semibold">
                      {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}
                    </span>.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary rounded-full transition-all"
                    style={{
                      width: `${((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100}%`,
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>

                <button
                  onClick={handleResume}
                  className="text-xs text-primary/80 hover:text-primary underline cursor-pointer"
                >
                  Sponsor page didn't open? Click here
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Replacement for <a href={downloadLink}> — shows countdown modal instead */
export function DownloadButton({
  downloadLink,
  label = "Download Subtitle",
  className,
  variant = "primary",
}: {
  downloadLink: string;
  label?: string;
  className?: string;
  variant?: "primary" | "telegram";
}) {
  const [showModal, setShowModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    try {
      const key = `unlocked_${btoa(downloadLink)}`;
      if (sessionStorage.getItem(key) === "true") {
        setIsUnlocked(true);
      }
    } catch {
      /* noop */
    }
  }, [downloadLink]);

  const handleDownloadClick = () => {
    if (isUnlocked) {
      if (isSafeUrl(downloadLink)) {
        try {
          const w = window.open(downloadLink, "_blank", "noopener,noreferrer");
          if (w) w.opener = null;
        } catch {
          /* noop */
        }
      } else {
        alert("Invalid or unsafe download link detected.");
      }
    } else {
      const activeAdUrl = getRandomAdUrl();
      try {
        const w = window.open(activeAdUrl, "_blank", "noopener,noreferrer");
        if (w) w.opener = null;
      } catch {
        /* noop */
      }
      setShowModal(true);
    }
  };

  const handleUnlockSuccess = () => {
    try {
      const key = `unlocked_${btoa(downloadLink)}`;
      sessionStorage.setItem(key, "true");
    } catch {
      /* noop */
    }
    setIsUnlocked(true);
    if (isSafeUrl(downloadLink)) {
      try {
        const w = window.open(downloadLink, "_blank", "noopener,noreferrer");
        if (w) w.opener = null;
      } catch {
        /* noop */
      }
    }
  };

  const buttonClass = className ?? (
    variant === "telegram"
      ? "inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm shadow-[0_4px_15px_rgba(6,182,212,0.35)] hover:opacity-95 transition cursor-pointer"
      : "inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:opacity-95 transition cursor-pointer"
  );

  return (
    <>
      <button
        onClick={handleDownloadClick}
        className={buttonClass}
      >
        {isUnlocked ? (
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isUnlocked ? "Download Now" : label}
      </button>

      {showModal && (
        <DownloadCountdownModal
          downloadLink={downloadLink}
          onClose={() => setShowModal(false)}
          onUnlockSuccess={handleUnlockSuccess}
        />
      )}
    </>
  );
}
