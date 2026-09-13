import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import { Download, Lock, CheckCircle2, Loader2, Send, AlertCircle, Info } from "lucide-react";
import { supabase, SUBTITLES_TABLE, logDownload } from "@/integrations/supabase/client";

const MONETAG_URL = "https://acorntar.com/fncjyve9?key=a347a729277e7dcc5e07924adff80652";
const ADSTERRA_URL = "https://acorntar.com/b795sywmp?key=20b07ce2b76b7238eae7acf49dd3a534";

const REQUIRED_AD_SECONDS = 5;
const RELOCK_DELAY_MS = 4000; // File එක download වූ පසු නැවත Lock වීමට ගතවන කාලය (තත්පර 8)
const MAX_UNLOCK_VALIDITY_MS = 20 * 1000; // 🟢 Unlock කර තත්පර 20ක් ඇතුළත download නොකළහොත් නැවත auto-lock වේ

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

// 🚀 Fast Native Download: Tab එක Redirect නොවී කෙලින්ම Device එකට Download කිරීම
async function triggerFastNativeDownload(rawUrl: string, title?: string) {
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
    const isCloudHost = /drive\.google\.com|mediafire\.com|mega\.nz|dropbox\.com|pixeldrain\.com|1drv\.ms/i.test(urlObj.hostname);
    if (isCloudHost) {
      window.open(fullUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Supabase Storage Link නම් ?download=fileName එක් කිරීම
    if (urlObj.hostname.endsWith("supabase.co")) {
      urlObj.searchParams.set("download", fileName);
    }
    const downloadUrl = urlObj.toString();

    // 1. Blob Download ක්‍රමය (Page navigation එක සම්පූර්ණයෙන්ම වළක්වයි)
    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      }
    } catch {
      // CORS Error ආවොත් Fallback Anchor එකට යයි
    }

    // 2. Fallback Anchor Download
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.setAttribute("download", fileName);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
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

type ButtonState = "locked" | "verifying" | "ready" | "downloading";

export function DownloadButton({
  subtitleId,
  title,
  label,
  className,
  variant = "direct",
}: DownloadButtonProps) {
  const normalizedVariant = variant === "telegram" ? "telegram" : "direct";
  
  const autoId = useId().replace(/[^a-zA-Z0-9_-]/g, "_");
  const subId = subtitleId !== undefined && subtitleId !== null && String(subtitleId).trim() !== ""
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

  const [state, setState] = useState<ButtonState>("locked");
  const [remainingSec, setRemainingSec] = useState<number>(REQUIRED_AD_SECONDS);
  const [downloadLink, setDownloadLink] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const reLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🟢 Database එකෙන් Link එක ලබාගැනීම
  const fetchLink = useCallback(async (): Promise<string | null> => {
    if (!subtitleId) return null;
    try {
      const { data, error } = await supabase.rpc("get_single_download_link", {
        target_id: Number(subtitleId),
      });
      if (!error && data) {
        const item = Array.isArray(data) ? data[0] : data;
        const link = normalizedVariant === "telegram" ? item?.telegram_link : item?.download_link;
        if (link) return String(link).trim();
      }

      const { data: directData } = await supabase
        .from(SUBTITLES_TABLE)
        .select("download_link, telegram_link")
        .eq("id", Number(subtitleId))
        .maybeSingle();

      if (directData) {
        const link = normalizedVariant === "telegram" ? directData.telegram_link : directData.download_link;
        if (link) return String(link).trim();
      }
    } catch {
      /* noop */
    }
    return null;
  }, [subtitleId, normalizedVariant]);

  // Lock තත්ත්වයට reset කිරීම
  const resetToLocked = useCallback(() => {
    setState("locked");
    setRemainingSec(REQUIRED_AD_SECONDS);
    setDownloadLink("");
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
    try {
      localStorage.removeItem(timeStorageKey);
      localStorage.removeItem(lockExpiryKey);
    } catch {
      /* noop */
    }
  }, [timeStorageKey, lockExpiryKey]);

  // Live Ticker
  const startLiveCountdown = useCallback((startTime: number) => {
    if (tickerRef.current) clearInterval(tickerRef.current);

    fetchLink().then((link) => {
      if (link && isSafeUrl(link)) {
        setDownloadLink(link);
      }
    });

    const tick = () => {
      const elapsedMs = Date.now() - startTime;
      const leftSec = Math.max(0, Math.ceil((REQUIRED_AD_SECONDS * 1000 - elapsedMs) / 1000));
      setRemainingSec(leftSec);

      if (leftSec <= 0) {
        if (tickerRef.current) clearInterval(tickerRef.current);
        setState("ready");

        // ⏱️ Unlocked වූ පසු තත්පර 20ක Validity Timer එකක් ක්‍රියාත්මක වීම
        if (validityTimerRef.current) clearTimeout(validityTimerRef.current);
        validityTimerRef.current = setTimeout(() => {
          resetToLocked();
        }, MAX_UNLOCK_VALIDITY_MS);
      }
    };

    tick();
    tickerRef.current = setInterval(tick, 300);
  }, [fetchLink, resetToLocked]);

  // Ad Time Verify කිරීම
  const verifyAdTime = useCallback(async () => {
    try {
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
      if (!startTimeStr) return;

      const startTime = parseInt(startTimeStr, 10);
      const elapsedMs = Date.now() - startTime;

      // ⏱️ තත්පර 20කට වඩා පරණ නම් නැවත Lock කිරීම
      if (elapsedMs > MAX_UNLOCK_VALIDITY_MS) {
        resetToLocked();
        return;
      }

      if (elapsedMs >= REQUIRED_AD_SECONDS * 1000) {
        setState("ready");
        const link = await fetchLink();
        if (link && isSafeUrl(link)) {
          setDownloadLink(link);
        }

        // ඉතිරිව ඇති තත්පර ගණනට validity timer එක සැකසීම
        const remainingValidity = MAX_UNLOCK_VALIDITY_MS - elapsedMs;
        if (validityTimerRef.current) clearTimeout(validityTimerRef.current);
        validityTimerRef.current = setTimeout(() => {
          resetToLocked();
        }, remainingValidity);
      } else {
        setState("verifying");
        startLiveCountdown(startTime);
      }
    } catch {
      /* noop */
    }
  }, [lockExpiryKey, timeStorageKey, resetToLocked, fetchLink, startLiveCountdown]);

  useEffect(() => {
    verifyAdTime();

    const handleActive = () => {
      verifyAdTime();
    };

    document.addEventListener("visibilitychange", handleActive);
    window.addEventListener("focus", handleActive);
    window.addEventListener("pageshow", handleActive);

    return () => {
      document.removeEventListener("visibilitychange", handleActive);
      window.removeEventListener("focus", handleActive);
      window.removeEventListener("pageshow", handleActive);
      if (reLockTimerRef.current) clearTimeout(reLockTimerRef.current);
      if (validityTimerRef.current) clearTimeout(validityTimerRef.current);
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [verifyAdTime]);

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (state === "locked") {
      const now = Date.now();
      try {
        localStorage.setItem(timeStorageKey, String(now));
      } catch {
        /* noop */
      }

      const activeAdUrl = getRandomAdUrl();
      try {
        const w = window.open(activeAdUrl, "_blank", "noopener");
        if (w) w.opener = null;
      } catch {
        /* noop */
      }

      setState("verifying");
      startLiveCountdown(now);
      return;
    }

    if (state === "verifying" || state === "downloading") {
      return;
    }

    if (state === "ready") {
      let finalUrl = downloadLink;

      if (!finalUrl) {
        setState("downloading");
        finalUrl = (await fetchLink()) || "";
      }

      if (finalUrl && isSafeUrl(finalUrl)) {
        setState("downloading");

        if (normalizedVariant === "telegram") {
          window.open(finalUrl.trim(), "_blank", "noopener,noreferrer");
        } else {
          await triggerFastNativeDownload(finalUrl, title);
        }

        logDownload(subtitleId, normalizedVariant);

        // ⏱️ File එක download වී තත්පර 8කින් නැවත Lock කිරීම
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
        setErrorMsg("මෙම උපසිරැසිය සඳහා download link එකක් තවමත් එක් කර නොමැත. කරුණාකර සුළු වේලාවකින් නැවත උත්සාහ කරන්න.");
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
            <Lock className="w-4 h-4" />
            <span>
              {normalizedVariant === "telegram"
                ? "🔓 Unlock Video File (Telegram)"
                : "🔓 Unlock Sinhala Subtitle (.zip)"}
            </span>
          </>
        );

      case "verifying":
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>{remainingSec > 0 ? `⏳ Unlocking... ${remainingSec}s` : "Preparing Link..."}</span>
          </>
        );

      case "ready":
        return (
          <>
            {normalizedVariant === "telegram" ? <Send className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span className="font-extrabold">
              {label || (normalizedVariant === "telegram" ? "Get Video File (Telegram)" : "Download Subtitle (.zip)")}
            </span>
          </>
        );

      case "downloading":
        return (
          <>
            <CheckCircle2 className="w-4 h-4 text-white animate-pulse" />
            <span>Starting Download...</span>
          </>
        );
    }
  };

  const getButtonClass = () => {
    const base = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm transition-all duration-300 cursor-pointer shadow-lg active:scale-95 select-none";

    switch (state) {
      case "locked":
        return normalizedVariant === "telegram"
          ? `${base} bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_15px_rgba(14,165,233,0.35)] hover:opacity-95`
          : `${base} bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95`;

      case "verifying":
        return `${base} bg-indigo-600 text-white animate-pulse border border-indigo-400/30`;

      case "ready":
      case "downloading":
        return `${base} bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.45)] hover:scale-105`;
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <span className="text-[11px] sm:text-xs text-muted-foreground/90 font-medium flex items-center justify-center gap-1.5 px-2 py-0.5 text-center select-none">
        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
        Unlock ක්ලික් කර තත්පර 5ක් රැඳී සිට නැවත මෙහි එන්න (Back වෙන්න)
      </span>

      <button
        type="button"
        data-no-ad="true"
        data-download="true"
        onClick={handleButtonClick}
        className={className ? `${className} ${getButtonClass()}` : getButtonClass()}
      >
        {getButtonContent()}
      </button>

      {errorMsg && (
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 text-xs font-semibold animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
