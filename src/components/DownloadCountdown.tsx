import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import {
  Download,
  Lock,
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
  Info,
} from "lucide-react";
import { logDownload } from "@/integrations/supabase/client";

const MONETAG_URL =
  "https://directyp.org/4/dc67dd9ce96dd9a20b59e14a01a6a093";
const ADSTERRA_URL =
  "https://asiafilm.org/4/20b07ce2b76b7238eae7acf49dd3a534";

const REQUIRED_AD_SECONDS = 5;
const RELOCK_DELAY_MS = 30 * 1000; // Download click කළ පසු නැවත Lock වීමට තත්පර 30ක්
const MAX_UNLOCK_VALIDITY_MS = 60 * 1000; // Unlock වූ පසු Download click කිරීමට තත්පර 60ක්
const MIN_AD_RETURN_MS = REQUIRED_AD_SECONDS * 1000;
const AD_POPUP_FALLBACK_MS = 8 * 1000;
const DOWNLOAD_STATUS_SECONDS = 10;

const getRandomAdUrl = () => (Math.random() < 0.5 ? MONETAG_URL : ADSTERRA_URL);

// 🟢 Safe URL Validator: ඕනෑම වලංගු HTTP / HTTPS link එකකට ඉඩ දීම
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof window === "undefined") return false;
  try {
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith("/")) return true;
    const parsed = new URL(cleanUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Chrome වල download එක browser එකටම handle කිරීමට දෙන්න. කලින් තිබූ fetch → Blob
// ක්‍රමය large files සඳහා memory භාවිතා කර, CORS/network request එක ප්‍රමාද වූ විට
// Chrome download එක ආරම්භ නොවන ලෙස පෙනෙන්නට හේතු විය.
function triggerBrowserDownload(rawUrl: string, title?: string) {
  const fullUrl = rawUrl.trim();
  const rawTitle = title || "Subtitle";
  const invalidChars = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];
  const safeTitle =
    rawTitle
      .split("")
      .filter((char) => !invalidChars.includes(char))
      .join("")
      .trim() || "Subtitle";

  try {
    const urlObj = new URL(fullUrl);
    const extMatch = urlObj.pathname.match(/\.(zip|rar|7z|srt|sub|ass)$/i);
    const extension = extMatch ? extMatch[1].toLowerCase() : "zip";
    const fileName = `${safeTitle} Sinhala Sub - PixelPopLK.${extension}`;

    // Cloud Hosters (Google Drive, Mediafire, Mega, Dropbox, PixelDrain) -> New Tab එකක open කිරීම
    const isCloudHost =
      /drive\.google\.com|mediafire\.com|mega\.nz|dropbox\.com|pixeldrain\.com|1drv\.ms/i.test(
        urlObj.hostname,
      );
    if (isCloudHost) {
      window.open(fullUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Supabase Storage Link නම් ?download=fileName එක් කිරීම
    if (urlObj.hostname.endsWith("supabase.co")) {
      urlObj.searchParams.set("download", fileName);
    }
    const downloadUrl = urlObj.toString();

    // මෙය click handler එක තුළ synchronousව run වන නිසා Chrome මෙය user-initiated
    // download එකක් ලෙස හඳුනාගනී. Supabase signed URL එකට download parameter එක
    // තිබෙන විට Content-Disposition header එක මඟින් filename එකත් ලැබේ.
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }
}

interface DownloadButtonProps {
  subtitleId?: string | number;
  title?: string;
  label?: string;
  className?: string;
  variant?: "primary" | "direct" | "telegram";
}

type ButtonState = "locked" | "awaiting-ad-return" | "verifying" | "ready" | "downloading";
type DownloadLinkResult = { link: string | null; error?: string };

export function DownloadButton({
  subtitleId,
  title,
  label,
  className,
  variant = "direct",
}: DownloadButtonProps) {
  const normalizedVariant = variant === "telegram" ? "telegram" : "direct";

  const autoId = useId().replace(/[^a-zA-Z0-9_-]/g, "_");
  const subId =
    subtitleId !== undefined &&
    subtitleId !== null &&
    String(subtitleId).trim() !== ""
      ? String(subtitleId).trim()
      : autoId;

  // 🟢 Title Slug එකක් මඟින් Buttons වෙන් කර ගැනීම
  const titleSlug = (title || "file")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 30);

  // 🟢 100% Isolated Storage Keys (Subtitle ID + Title + Variant)
  const timeStorageKey = `pxl_timer_${subId}_${titleSlug}_${normalizedVariant}`;
  const lockExpiryKey = `pxl_relock_${subId}_${titleSlug}_${normalizedVariant}`;
  const sessionTokenKey = `pxl_session_${subId}_${titleSlug}_${normalizedVariant}`;
  const adAttemptStorageKey = `pxl_ad_attempt_${subId}_${titleSlug}_${normalizedVariant}`;
  const adAwayStorageKey = `pxl_ad_away_${subId}_${titleSlug}_${normalizedVariant}`;

  const diagnosticIdRef = useRef<string | null>(null);
  const attemptStartedAtRef = useRef<number | null>(null);
  const sendDiagnostic = useCallback((event: string, stage: string, outcome: "info" | "success" | "failure", extra: Record<string, unknown> = {}) => {
    const diagnosticId = diagnosticIdRef.current;
    if (!diagnosticId || !subtitleId) return;
    const ua = navigator.userAgent;
    const browserFamily = /SamsungBrowser/i.test(ua) ? "samsung" : /Edg\//i.test(ua) ? "edge" : /Firefox\//i.test(ua) ? "firefox" : /Chrome\//i.test(ua) ? "chrome" : /Safari\//i.test(ua) ? "safari" : "other";
    const browserContext = /Telegram/i.test(ua) ? "telegram" : /FBAN|FBAV/i.test(ua) ? "facebook" : /Instagram/i.test(ua) ? "instagram" : "browser";
    void fetch("/api/download-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        action: "diagnostic", diagnosticId, subtitleId: Number(subtitleId), variant: normalizedVariant,
        diagnostic: { diagnosticId, event, stage, outcome, subtitleId: Number(subtitleId), variant: normalizedVariant, browserFamily, browserContext, ...extra },
      }),
    }).catch(() => { /* diagnostics are best-effort */ });
  }, [subtitleId, normalizedVariant]);

  const [state, setState] = useState<ButtonState>("locked");
  const [remainingSec, setRemainingSec] = useState<number>(REQUIRED_AD_SECONDS);
  const [downloadLink, setDownloadLink] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [adWarning, setAdWarning] = useState<string>("");
  const [downloadStatusRemaining, setDownloadStatusRemaining] = useState<number>(DOWNLOAD_STATUS_SECONDS);

  const reLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adAttemptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadStatusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAdAttemptRef = useRef(false);
  const adAttemptAtRef = useRef<number | null>(null);
  const adAwayAtRef = useRef<number | null>(null);
  const returnedAfterAdMsRef = useRef<number | null>(null);
  const pendingSessionRef = useRef<{ startedAt: number; sessionToken: string } | null>(null);
  const verifyInFlightRef = useRef(false);
  const claimInFlightRef = useRef(false);

  // Link එක public Supabase client එකෙන් නොගෙන, server endpoint එකෙන් පමණක් ගනී.
  // Service-role key එක browser bundle එකට යන්නේ නැත.
  const fetchLink = useCallback(async (sessionToken: string): Promise<DownloadLinkResult> => {
    if (!subtitleId) return { link: null };
    try {
      const response = await fetch("/api/download-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          subtitleId: Number(subtitleId),
          variant: normalizedVariant,
          sessionToken,
          diagnosticId: diagnosticIdRef.current,
        }),
      });

      const data = (await response.json()) as {
        link?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        sendDiagnostic("claim_failed", "claim", "failure", { httpStatus: response.status, errorCode: response.status === 403 ? "session_invalid" : response.status === 429 ? "rate_limited" : "claim_failed" });
        return {
          link: null,
          error:
            typeof data.error === "string"
              ? data.error
              : "Download service එක තාවකාලිකව සූදානම් නැහැ.",
        };
      }
      if (typeof data.link === "string" && data.link.trim()) {
        sendDiagnostic("claim_success", "claim", "success", { httpStatus: response.status });
        return { link: data.link.trim() };
      }
    } catch {
      /* noop */
    }
    return { link: null };
  }, [subtitleId, normalizedVariant, sendDiagnostic]);

  // Lock තත්ත්වයට reset කිරීම
  const resetToLocked = useCallback(() => {
    setState("locked");
    setRemainingSec(REQUIRED_AD_SECONDS);
    setDownloadLink("");
    setDownloadStatusRemaining(DOWNLOAD_STATUS_SECONDS);
    if (downloadStatusTimerRef.current) {
      clearInterval(downloadStatusTimerRef.current);
      downloadStatusTimerRef.current = null;
    }
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (reLockTimerRef.current) {
      clearTimeout(reLockTimerRef.current);
      reLockTimerRef.current = null;
    }
    if (validityTimerRef.current) {
      clearTimeout(validityTimerRef.current);
      validityTimerRef.current = null;
    }
    if (adAttemptTimeoutRef.current) {
      clearTimeout(adAttemptTimeoutRef.current);
      adAttemptTimeoutRef.current = null;
    }
    pendingAdAttemptRef.current = false;
    adAttemptAtRef.current = null;
    adAwayAtRef.current = null;
    returnedAfterAdMsRef.current = null;
    pendingSessionRef.current = null;
    try {
      localStorage.removeItem(timeStorageKey);
      localStorage.removeItem(lockExpiryKey);
      localStorage.removeItem(sessionTokenKey);
      localStorage.removeItem(adAttemptStorageKey);
      localStorage.removeItem(adAwayStorageKey);
    } catch {
      /* noop */
    }
  }, [timeStorageKey, lockExpiryKey, sessionTokenKey, adAttemptStorageKey, adAwayStorageKey]);

  // Live Ticker
  const startLiveCountdown = useCallback(
    (startTime: number, sessionToken: string) => {
      if (tickerRef.current) clearInterval(tickerRef.current);

      const tick = () => {
        const elapsedMs = Date.now() - startTime;
        const leftSec = Math.max(
          0,
          Math.ceil((REQUIRED_AD_SECONDS * 1000 - elapsedMs) / 1000),
        );
        setRemainingSec(leftSec);

        if (leftSec <= 0) {
          if (tickerRef.current) {
            clearInterval(tickerRef.current);
            tickerRef.current = null;
          }
          // A one-use server token must only be claimed once, even when focus,
          // visibilitychange and pageshow fire close together.
          if (claimInFlightRef.current) return;
          claimInFlightRef.current = true;

          void fetchLink(sessionToken)
            .then(({ link, error }) => {
              if (!link || !isSafeUrl(link)) {
                setErrorMsg(
                  error ||
                    "Download link එක සූදානම් කළ නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.",
                );
                resetToLocked();
                setTimeout(() => setErrorMsg(""), 6000);
                return;
              }

              try {
                localStorage.removeItem(timeStorageKey);
                localStorage.removeItem(sessionTokenKey);
                localStorage.removeItem(adAttemptStorageKey);
                localStorage.removeItem(adAwayStorageKey);
              } catch {
                /* noop */
              }

              setDownloadLink(link);
              setState("ready");
              if (validityTimerRef.current)
                clearTimeout(validityTimerRef.current);
              validityTimerRef.current = setTimeout(
                resetToLocked,
                MAX_UNLOCK_VALIDITY_MS,
              );
            })
            .finally(() => {
              claimInFlightRef.current = false;
            });
        }
      };

      tick();
      // If the user already spent five seconds away, tick() claims immediately.
      // Do not start a new interval after that immediate claim.
      if (Date.now() - startTime < REQUIRED_AD_SECONDS * 1000) {
        tickerRef.current = setInterval(tick, 300);
      }
    },
    [fetchLink, resetToLocked, timeStorageKey, sessionTokenKey, adAttemptStorageKey, adAwayStorageKey],
  );

  // Restore or verify an already accepted session. The refs prevent duplicate
  // focus/visibility events from claiming the same single-use server token.
  const verifyAdTime = useCallback(async () => {
    if (verifyInFlightRef.current || claimInFlightRef.current) return;
    verifyInFlightRef.current = true;

    try {
      const sessionToken = localStorage.getItem(sessionTokenKey);
      const expireAtStr = localStorage.getItem(lockExpiryKey);
      if (expireAtStr) {
        const expireAt = parseInt(expireAtStr, 10);
        const remaining = expireAt - Date.now();
        if (remaining <= 0) {
          resetToLocked();
          return;
        } else {
          if (reLockTimerRef.current) clearTimeout(reLockTimerRef.current);
          reLockTimerRef.current = setTimeout(() => {
            resetToLocked();
          }, remaining);
        }
      }

      const startTimeStr = localStorage.getItem(timeStorageKey);
      if (!startTimeStr || !sessionToken) return;

      const startTime = parseInt(startTimeStr, 10);
      const elapsedMs = Date.now() - startTime;

      if (!Number.isFinite(startTime) || elapsedMs < 0 || elapsedMs > MAX_UNLOCK_VALIDITY_MS) {
        resetToLocked();
        return;
      }

      if (elapsedMs >= REQUIRED_AD_SECONDS * 1000) {
        setState("verifying");
        claimInFlightRef.current = true;
        let result: DownloadLinkResult;
        try {
          result = await fetchLink(sessionToken);
        } finally {
          claimInFlightRef.current = false;
        }

        if (!result.link || !isSafeUrl(result.link)) {
          setErrorMsg(result.error || "Verification කල් ඉකුත් වී ඇත. නැවත උත්සාහ කරන්න.");
          resetToLocked();
          setTimeout(() => setErrorMsg(""), 6000);
          return;
        }

        // The server token is single-use. Remove it as soon as it succeeds so
        // later focus/pageshow events cannot accidentally claim it again.
        try {
          localStorage.removeItem(timeStorageKey);
          localStorage.removeItem(sessionTokenKey);
          localStorage.removeItem(adAttemptStorageKey);
          localStorage.removeItem(adAwayStorageKey);
        } catch {
          /* noop */
        }

        setDownloadLink(result.link);
        setState("ready");

        const remainingValidity = MAX_UNLOCK_VALIDITY_MS - elapsedMs;
        if (validityTimerRef.current) clearTimeout(validityTimerRef.current);
        validityTimerRef.current = setTimeout(() => {
          resetToLocked();
        }, remainingValidity);
      } else {
        setState("verifying");
        startLiveCountdown(startTime, sessionToken);
      }
    } catch {
      /* noop */
    } finally {
      verifyInFlightRef.current = false;
    }
  }, [
    lockExpiryKey,
    timeStorageKey,
    sessionTokenKey,
    adAttemptStorageKey,
    adAwayStorageKey,
    resetToLocked,
    fetchLink,
    startLiveCountdown,
  ]);

  const processAdReturn = useCallback(() => {
    if (!pendingAdAttemptRef.current || returnedAfterAdMsRef.current === null) return;
    const session = pendingSessionRef.current;
    if (!session) return;

    const awayMs = returnedAfterAdMsRef.current;
    sendDiagnostic("ad_return_detected", "return", awayMs >= MIN_AD_RETURN_MS ? "success" : "failure", { elapsedMs: Math.min(600000, Math.max(0, Math.round(awayMs))), errorCode: awayMs < MIN_AD_RETURN_MS ? "ad_wait_too_short" : undefined });
    pendingAdAttemptRef.current = false;
    pendingSessionRef.current = null;
    adAttemptAtRef.current = null;
    adAwayAtRef.current = null;
    returnedAfterAdMsRef.current = null;

    if (adAttemptTimeoutRef.current) {
      clearTimeout(adAttemptTimeoutRef.current);
      adAttemptTimeoutRef.current = null;
    }

    try {
      localStorage.removeItem(adAttemptStorageKey);
      localStorage.removeItem(adAwayStorageKey);
    } catch {
      /* noop */
    }

    if (awayMs < MIN_AD_RETURN_MS) {
      resetToLocked();
      setAdWarning("Ad එකේ තත්පර 5ක් රැඳී සිට නැවත Download ඔබන්න.");
      return;
    }

    setAdWarning("");
    setState("verifying");
    startLiveCountdown(session.startedAt, session.sessionToken);
  }, [adAttemptStorageKey, adAwayStorageKey, resetToLocked, startLiveCountdown, sendDiagnostic]);

  useEffect(() => {
    const markPageAway = () => {
      if (!pendingAdAttemptRef.current || adAwayAtRef.current !== null) return;
      if (document.visibilityState !== "hidden" && document.hasFocus()) return;

      const awayAt = Date.now();
      adAwayAtRef.current = awayAt;
      try {
        localStorage.setItem(adAwayStorageKey, String(awayAt));
      } catch {
        /* noop */
      }
    };

    const handlePageActive = () => {
      if (document.visibilityState === "hidden") return;

      if (pendingAdAttemptRef.current) {
        if (returnedAfterAdMsRef.current === null) {
          const awayAt = adAwayAtRef.current ?? adAttemptAtRef.current;
          returnedAfterAdMsRef.current = awayAt
            ? Math.max(0, Date.now() - awayAt)
            : 0;
        }
        processAdReturn();
        return;
      }

      void verifyAdTime();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markPageAway();
      } else {
        handlePageActive();
      }
    };

    // Recover a tab restored/reloaded while the user was away. Without a
    // recorded away timestamp, do not assume time spent on this site was ad time.
    const restorePendingAttempt = () => {
      let attemptAt: number | null = null;
      let awayAt: number | null = null;
      let sessionToken: string | null = null;
      let startTime: number | null = null;

      try {
        const attemptAtValue = localStorage.getItem(adAttemptStorageKey);
        const awayAtValue = localStorage.getItem(adAwayStorageKey);
        const startTimeValue = localStorage.getItem(timeStorageKey);
        attemptAt = attemptAtValue ? Number(attemptAtValue) : null;
        awayAt = awayAtValue ? Number(awayAtValue) : null;
        startTime = startTimeValue ? Number(startTimeValue) : null;
        sessionToken = localStorage.getItem(sessionTokenKey);
      } catch {
        /* noop */
      }

      if (attemptAt === null) {
        void verifyAdTime();
        return;
      }

      if (
        awayAt === null ||
        !Number.isFinite(awayAt) ||
        !sessionToken ||
        startTime === null ||
        !Number.isFinite(startTime)
      ) {
        resetToLocked();
        setAdWarning("Ad එකේ තත්පර 5ක් රැඳී සිට නැවත Download ඔබන්න.");
        return;
      }

      const awayMs = Date.now() - awayAt;
      if (awayMs < MIN_AD_RETURN_MS) {
        resetToLocked();
        setAdWarning("Ad එකේ තත්පර 5ක් රැඳී සිට නැවත Download ඔබන්න.");
        return;
      }

      try {
        localStorage.removeItem(adAttemptStorageKey);
        localStorage.removeItem(adAwayStorageKey);
      } catch {
        /* noop */
      }
      setAdWarning("");
      setState("verifying");
      startLiveCountdown(startTime, sessionToken);
    };

    restorePendingAttempt();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", markPageAway);
    window.addEventListener("focus", handlePageActive);
    window.addEventListener("pageshow", handlePageActive);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", markPageAway);
      window.removeEventListener("focus", handlePageActive);
      window.removeEventListener("pageshow", handlePageActive);
      if (reLockTimerRef.current) clearTimeout(reLockTimerRef.current);
      if (validityTimerRef.current) clearTimeout(validityTimerRef.current);
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (adAttemptTimeoutRef.current) clearTimeout(adAttemptTimeoutRef.current);
      if (downloadStatusTimerRef.current) clearInterval(downloadStatusTimerRef.current);
    };
  }, [
    adAttemptStorageKey,
    adAwayStorageKey,
    timeStorageKey,
    sessionTokenKey,
    processAdReturn,
    resetToLocked,
    startLiveCountdown,
    verifyAdTime,
  ]);

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (state === "locked") {
      setAdWarning("");
      setErrorMsg("");
      const attemptAt = Date.now();
      diagnosticIdRef.current = crypto.randomUUID();
      attemptStartedAtRef.current = attemptAt;
      sendDiagnostic("unlock_clicked", "client", "info");
      pendingAdAttemptRef.current = true;
      adAttemptAtRef.current = attemptAt;
      adAwayAtRef.current = null;
      returnedAfterAdMsRef.current = null;
      pendingSessionRef.current = null;

      try {
        localStorage.removeItem(timeStorageKey);
        localStorage.removeItem(sessionTokenKey);
        localStorage.removeItem(adAwayStorageKey);
        localStorage.setItem(adAttemptStorageKey, String(attemptAt));
      } catch {
        /* noop */
      }

      setState("awaiting-ad-return");
      const activeAdUrl = getRandomAdUrl();
      // Open a blank tab synchronously during the user gesture, then detach
      // it from this page before navigating to the ad URL. Using "noopener"
      // in the window.open features can return null even when the tab opened,
      // so it cannot be used to detect popup blocking.
      let adWindow: Window | null = null;
      try {
        adWindow = window.open("about:blank", "_blank");
        if (adWindow) {
          adWindow.opener = null;
          adWindow.location.href = activeAdUrl;
        }
      } catch {
        try {
          adWindow?.close();
        } catch {
          /* noop */
        }
        adWindow = null;
      }

      if (!adWindow) {
        sendDiagnostic("ad_popup_blocked", "popup", "failure", { errorCode: "popup_blocked" });
        resetToLocked();
        const inAppBrowser = /Telegram|FBAN|FBAV|Instagram|Line\//i.test(
          navigator.userAgent,
        );
        setAdWarning(
          inAppBrowser
            ? "Ad tab එක open වුණේ නැහැ. Telegram/Facebook menu එකෙන් Open in browser තෝරා නැවත උත්සාහ කරන්න."
            : "Ad tab එක open වුණේ නැහැ. Browser popup permission ලබාදී නැවත උත්සාහ කරන්න.",
        );
        return;
      }

      // If the browser blocks the new tab and this page never loses focus,
      // show the same short warning instead of leaving the button stuck.
      adAttemptTimeoutRef.current = setTimeout(() => {
        if (
          pendingAdAttemptRef.current &&
          returnedAfterAdMsRef.current === null &&
          adAwayAtRef.current === null &&
          document.visibilityState === "visible" &&
          document.hasFocus()
        ) {
          returnedAfterAdMsRef.current = 0;
          processAdReturn();
        }
      }, AD_POPUP_FALLBACK_MS);

      // The database starts its own five-second clock when this request arrives.
      // Only start the visible countdown after the user returns from the ad tab.
      try {
        const response = await fetch("/api/download-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            subtitleId: Number(subtitleId),
            variant: normalizedVariant,
            diagnosticId: diagnosticIdRef.current,
          }),
        });
        const data = (await response.json()) as { sessionToken?: unknown; error?: unknown };
        if (!response.ok || typeof data.sessionToken !== "string") {
          sendDiagnostic("start_failed", "start", "failure", { httpStatus: response.status, errorCode: "session_start_failed" });
          resetToLocked();
          setErrorMsg(typeof data.error === "string" ? data.error : "Verification ආරම්භ කළ නොහැක. නැවත උත්සාහ කරන්න.");
          setTimeout(() => setErrorMsg(""), 6000);
          return;
        }

        sendDiagnostic("start_success", "start", "success", { elapsedMs: attemptStartedAtRef.current === null ? undefined : Date.now() - attemptStartedAtRef.current });
        const sessionStartedAt = Date.now();
        localStorage.setItem(timeStorageKey, String(sessionStartedAt));
        localStorage.setItem(sessionTokenKey, data.sessionToken);
        pendingSessionRef.current = {
          startedAt: sessionStartedAt,
          sessionToken: data.sessionToken,
        };
        processAdReturn();
      } catch {
        sendDiagnostic("start_network_error", "start", "failure", { errorCode: "network_error" });
        resetToLocked();
        setErrorMsg("Verification සේවාවට සම්බන්ධ විය නොහැක. නැවත උත්සාහ කරන්න.");
        setTimeout(() => setErrorMsg(""), 6000);
      }
      return;
    }

    if (state === "awaiting-ad-return" || state === "verifying" || state === "downloading") {
      return;
    }

    if (state === "ready") {
      const finalUrl = downloadLink;

      if (finalUrl && isSafeUrl(finalUrl)) {
        // Stop the unlock-click deadline once the user has started the download.
        // Otherwise its old timeout can relock the button before the 30s delay.
        if (validityTimerRef.current) {
          clearTimeout(validityTimerRef.current);
          validityTimerRef.current = null;
        }
        setDownloadStatusRemaining(DOWNLOAD_STATUS_SECONDS);
        setState("downloading");

        // Trigger the actual browser/host download immediately, at the start of
        // the visible 10-second status countdown (not after the countdown).
        if (normalizedVariant === "telegram") {
          window.open(finalUrl.trim(), "_blank", "noopener,noreferrer");
        } else {
          triggerBrowserDownload(finalUrl, title);
        }

        sendDiagnostic("download_initiated", "download", "success");
        logDownload(subtitleId, normalizedVariant);

        if (downloadStatusTimerRef.current) clearInterval(downloadStatusTimerRef.current);
        downloadStatusTimerRef.current = setInterval(() => {
          setDownloadStatusRemaining((current) => {
            if (current <= 1) {
              if (downloadStatusTimerRef.current) {
                clearInterval(downloadStatusTimerRef.current);
                downloadStatusTimerRef.current = null;
              }
              return 0;
            }
            return current - 1;
          });
        }, 1000);

        // ⏱️ Download click කළ පසු තත්පර 30කින් නැවත Lock කිරීම
        const expireAt = Date.now() + RELOCK_DELAY_MS;
        try {
          localStorage.setItem(lockExpiryKey, String(expireAt));
        } catch {
          /* noop */
        }

        if (reLockTimerRef.current) clearTimeout(reLockTimerRef.current);
        reLockTimerRef.current = setTimeout(() => {
          resetToLocked();
        }, RELOCK_DELAY_MS);
      } else {
        setErrorMsg(
          "මෙම උපසිරැසිය සඳහා download link එකක් තවමත් එක් කර නොමැත. කරුණාකර සුළු වේලාවකින් නැවත උත්සාහ කරන්න.",
        );
        resetToLocked();
        setTimeout(() => setErrorMsg(""), 6000);
      }
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case "locked":
        return (
          <>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Lock className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
              <span className="text-sm font-extrabold leading-tight sm:text-base">
                {normalizedVariant === "telegram" ? "Unlock Video File" : "Unlock Sinhala Subtitles"}
              </span>
              <span className="text-[11px] font-medium leading-tight opacity-80">
                {normalizedVariant === "telegram" ? "Open video through Telegram" : "Download subtitle package (.ZIP)"}
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-bold ring-1 ring-white/15">UNLOCK</span>
          </>
        );

      case "awaiting-ad-return":
        return (
          <>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-sm font-extrabold">Waiting for ad return</span>
              <span className="text-[11px] font-medium opacity-80">
                Ad එකේ තත්පර 5ක් රැඳී සිටින්න
              </span>
            </span>
          </>
        );

      case "verifying":
        return (
          <>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-sm font-extrabold">Preparing your link</span>
              <span className="text-[11px] font-medium opacity-80">
                {remainingSec > 0 ? `Please wait ${remainingSec}s` : "Almost ready..."}
              </span>
            </span>
          </>
        );

      case "ready":
        return (
          <>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
              {normalizedVariant === "telegram" ? <Send className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
              <span className="text-sm font-extrabold leading-tight sm:text-base">
                {label || (normalizedVariant === "telegram" ? "Open Video in Telegram" : "Download Sinhala Subtitles")}
              </span>
              <span className="text-[11px] font-medium leading-tight opacity-80">Your link is ready</span>
            </span>
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          </>
        );

      case "downloading":
        return (
          <>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
              <CheckCircle2 className="h-5 w-5 animate-pulse" />
            </span>
            <span className="flex flex-1 flex-col items-start text-left">
              <span className="text-sm font-extrabold">{downloadStatusRemaining > 0 ? "Starting your download..." : "Download request sent"}</span>
              <span className="text-[11px] font-medium opacity-80">{downloadStatusRemaining > 0 ? `Please wait ${downloadStatusRemaining}s` : "Check your browser downloads"}</span>
            </span>
          </>
        );
    }
  };

  const getButtonClass = () => {
    const base = "group relative inline-flex min-h-[76px] w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left font-semibold transition-all duration-200 active:scale-[0.985] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
    switch (state) {
      case "locked":
        return normalizedVariant === "telegram"
          ? base + " border-sky-400/30 bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 text-white focus-visible:ring-sky-400"
          : base + " border-rose-400/30 bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 text-white focus-visible:ring-rose-400";
      case "awaiting-ad-return":
      case "verifying":
        return base + " border-indigo-300/30 bg-gradient-to-r from-indigo-600 to-violet-700 text-white focus-visible:ring-indigo-400";
      case "ready":
      case "downloading":
        return base + " border-emerald-300/30 bg-gradient-to-r from-emerald-600 to-teal-700 text-white focus-visible:ring-emerald-400";
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      <span className="flex items-center justify-center gap-1.5 px-2 text-center text-[11px] font-medium leading-relaxed text-muted-foreground/90 select-none sm:text-xs">
        <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
        Ad link එක open කර තත්පර 5ක් රැඳී සිට නැවත මෙම පිටුවට එන්න
      </span>

      <button
        type="button"
        data-no-ad="true"
        data-download="true"
        onClick={handleButtonClick}
        className={
          className ? `${className} ${getButtonClass()}` : getButtonClass()
        }
      >
        {getButtonContent()}
      </button>

      {adWarning && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-semibold text-amber-800 dark:text-amber-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{adWarning}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 text-xs font-semibold animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
