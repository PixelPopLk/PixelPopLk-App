import React, { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Search, X, ArrowLeft, Sun, Moon } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { TelegramIcon, FacebookIcon } from "./SocialIcons";

export interface SearchItem {
  id: string;
  title: string;
  type: "Movie" | "TV Series";
  year?: string;
  posterUrl?: string;
  description?: string;
}

export function LogoIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.55)]`} fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <path d="M24,78 L37,22 L47,22 L34,78 Z" fill="url(#metal-silver)" stroke="#020617" strokeWidth="1.2" />
      <path d="M37,22 L64,22 C76,22 76,46 64,46 L43,46" fill="none" stroke="url(#metal-silver)" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48,34 C56,34 65,37 65,46 C65,58 54,68 38,68 L66,68" fill="none" stroke="url(#metal-gold)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
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
  searchResults?: SearchItem[];
}

export function Navbar({
  showSearch = false,
  query = "",
  setQuery,
  showBack = false,
  backTo = "/",
  backText = "Back",
  searchResults = [],
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Dark/Light Theme State Logic
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  // Search Container එකෙන් එලිය ක්ලික් කල විට පමණක් Dropdown එක close වීම
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredResults = searchResults.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase().trim())
  );

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Left: Menu & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-xl hover:bg-muted/40 transition cursor-pointer text-foreground hover:text-primary" aria-label="Open menu">
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

        {/* Center: Search Bar with Auto Dropdown Popup */}
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

            {/* Auto Popup Dropdown */}
            {showPopup && query.trim() !== "" && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto p-2 divide-y divide-border/40">
                {filteredResults.length > 0 ? (
                  filteredResults.map((item) => (
                    <Link
                      key={item.id}
                      to="/content/$id"
                      params={{ id: String(item.id) }}
                      onClick={() => {
                        setShowPopup(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-3 p-2.5 hover:bg-muted/70 rounded-xl cursor-pointer transition group"
                    >
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded-lg shrink-0 bg-muted border border-border/50 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-16 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-[10px] text-muted-foreground font-bold shrink-0">
                          NO COVER
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary truncate transition">
                            {item.title}
                          </h4>
                          <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full shrink-0">
                            {item.type}
                          </span>
                        </div>

                        {item.year && (
                          <span className="text-xs text-muted-foreground font-medium block mt-0.5">
                            {item.year}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No movies or TV series found for "<span className="text-foreground font-semibold">{query}</span>"
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right: Theme Toggle & Social Links / Back Button */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* 🔥 Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-muted/60 border border-border hover:bg-muted text-foreground transition cursor-pointer flex items-center justify-center"
            aria-label="Toggle theme"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {showBack ? (
            <Link
              to={backTo as any}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition font-medium ml-2"
            >
              <ArrowLeft className="w-4 h-4" /> {backText}
            </Link>
          ) : (
            <div className="hidden md:flex items-center gap-2.5">
              <a
                href="https://t.me/Pixel_Pop_Lk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#229ED9]/30 bg-[#229ED9]/10 text-white hover:bg-[#229ED9]/25 hover:border-[#229ED9]/50 transition duration-300 text-xs font-bold"
              >
                <TelegramIcon className="w-3.5 h-3.5 text-[#229ED9]" />
                Join Telegram
              </a>
              <a
                href="https://www.facebook.com/share/1Ec2mYq4aa/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/10 text-white hover:bg-[#1877F2]/25 hover:border-[#1877F2]/50 transition duration-300 text-xs font-bold"
              >
                <FacebookIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                Follow Facebook
              </a>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
