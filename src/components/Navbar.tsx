import React, { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, X, ArrowLeft } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { TelegramIcon, FacebookIcon } from "./SocialIcons";

export function LogoIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.55)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="metal-silver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="25%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="75%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        <linearGradient id="metal-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#ca8a04" />
          <stop offset="60%" stopColor="#fef9c3" />
          <stop offset="85%" stopColor="#854d0e" />
          <stop offset="100%" stopColor="#422006" />
        </linearGradient>
      </defs>

      <path
        d="M24,78 L37,22 L47,22 L34,78 Z"
        fill="url(#metal-silver)"
        stroke="#020617"
        strokeWidth="1.2"
      />

      <path
        d="M37,22 L64,22 C76,22 76,46 64,46 L43,46"
        fill="none"
        stroke="url(#metal-silver)"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M48,34 C56,34 65,37 65,46 C65,58 54,68 38,68 L66,68"
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
  const [showPopup, setShowPopup] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search box එකෙන් එලිය ක්ලික් කල විට popup එක hide වීම
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <LogoIcon className="w-9 h-9" />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight hidden xs:inline-block">
              Pixel<span className="text-gradient">Pop</span>LK
            </span>
          </Link>
        </div>

        {/* Center: Search Bar with Auto Popup */}
        {showSearch && setQuery && (
          <div ref={searchRef} className="flex-1 max-w-xl mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowPopup(true);
              }}
              onFocus={() => setShowPopup(true)}
              placeholder="Search movies, series, episodes…"
              className="w-full pl-10 pr-10 py-2 rounded-full bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition"
            />
            {query && (
              <button
                aria-label="Clear"
                onClick={() => {
                  setQuery("");
                  setShowPopup(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* 🔥 Search Bar එකට කෙලින්ම යටින් එන Auto Popup Dropdown එක */}
            {showPopup && query.trim() !== "" && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto p-2">
                <div 
                  onClick={() => setShowPopup(false)}
                  className="p-3 hover:bg-muted/60 rounded-xl cursor-pointer flex justify-between items-center transition"
                >
                  <span className="text-sm font-medium text-foreground">
                    Search for "<span className="text-primary">{query}</span>"
                  </span>
                  <span className="text-xs bg-primary/20 text-primary font-semibold px-2.5 py-1 rounded-lg">
                    Press Enter
                  </span>
                </div>
              </div>
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
