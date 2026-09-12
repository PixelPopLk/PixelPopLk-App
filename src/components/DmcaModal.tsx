import React, { useState } from "react";
import { ShieldCheck, X, AlertCircle, Send, CheckCircle2, FileText } from "lucide-react";

interface DmcaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialTitle?: string;
}

export function DmcaModal({
  isOpen,
  onClose,
  initialUrl = typeof window !== "undefined" ? window.location.href : "",
  initialTitle = "",
}: DmcaModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState(initialUrl);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prepares mailto with full DMCA notice format
    const subject = encodeURIComponent(`DMCA Takedown Notice — ${initialTitle || url}`);
    const body = encodeURIComponent(
      `DMCA Takedown Notice / Copyright Infringement Notice\n\n` +
      `Rights Holder / Claimant Name: ${name}\n` +
      `Contact Email: ${email}\n` +
      `Infringing URL: ${url}\n\n` +
      `Details of copyrighted work & claim:\n${details}\n\n` +
      `Statement of Authority:\nI state under penalty of perjury that I am the copyright owner or authorized to act on behalf of the copyright owner.`
    );

    window.location.href = `mailto:dmca@pixelpoplk.pages.dev?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 3500);
  };

  return (
    <div
      data-no-ad="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden my-6">
        {/* Top shield strip */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary" />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Legal & Copyright Policy</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
          DMCA & Copyright Compliance
        </h3>

        {/* Legal Disclaimer Box */}
        <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            <strong className="text-foreground">1. No Media Hosting:</strong> PixelPopLK does <u>not</u> host, upload, or store any copyrighted video, movie, or audio files on our servers or Cloudflare infrastructure.
          </p>
          <p>
            <strong className="text-foreground">2. Fan Subtitles Only:</strong> All subtitles provided are fan-translated text files (.srt/.zip) created by voluntary translators for educational, accessibility, and personal use.
          </p>
          <p>
            <strong className="text-foreground">3. Third-Party Links:</strong> Any external links (such as Telegram) point to third-party services not owned, operated, or controlled by PixelPopLK.
          </p>
          <p>
            <strong className="text-foreground">4. Safe Harbor Compliance:</strong> We respect intellectual property rights and expeditiously remove any content upon receipt of a valid notice complying with the DMCA (17 U.S.C. § 512).
          </p>
        </div>

        {submitted ? (
          <div className="mt-6 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-sm font-bold text-foreground">Notice Prepared Successfully</h4>
            <p className="text-xs text-muted-foreground">
              Your default email client has been opened to submit the takedown notice. We process all valid requests within 24–48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Submit Content Takedown Request:</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Copyright Owner / Representative *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Company or Owner Name"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="legal@owner.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                PixelPopLK Page URL *
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://pixelpoplk.pages.dev/content/..."
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Details / Proof of Ownership *
              </label>
              <textarea
                required
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please describe your copyrighted work and authorization..."
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="pt-1 flex gap-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-95 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Submit DMCA Takedown Notice
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
