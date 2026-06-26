import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Film, Tv, Home, Subtitles } from "lucide-react";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TelegramIcon, FacebookIcon } from "./SocialIcons";

const MOVIE_GENRES = ["Action", "Sci-Fi", "Horror", "Thriller", "Comedy", "Romance", "Drama"];
const TV_GENRES = ["Action", "Drama", "Mystery", "Animation", "Crime", "Sci-Fi", "Comedy"];

interface SidebarProps {
  onClose: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();

  const handleCategoryClick = (type: "movie" | "series", genre: string) => {
    const adKey = `ad-triggered-${type}-${genre}`.toLowerCase();
    const alreadyTriggered = sessionStorage.getItem(adKey);
    if (!alreadyTriggered) {
      sessionStorage.setItem(adKey, "true");
      try {
        const w = window.open("https://omg10.com/4/11202064", "_blank", "noopener,noreferrer");
        if (w) w.opener = null;
      } catch (err) {
        console.error("Popup blocked:", err);
      }
    }

    navigate({
      to: "/",
      search: {
        type,
        genre,
        q: undefined, // Clear search term when browsing category
      },
    });
    onClose();
  };

  const handleHomeClick = () => {
    navigate({
      to: "/",
      search: {
        type: "all",
        genre: undefined,
        q: undefined,
      },
    });
    onClose();
  };

  return (
    <SheetContent side="left" className="w-[300px] border-r border-border bg-background flex flex-col justify-between p-6">
      <div className="flex-1 flex flex-col gap-6">
        <SheetHeader className="text-left">
          <Link to="/" onClick={handleHomeClick} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Subtitles className="w-5 h-5 text-primary-foreground" />
            </div>
            <SheetTitle className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
              Pixel<span className="text-gradient">Pop</span>LK
            </SheetTitle>
          </Link>
        </SheetHeader>

        <nav className="flex flex-col gap-1">
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted/40 transition duration-200"
          >
            <Home className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">HOME</span>
          </button>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="movies" className="border-none">
              <AccordionTrigger className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted/40 hover:no-underline transition duration-200 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Film className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">MOVIES</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-1 pl-10 flex flex-col gap-1 border-none">
                {MOVIE_GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleCategoryClick("movie", genre)}
                    className="w-full text-left py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition duration-150 cursor-pointer"
                  >
                    {genre}
                  </button>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tv-series" className="border-none">
              <AccordionTrigger className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-foreground/80 hover:text-foreground hover:bg-muted/40 hover:no-underline transition duration-200 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Tv className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">TV SERIES</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-2 pt-1 pl-10 flex flex-col gap-1 border-none">
                {TV_GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleCategoryClick("series", genre)}
                    className="w-full text-left py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition duration-150 cursor-pointer"
                  >
                    {genre}
                  </button>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </nav>
      </div>

      {/* Social Media Buttons at the bottom for Mobile */}
      <div className="flex flex-col gap-3 pt-6 border-t border-border/40">
        <a
          href="https://t.me/Pixel_Pop_Lk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/10 text-white hover:bg-[#229ED9]/25 hover:border-[#229ED9]/50 transition duration-200 text-xs font-bold"
        >
          <TelegramIcon className="w-4 h-4 text-[#229ED9]" />
          Join Telegram Channel
        </a>
        <a
          href="https://www.facebook.com/share/1Ec2mYq4aa/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/10 text-white hover:bg-[#1877F2]/25 hover:border-[#1877F2]/50 transition duration-200 text-xs font-bold"
        >
          <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
          Follow Facebook Page
        </a>
      </div>
    </SheetContent>
  );
}
