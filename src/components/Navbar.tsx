import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, X, ArrowLeft } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { TelegramIcon, FacebookIcon } from "./SocialIcons";

// 🔥 ඔයා එවපු රූපයට සමාන, Pure SVG ඇසුරින් නිමවූ නවීනතම PixelPopLK Monogram (P + L) ලෝගෝව
export function LogoIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} filter drop-shadow-[0_2px_8px_rgba(59,130,246,0.35)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Futuristic Metallic Silver/Slate Gradient (P අකුර සඳහා) */}
        <linearGradient id="metal-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        {/* Futuristic Metallic Gold/Bronze Gradient (L අකුරෙහි වක්‍රය සඳහා) */}
        <linearGradient id="metal-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#ca8a04" />
          <stop offset="80%" stopColor="#854d0e" />
          <stop offset="100%" stopColor="#422006" />
        </linearGradient>
      </defs>
      
      {/* outer 'P' backbone with futuristic angles (Silver) */}
      <path
        d="M26,18 L60,18 C78,18 78,44 60,44 L38,44 L38,82 L26,82 Z"
        fill="url(#metal-silver)"
        stroke="#0f172a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      
      {/* inner 'L' sweep seamlessly fused (Gold) */}
      <path
        d="M48,31 C56,31 66,35 66,45 C66,58 52,69 38,69 L64,69"
        fill="none"
        stroke="url(#metal-gold)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface NavbarProps {
  showSearch?: boolean;
  query?: string;
  setQuery?: (v: string) => void;
  showBack?: boolean;
  backTo?: string;
  backText?: string;
}

export function Navbar({
  showSearch = false,
  query = "",
  setQuery,
  showBack = false,
  backTo = "/",
  backText = "Back",
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Hamburger & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className="p-2 rounded-xl hover:bg-muted/40 transition cursor-pointer text-foreground hover:text-primary"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <Sidebar onClose={() => setIsOpen(false)} />
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            {/* පැරණි Subtitles icon එක වෙනුවට අලුත්ම Monogram SVG LogoIcon එක සෘජුවම එකතු කර ඇත */}
            <LogoIcon className="w-9 h-9" />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight hidden xs:inline-block">
              Pixel<span className="text-gradient">Pop</span>LK
            </span>
          </Link>
        </div>

        {/* Center: Search Bar (Conditional) */}
        {showSearch && setQuery && (
          <div className="flex-1 max-w-xl mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, series, episodes…"
              className="w-full pl-10 pr-10 py-2 rounded-full bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition"
            />
            {query && (
              <button
                aria-label="Clear"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Right Side: Back button or Desktop Social Links */}
        <div className="flex items-center gap-3 shrink-0">
          {showBack ? (
            <Link
              to={backTo as any}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> {backText}
            </Link>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <a
                href="https://t.me/Pixel_Pop_Lk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#229ED9]/30 bg-[#229ED9]/10 text-white hover:bg-[#229ED9]/25 hover:border-[#229ED9]/50 hover:shadow-[#229ED9]/20 hover:shadow-glow transition duration-300 text-xs font-bold"
              >
                <TelegramIcon className="w-3.5 h-3.5 text-[#229ED9]" />
                Join Telegram Channel
              </a>
              <a
                href="https://www.facebook.com/share/1Ec2mYq4aa/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/10 text-white hover:bg-[#1877F2]/25 hover:border-[#1877F2]/50 hover:shadow-[#1877F2]/20 hover:shadow-glow transition duration-300 text-xs font-bold"
              >
                <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                Follow Facebook Page
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
