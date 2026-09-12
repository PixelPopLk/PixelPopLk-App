import React, { useRef, useState } from "react";
import { X, Download, Share2, Check, MessageCircle, Send, Sparkles, Star, Film, Tv } from "lucide-react";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  year?: string | number;
  rating?: string | number | null;
  posterUrl?: string;
  genres?: string[];
  kind?: "movie" | "series";
  url?: string;
}

export function ShareCardModal({
  isOpen,
  onClose,
  title,
  year,
  rating,
  posterUrl,
  genres = [],
  kind = "movie",
  url = typeof window !== "undefined" ? window.location.href : "https://pixelpoplk.pages.dev",
}: ShareCardModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareText = `${title}${year ? ` (${year})` : ""} Sinhala Subtitle | PixelPopLK`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  // 🎨 Generates and downloads a high-res 1200x630 PNG card using Canvas
  const handleDownloadImage = async () => {
    setDownloading(true);

    try {
      const canvas = canvasRef.current || document.createElement("canvas");
      const width = 1200;
      const height = 630;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Background Gradient (Dark Luxury Slate)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "#0e0e14");
      bgGrad.addColorStop(0.5, "#14141f");
      bgGrad.addColorStop(1, "#0a0a10");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Glow behind poster
      const glowGrad = ctx.createRadialGradient(250, 315, 50, 250, 315, 300);
      glowGrad.addColorStop(0, "rgba(239, 68, 68, 0.25)");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 600, height);

      // 3. Top Accent Border
      const topGrad = ctx.createLinearGradient(0, 0, width, 0);
      topGrad.addColorStop(0, "#ef4444");
      topGrad.addColorStop(0.5, "#f59e0b");
      topGrad.addColorStop(1, "#ef4444");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, 6);

      // Helper function to load images with CORS
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      // 4. Draw Poster on Left
      const posterX = 70;
      const posterY = 65;
      const posterW = 340;
      const posterH = 500;

      if (posterUrl) {
        try {
          const posterImg = await loadImage(posterUrl);
          // Rounded rect clip for poster
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(posterX, posterY, posterW, posterH, 24);
          ctx.clip();
          ctx.drawImage(posterImg, posterX, posterY, posterW, posterH);
          ctx.restore();

          // Border for poster
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 3;
          ctx.stroke();
        } catch {
          // Poster load fallback
          ctx.fillStyle = "#1e1e2d";
          ctx.roundRect(posterX, posterY, posterW, posterH, 24);
          ctx.fill();
        }
      }

      // 5. Right Content Area
      const contentX = 460;

      // Brand Title
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("PIXELPOPLK  •  OFFICIAL SINHALA SUBTITLES", contentX, 105);

      // Movie Title (Wrapped if long)
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      
      const words = title.split(" ");
      let line = "";
      let currentY = 175;
      for (const word of words) {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 680 && line !== "") {
          ctx.fillText(line.trim(), contentX, currentY);
          line = word + " ";
          currentY += 56;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), contentX, currentY);

      // Meta row: Year, Rating, Kind
      currentY += 50;
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const yearStr = year ? `📅 ${year}   ` : "";
      const ratingStr = rating ? `⭐ ${rating}/10 IMDb   ` : "";
      const kindStr = kind === "series" ? "📺 TV Series" : "🎬 Movie";
      ctx.fillText(`${yearStr}${ratingStr}${kindStr}`, contentX, currentY);

      // Badges: Sinhala Subtitle Banner
      currentY += 55;
      ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(contentX, currentY, 680, 80, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("🇱🇰  සිංහල උපසිරැසි (Sinhala Subtitles)", contentX + 24, currentY + 48);

      // Footer: Direct Download tag and URL
      currentY += 135;
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("⚡ Fast Direct .ZIP Download Available", contentX, currentY);

      ctx.fillStyle = "#71717a";
      ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("https://pixelpoplk.pages.dev", contentX, currentY + 34);

      // Trigger download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${title} Sinhala Subtitle - PixelPopLK.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Canvas export error:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      data-no-ad="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Top glow accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-primary" />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Social Media Share Card</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          Share <span className="text-gradient">{title}</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-5">
          Download the branded image card or share directly to WhatsApp & Telegram.
        </p>

        {/* Card Preview Box (1200x630 aspect ratio preview) */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-[#12121c] via-[#161626] to-[#0a0a10] p-4 sm:p-6 shadow-inner flex gap-4">
          {/* Poster */}
          <div className="relative aspect-[2/3] h-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0 bg-muted">
            {posterUrl ? (
              <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted-foreground">
                <Film className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
            <div>
              <span className="text-[10px] font-bold text-red-500 tracking-wider uppercase">
                PixelPopLK Official Sub
              </span>
              <h4 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5">
                {title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                {year && <span>{year}</span>}
                {rating && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3 h-3 fill-amber-400" /> {rating}
                  </span>
                )}
                <span>{kind === "series" ? "TV Series" : "Movie"}</span>
              </div>
            </div>

            {/* Sinhala badge */}
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1.5 text-[11px] font-bold text-white flex items-center gap-1.5">
              <span>🇱🇰 සිංහල උපසිරැසි (.ZIP)</span>
            </div>

            <span className="text-[9px] text-zinc-500 font-mono truncate">
              pixelpoplk.pages.dev
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          {/* Download PNG Button */}
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-glow hover:opacity-95 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating Card..." : "Download Card (.png)"}
          </button>

          {/* WhatsApp Direct Share */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs sm:text-sm font-semibold transition"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>

          {/* Telegram Direct Share */}
          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 text-xs sm:text-sm font-semibold transition"
          >
            <Send className="w-4 h-4" />
            Telegram
          </a>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
