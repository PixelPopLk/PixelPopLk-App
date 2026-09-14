import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Film, Tv, Download, Calendar, ArrowLeft } from "lucide-react";
import { supabase, SUBTITLES_TABLE, SAFE_SUBTITLE_COLUMNS, type Subtitle } from "@/integrations/supabase/client";
import {
  buildGridItems,
  itemTitle,
  itemPoster,
  itemDate,
  formatDate,
  type GridItem,
} from "@/lib/subtitles";
import { searchFuzzy } from "@/lib/fuzzySearch";
import { Navbar } from "@/components/Navbar";
import AdBanner from "@/components/AdBanner";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";

const BASE_URL = "https://pixelpoplk.pages.dev";

const searchParamsSchema = z.object({
  q: z.string().optional().catch(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: (search) => searchParamsSchema.parse(search),
  loader: async () => {
    const { data } = await supabase
      .from(SUBTITLES_TABLE)
      .select(SAFE_SUBTITLE_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []) as Subtitle[];
  },
  head: () => ({
    meta: [
      { title: "Search Sinhala Subtitles | PixelPopLK" },
      {
        name: "description",
        content: "Search through thousands of Sinhala subtitles for movies and TV series on PixelPopLK.",
      },
      // 🟢 Google SEO Best Practice: Do not index search results pages to avoid thin/duplicate content penalties
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Search Sinhala Subtitles | PixelPopLK" },
      { property: "og:url", content: `${BASE_URL}/search` },
      { property: "og:image", content: `${BASE_URL}/og-banner.png` },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/search` }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate();
  const data = Route.useLoaderData();
  const [searchTerm, setSearchTerm] = useState(q);

  useEffect(() => {
    setSearchTerm(q);
  }, [q]);

  const allItems = useMemo(() => buildGridItems(data), [data]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return allItems.slice(0, 24);
    const candidates = allItems.map((it) => ({
      ...it,
      title: itemTitle(it),
      epTitle: it.kind === "series" ? it.episodes.map((e) => e.epTitle || e.title).join(" ") : null,
      genre: it.kind === "movie" ? it.sub.genre : it.episodes[0]?.genre,
      description: it.kind === "movie" ? it.sub.description : it.episodes[0]?.description,
    }));
    return searchFuzzy(candidates, searchTerm);
  }, [allItems, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: { q: searchTerm.trim() || undefined },
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar showBack backTo="/" backText="Home" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            Search <span className="text-gradient">Sinhala Subtitles</span>
          </h1>
          <form onSubmit={handleSearchSubmit} className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by movie name, series title, or actor..."
              className="w-full pl-12 pr-28 py-3.5 rounded-full bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm shadow-card transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-xs shadow-glow hover:opacity-95 transition cursor-pointer"
            >
              Search
            </button>
          </form>
          {q && (
            <p className="text-xs text-muted-foreground mt-3">
              Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{q}"
            </p>
          )}
        </div>

        {/* Ad Placement */}
        <div className="my-6">
          <AdBanner type="300x250" />
        </div>

        {searchResults.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold">No subtitles found matching your query.</p>
            <p className="text-xs mt-1">Try checking your spelling or search using another keyword.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3.5 sm:gap-4 items-stretch">
            {searchResults.map((it) => (
              <SearchItemCard key={it.key} item={it} />
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <AdBanner type="160x300" />
        </div>
      </main>
    </div>
  );
}

function SearchItemCard({ item }: { item: GridItem }) {
  const isMovie = item.kind === "movie";
  const title = itemTitle(item);
  const poster = itemPoster(item);
  const tv = !isMovie;
  const seasonCount = tv ? new Set(item.episodes.map((e) => e.season)).size : 0;
  const year = isMovie
    ? (item as any).sub?.year
    : item.episodes.find((e) => e.year != null && e.year !== "")?.year;

  return (
    <Link
      to="/content/$id"
      params={{ id: String(item.id) }}
      className="group flex flex-col h-full text-left bg-card-elevated rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition shadow-card hover:shadow-glow w-full cursor-pointer"
      title={`${title} Sinhala Subtitle`}
    >
      <div className="relative aspect-[2/3] w-full bg-muted overflow-hidden shrink-0">
        {poster ? (
          <img
            src={poster}
            alt={`${title} Sinhala Subtitle Poster`}
            width={300}
            height={450}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            {isMovie ? <Film className="w-10 h-10" /> : <Tv className="w-10 h-10" />}
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur text-[10px] font-semibold uppercase tracking-wide">
            {isMovie ? <Film className="w-3 h-3 text-primary" /> : <Tv className="w-3 h-3 text-accent-cyan" />}
            {isMovie ? "Movie" : "Series"}
          </span>
        </div>
        {tv && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
              {seasonCount} S · {item.episodes.length} EP
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
            <Download className="w-3.5 h-3.5 text-primary" /> Details
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
        <div className="h-[2.75rem] overflow-hidden">
          <h3 className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-primary transition">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          {year && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {year}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground shrink-0">{formatDate(itemDate(item))}</p>
      </div>
    </Link>
  );
}
