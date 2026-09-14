import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, Download, Calendar, Star, SlidersHorizontal, Sparkles } from "lucide-react";
import { supabase, SUBTITLES_TABLE, SAFE_SUBTITLE_COLUMNS, type Subtitle } from "@/integrations/supabase/client";
import {
  buildGridItems,
  itemTitle,
  itemPoster,
  itemDate,
  formatDate,
  splitGenres,
  type GridItem,
} from "@/lib/subtitles";
import { Navbar } from "@/components/Navbar";
import AdBanner from "@/components/AdBanner";
import { useState, useMemo } from "react";

const BASE_URL = "https://pixelpoplk.pages.dev";

async function fetchLatestMovies(): Promise<Subtitle[]> {
  const { data, error } = await supabase
    .from(SUBTITLES_TABLE)
    .select(SAFE_SUBTITLE_COLUMNS)
    .is("season", null)
    .order("created_at", { ascending: false })
    .limit(48);

  if (error) throw error;
  return (data ?? []) as Subtitle[];
}

export const Route = createFileRoute("/movies")({
  loader: async () => fetchLatestMovies(),
  head: () => ({
    meta: [
      { title: "Sinhala Subtitles for Movies | Free Download | PixelPopLK" },
      {
        name: "description",
        content:
          "Browse and download high-quality Sinhala subtitles for the latest Hollywood, Bollywood, and international movies. Fast, verified, and free on PixelPopLK.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Sinhala Subtitles for Movies | PixelPopLK" },
      {
        property: "og:description",
        content:
          "Browse and download high-quality Sinhala subtitles for the latest Hollywood, Bollywood, and international movies. Fast, verified, and free on PixelPopLK.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE_URL}/movies` },
      { property: "og:site_name", content: "PixelPopLK" },
      { property: "og:image", content: `${BASE_URL}/og-banner.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sinhala Subtitles for Movies | PixelPopLK" },
      {
        name: "twitter:description",
        content: "Browse and download high-quality Sinhala subtitles for movies on PixelPopLK.",
      },
      { name: "twitter:image", content: `${BASE_URL}/og-banner.png` },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/movies` }],
  }),
  component: MoviesPage,
});

const GENRES = ["All", "Action", "Sci-Fi", "Horror", "Thriller", "Comedy", "Drama", "Animation"];

function MoviesPage() {
  const data = Route.useLoaderData();
  const [selectedGenre, setSelectedGenre] = useState("All");

  const allMovies = useMemo(() => {
    return buildGridItems(data ?? []).filter((it) => it.kind === "movie");
  }, [data]);

  const filteredMovies = useMemo(() => {
    if (selectedGenre === "All") return allMovies;
    const target = selectedGenre.toLowerCase();
    return allMovies.filter((it) => {
      const gList = splitGenres((it as any).sub?.genre).map((g) => g.toLowerCase());
      return gList.some((g) => g === target || g.includes(target));
    });
  }, [allMovies, selectedGenre]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Sinhala Subtitles for Movies",
    "url": `${BASE_URL}/movies`,
    "numberOfItems": filteredMovies.length,
    "itemListElement": filteredMovies.slice(0, 24).map((it, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `${BASE_URL}/content/${it.id}`,
      "name": `${itemTitle(it)} Sinhala Subtitle`,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": BASE_URL,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Movies",
        "item": `${BASE_URL}/movies`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Navbar showBack backTo="/" backText="Home" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Movies</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Sinhala Subtitles for <span className="text-gradient">Movies</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Download the latest verified Sinhala subtitles (.srt/.zip) for Hollywood, Bollywood, and international cinema.
            Synced for BluRay, WEB-DL, and HDRip releases. Instant free download with zero wait time.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            Showing {filteredMovies.length} movie subtitle{filteredMovies.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Genre Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 mb-6">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
          {GENRES.map((g) => {
            const active = selectedGenre === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenre(g)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  active
                    ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-card/60 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>

        {/* Ad Placement: High CTR 300x250 */}
        <div className="my-6">
          <AdBanner type="300x250" />
        </div>

        {/* Movie Grid */}
        {filteredMovies.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-semibold">No movie subtitles found in this category.</p>
            <button
              onClick={() => setSelectedGenre("All")}
              className="mt-3 text-xs text-primary underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3.5 sm:gap-4 items-stretch">
            {filteredMovies.map((it) => (
              <MovieCard key={it.key} item={it as Extract<GridItem, { kind: "movie" }>} />
            ))}
          </div>
        )}

        {/* Bottom Ad */}
        <div className="mt-10 flex justify-center">
          <AdBanner type="160x300" />
        </div>

        {/* Rich SEO Content / Helpful Guide */}
        <section className="mt-14 p-6 sm:p-8 rounded-3xl bg-card border border-border/70 space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            How to Download & Add Sinhala Subtitles to Any Movie
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> උපසිරැසි භාවිතය (Sinhala Guide)
              </h3>
              <p>
                PixelPopLK වෙතින් බාගත කරගන්නා සියලුම සිංහල උපසිරැසි .zip ගොනු ලෙස ලැබේ. බාගත කිරීමෙන් පසු එම zip ගොනුව Extract කර .srt ගොනුව ඔබගේ චිත්‍රපට වීඩියෝව සමඟ එකම folder එකක තබා VLC හෝ MX Player මඟින් ධාවනය කරන්න.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Download className="w-4 h-4 text-primary" /> Compatibility & Sync Info
              </h3>
              <p>
                All our subtitle files are encoded in UTF-8 Unicode, guaranteeing clear Sinhala fonts across all devices including Android, iOS, Windows, Mac, and Smart TVs without font corruption or broken glyphs.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MovieCard({ item }: { item: Extract<GridItem, { kind: "movie" }> }) {
  const title = itemTitle(item);
  const poster = itemPoster(item);
  const genres = splitGenres(item.sub.genre);

  return (
    <Link
      to="/content/$id"
      params={{ id: String(item.id) }}
      className="group flex flex-col h-full text-left bg-card-elevated rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition shadow-card hover:shadow-glow w-full cursor-pointer"
      title={`${title} Sinhala Subtitle Download`}
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
            <Film className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur text-[10px] font-semibold uppercase tracking-wide">
            <Film className="w-3 h-3 text-primary" /> Movie
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
            <Download className="w-3.5 h-3.5 text-primary" /> Download Subtitle
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
          {item.sub.year && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {item.sub.year}
            </span>
          )}
          {item.sub.rating && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {item.sub.rating}
            </span>
          )}
        </div>
        {genres.length > 0 && (
          <p className="text-[10px] text-muted-foreground/70 truncate">{genres.slice(0, 2).join(", ")}</p>
        )}
        <p className="text-[10px] text-muted-foreground shrink-0">{formatDate(itemDate(item))}</p>
      </div>
    </Link>
  );
}
