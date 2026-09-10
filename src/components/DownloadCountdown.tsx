import React, { useEffect, useRef, useState, useCallback } from "react";
import { Download, Lock, AlertTriangle, CheckCircle2, Loader2, Send, ExternalLink } from "lucide-react";
import { supabase, logDownload } from "@/integrations/supabase/client";

const MONETAG_URL = "https://acorntar.com/fncjyve9?key=a347a729277e7dcc5e07924adff80652";
const ADSTERRA_URL = "https://acorntar.com/b795sywmp?key=20b07ce2b76b7238eae7acf49dd3a534";

const REQUIRED_AD_SECONDS = 5;
const SILENT_RELOCK_MS = 10000;

const getRandomAdUrl = () => (Math.random() < 0.5 ? MONETAG_URL : ADSTERRA_URL);

// 🟢 Trusted Domains Whitelist
const ALLOWED_HOSTS = ["supabase.co", "t.me", "telegram.me", "telegram.dog"];

const isAllowedHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof window === "undefined") return false;
  try {
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith("/")) return true;
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return parsed.origin === window.location.origin || isAllowedHost(parsed.hostname);
  } catch {
    return false;
  }
}

// 🚀 Fast Native Download Function (Duplicate Query Params නැතිව)
function triggerFastNativeDownload(rawUrl: string, title?: string) {
  try {
    const fullUrl = rawUrl.trim();
    const urlObj = new URL(fullUrl);
    const extMatch = urlObj.pathname.match(/\.(zip|rar|7z|srt|sub|ass)$/i);
    const extension = extMatch ? extMatch[1].toLowerCase() : "zip";

    const rawTitle = title || "Subtitle";
    const invalidChars = ["\\", "/", ":", "*", "?", '"', "<", ">", "|"];
    const safeTitle =
      rawTitle
        .split("")
        .filter((char) => !invalidChars.includes(char))
        .join("")
        .trim() || "Subtitle";

    const fileName = `${safeTitle} Sinhala Sub - PixelPopLK.${extension}`;

    // Supabase storage URL එකක් නම් පමණක් ?download=fileName attach කිරීම
    if (urlObj.hostname.endsWith("supabase.co")) {
      urlObj.searchParams.set("download", fileName);
    }

    const downloadUrl = urlObj.toString();
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.setAttribute("download", fileName);
    a.setAttribute("target", "_self");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    window.location.href = rawUrl.trim();
  }
}

interface DownloadButtonProps {
  subtitleId?: string | number;
  title?: string;
  label?: string;
  className?: string;
  variant?: "primary" | "direct" | "telegram";
}

type ButtonState = "locked" | "verifying" | "paused" | "ready" | "downloading";

