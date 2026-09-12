import React, { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, Shield, Globe, Smartphone, Laptop } from "lucide-react";

type GuideTab = "brave" | "extension" | "vpn" | "dns";

export function AntiAdBlock() {
  const [isAdBlockActive, setIsAdBlockActive] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<GuideTab>("brave");

  useEffect(() => {
    const checkVpnAndAdBlockers = async () => {
      if (!navigator.onLine) {
        setIsChecking(false);
        return;
      }

      let isNormalInternetOk = false;
      let isAdDomainBlocked = false;

      // 1. Normal Internet Check
      try {
        await fetch("https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
        });
        isNormalInternetOk = true;
      } catch {
        isNormalInternetOk = false;
      }

      if (!isNormalInternetOk) {
        setIsChecking(false);
        return;
      }

      // 2. DNS/VPN AdBlock Check (Google Ads endpoints)
      const adEndpoints = [
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        "https://securepubads.g.doubleclick.net/tag/js/gpt.js"
      ];

      for (const url of adEndpoints) {
        try {
          await fetch(url, {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-store",
          });
        } catch {
          isAdDomainBlocked = true;
          break;
        }
      }

      // 3. DOM Bait Check (for browser extensions)
      const bait = document.createElement("div");
      bait.className = "pub_300x250 pub_728x90 banner-ad text-ad ad-zone";
      bait.style.cssText = "width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important;";
      document.body.appendChild(bait);

      const isBaitBlocked =
        window.getComputedStyle(bait).display === "none" ||
        bait.offsetParent === null ||
        bait.offsetHeight === 0;

      bait.remove();

      if (isAdDomainBlocked || isBaitBlocked) {
        setIsAdBlockActive(true);
        document.body.style.overflow = "hidden";
      }

      setIsChecking(false);
    };

    const timer = setTimeout(checkVpnAndAdBlockers, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  if (isChecking || !isAdBlockActive) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="max-w-lg w-full bg-[#0f172a] border border-red-500/30 rounded-3xl p-5 sm:p-7 text-center shadow-[0_0_50px_rgba(239,68,68,0.25)] flex flex-col items-center gap-4 my-auto">
        
        {/* Warning Icon */}
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 grid place-items-center text-red-500 animate-pulse">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            AdBlocker එකක් හඳුනාගැනුණි!
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            PixelPopLK වෙබ් අඩවිය නොමිලේ පවත්වාගෙන යාමට සහය වීමට කරුණාකර AdBlocker එක අක්‍රිය කරන්න.
          </p>
        </div>

        {/* 🟢 Guide Category Tabs */}
        <div className="grid grid-cols-4 gap-1.5 w-full bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-[11px] sm:text-xs font-bold">
          <button
            onClick={() => setActiveTab("brave")}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === "brave" ? "bg-red-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Brave</span>
          </button>

          <button
            onClick={() => setActiveTab("extension")}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === "extension" ? "bg-red-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Laptop className="w-3.5 h-3.5 shrink-0" />
            <span>Chrome</span>
          </button>

          <button
            onClick={() => setActiveTab("vpn")}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === "vpn" ? "bg-red-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>VPN</span>
          </button>

          <button
            onClick={() => setActiveTab("dns")}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === "dns" ? "bg-red-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>Phone DNS</span>
          </button>
        </div>

        {/* 🟢 Step by Step Instructions Box */}
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-left min-h-[110px] flex flex-col justify-center">
          {activeTab === "brave" && (
            <div className="space-y-1.5 text-slate-300 animate-in fade-in duration-200">
              <p className="font-semibold text-orange-400 flex items-center gap-1.5">
                🦁 Brave Browser භාවිතා කරන්නේ නම්:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
                <li>Search bar එක අසල ඇති <strong>Lion (සිංහයා) Icon</strong> එක Click කරන්න.</li>
                <li><strong>Brave Shields</strong> ඉදිරියෙන් ඇති Switch එක <strong>OFF (Down)</strong> කරන්න.</li>
              </ol>
            </div>
          )}

          {activeTab === "extension" && (
            <div className="space-y-1.5 text-slate-300 animate-in fade-in duration-200">
              <p className="font-semibold text-blue-400 flex items-center gap-1.5">
                🧩 Chrome / uBlock / AdBlock භාවිතා කරන්නේ නම්:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
                <li>Browser එකේ උඩ දකුණු කෙළවරේ ඇති <strong>AdBlocker Icon</strong> එක Click කරන්න.</li>
                <li><strong>"Pause on this site"</strong> හෝ ලොකු <strong>Power Button</strong> එක Click කරන්න.</li>
              </ol>
            </div>
          )}

          {activeTab === "vpn" && (
            <div className="space-y-1.5 text-slate-300 animate-in fade-in duration-200">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                🔒 VPN භාවිතා කරන්නේ නම් (VPN එක Off කිරීමට අවශ්‍ය නැත):
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
                <li>ඔබගේ VPN App එක (Surfshark, Nord, Proton ආදී) Open කරන්න.</li>
                <li>Settings වෙත ගොස් <strong>CleanWeb / Threat Protection / NetShield</strong> Off කරන්න.</li>
              </ol>
            </div>
          )}

          {activeTab === "dns" && (
            <div className="space-y-1.5 text-slate-300 animate-in fade-in duration-200">
              <p className="font-semibold text-purple-400 flex items-center gap-1.5">
                📱 Android / iOS Private DNS දමා ඇත්නම්:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
                <li>Phone <strong>Settings &gt; Connections &gt; Private DNS</strong> වෙත යන්න.</li>
                <li>AdGuard DNS දමා ඇත්නම් එය <strong>Off හෝ Automatic</strong> ලෙස සකසන්න.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Refresh Action Button */}
        <button
          onClick={handleReload}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:opacity-90 active:scale-95 transition duration-200 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Off කළා, පිටුව Refresh කරන්න
        </button>
      </div>
    </div>
  );
        }