export function DownloadButton({
  subtitleId,
  title,
  label = "Direct Download (.zip)",
  className,
  variant = "primary",
}: DownloadButtonProps) {
  const normalizedVariant = variant === "telegram" ? "telegram" : "direct";
  const subId = subtitleId || "default";

  // 🟢 Storage Keys - Direct සහ Telegram වෙන වෙනම පාලනය වේ
  const timeStorageKey = `pxl_timer_${subId}_${normalizedVariant}`;
  const lockExpiryKey = `pxl_relock_${subId}_${normalizedVariant}`;

  const [state, setState] = useState<ButtonState>("locked");
  const [remainingSec, setRemainingSec] = useState<number>(REQUIRED_AD_SECONDS);
  const [downloadLink, setDownloadLink] = useState<string>("");

  const reLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🟢 Database එකෙන් Link එක ලබාගැනීම (RPC + Direct Table Fallback)
  const fetchLink = useCallback(async (): Promise<string | null> => {
    if (!subtitleId) return null;
    try {
      // 1. මුලින් RPC එකෙන් උත්සාහ කිරීම
      const { data, error } = await supabase.rpc("get_single_download_link", {
        target_id: Number(subtitleId),
      });
      if (!error && data) {
        const link = normalizedVariant === "telegram" ? data.telegram_link : data.download_link;
        if (link) return link;
      }

      // 2. RPC එක fail වුණොත් කෙලින්ම Table එකෙන් Fetch කරන Fallback එක
      const { data: directData } = await supabase
        .from("subtitles")
        .select("download_link, telegram_link")
        .eq("id", Number(subtitleId))
        .maybeSingle();

      if (directData) {
        return normalizedVariant === "telegram" ? directData.telegram_link : directData.download_link;
      }
    } catch {
      /* noop */
    }
    return null;
  }, [subtitleId, normalizedVariant]);

  // Lock තත්ත්වයට පත් කිරීම
  const resetToLocked = useCallback(() => {
    setState("locked");
    setRemainingSec(REQUIRED_AD_SECONDS);
    setDownloadLink("");
    try {
      localStorage.removeItem(timeStorageKey);
      localStorage.removeItem(lockExpiryKey);
    } catch {
      /* noop */
    }
  }, [timeStorageKey, lockExpiryKey]);

  // Download වූ පසු තත්පර 10කින් Auto-Lock කිරීම
  const scheduleSilentRelock = useCallback(() => {
    const expireAt = Date.now() + SILENT_RELOCK_MS;
    try {
      localStorage.setItem(lockExpiryKey, String(expireAt));
    } catch {
      /* noop */
    }

    if (reLockTimerRef.current) clearTimeout(reLockTimerRef.current);
    reLockTimerRef.current = setTimeout(() => {
      resetToLocked();
    }, SILENT_RELOCK_MS);
  }, [lockExpiryKey, resetToLocked]);

  // 🟢 සැබෑ ඔරලෝසු වේලාව අනුව තත්පර 5 සම්පූර්ණදැයි බලන ප්‍රධාන Function එක
  const verifyAdTime = useCallback(async () => {
    try {
      // 1. දැනටමත් 10-sec re-lock එකක් ක්‍රියාත්මකදැයි බැලීම
      const expireAtStr = localStorage.getItem(lockExpiryKey);
      if (expireAtStr) {
        const expireAt = parseInt(expireAtStr, 10);
        if (Date.now() >= expireAt) {
          resetToLocked();
          return;
        }
      }

      // 2. Ad එක ආරම්භ කළ Timestamp එක බැලීම
      const startTimeStr = localStorage.getItem(timeStorageKey);
      if (!startTimeStr) return;

      const startTime = parseInt(startTimeStr, 10);
      const elapsedMs = Date.now() - startTime;

      // 🚀 තත්පර 5 හෝ ඊට වැඩි කාලයක් ගතවී ඇත්නම් ➔ අනිවාර්යයෙන්ම කොළ පාට (READY) වේ!
      if (elapsedMs >= REQUIRED_AD_SECONDS * 1000) {
        setState("ready");

        // Link එක background එකෙන් ready කරගැනීම
        const link = await fetchLink();
        if (link && isSafeUrl(link)) {
          setDownloadLink(link);
        }
      } else {
        // තත්පර 5ට කලින් ආවොත් ➔ PAUSED (ඉතිරි තත්පර ගණන පෙන්වයි)
        const leftSec = Math.max(1, Math.ceil((REQUIRED_AD_SECONDS * 1000 - elapsedMs) / 1000));
        setRemainingSec(leftSec);
        setState("paused");
      }
    } catch {
      /* noop */
    }
  }, [timeStorageKey, lockExpiryKey, fetchLink, resetToLocked]);

  // Page Load වෙද්දී සහ User නැවත Tab එකට එද්දී පරීක්ෂා කිරීම
  useEffect(() => {
    verifyAdTime();

    const handleActive = () => {
      verifyAdTime();
    };

    document.addEventListener("visibilitychange", handleActive);
    window.addEventListener("focus", handleActive);
    window.addEventListener("pageshow", handleActive); // Mobile Back button සඳහා

    return () => {
      document.removeEventListener("visibilitychange", handleActive);
      window.removeEventListener("focus", handleActive);
      window.removeEventListener("pageshow", handleActive);
      if (reLockTimerRef.current) clearTimeout(reLockTimerRef.current);
    };
  }, [verifyAdTime]);

  // Button Click Logic
  const handleButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. LOCKED අවස්ථාවේදී: අලුතින් Ad එක Open කර Timestamp එක Save කිරීම
    if (state === "locked") {
      try {
        localStorage.setItem(timeStorageKey, String(Date.now()));
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
      return;
    }

    // 2. PAUSED අවස්ථාවේදී: ඉතිරි කාලය සම්පූර්ණ කිරීමට නැවත Ad එක Open කිරීම
    if (state === "paused" || state === "verifying") {
      // ඉතිරි කාලයට සරිලන සේ start time එක adjust කිරීම
      const adjustedStartTime = Date.now() - (REQUIRED_AD_SECONDS - remainingSec) * 1000;
      try {
        localStorage.setItem(timeStorageKey, String(adjustedStartTime));
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
      return;
    }

    // 3. READY (කොළ පාට) අවස්ථාවේදී: ක්ෂණික Direct Download
    if (state === "ready") {
      let finalUrl = downloadLink;

      if (!finalUrl) {
        setState("downloading");
        finalUrl = await fetchLink() || "";
      }

      if (finalUrl && isSafeUrl(finalUrl)) {
        setState("downloading");

        if (normalizedVariant === "telegram") {
          window.open(finalUrl.trim(), "_blank", "noopener");
        } else {
          triggerFastNativeDownload(finalUrl, title);
        }

        logDownload(subtitleId, normalizedVariant);

        // Download වූ සැණින් තත්පර 10ක Re-lock එක ආරම්භ කිරීම
        scheduleSilentRelock();

        setTimeout(() => {
          setState("ready");
        }, 1500);
      } else {
        alert("Download link එක ලබාගැනීමේ දෝෂයක් ඇත. කරුණාකර නැවත උත්සාහ කරන්න.");
        resetToLocked();
      }
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case "locked":
        return (
          <>
            <Lock className="w-4 h-4" />
            <span>{normalizedVariant === "telegram" ? "🔓 Unlock Telegram Subtitle" : `🔓 Unlock ${label}`}</span>
          </>
        );

      case "verifying":
        return (
          <>
            <ExternalLink className="w-4 h-4 animate-bounce" />
            <span>Ad Opened... Stay 5s & Return</span>
          </>
        );

      case "paused":
        return (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{`⚠️ Paused! (${remainingSec}s left) - Click to Resume`}</span>
          </>
        );

      case "ready":
        return (
          <>
            {normalizedVariant === "telegram" ? <Send className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span className="font-extrabold">
              {normalizedVariant === "telegram" ? "Open Telegram Subtitle" : "Download Now (.zip)"}
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
    const base = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm transition-all duration-300 cursor-pointer shadow-lg active:scale-95";

    switch (state) {
      case "locked":
        return normalizedVariant === "telegram"
          ? `${base} bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_15px_rgba(14,165,233,0.35)] hover:opacity-95`
          : `${base} bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95`;

      case "verifying":
        return `${base} bg-indigo-600 text-white animate-pulse border border-indigo-400/30`;

      case "paused":
        return `${base} bg-gradient-to-r from-amber-600 to-orange-600 text-white border border-amber-400/40 shadow-[0_4px_15px_rgba(245,158,11,0.35)]`;

      case "ready":
      case "downloading":
        return `${base} bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.45)]`;
    }
  };

  return (
    <button
      type="button"
      data-no-ad="true"
      data-download="true"
      onClick={handleButtonClick}
      className={className ? `${className} ${getButtonClass()}` : getButtonClass()}
    >
      {getButtonContent()}
    </button>
  );
}
