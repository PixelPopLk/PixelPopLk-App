import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, Download, Calendar, Star, SlidersHorizontal, Sparkles } from "lucide-react";
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

async function fetchLatestTVSeries(): Promise<Subtitle[]> {
  const { data, error } = await supabase
    .from(SUBTITLES_TABLE)
    .select(SAFE_SUBTITLE_COLUMNS)
    .not("season", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as Subtitle[];
}

export const Route = createFileRoute("/tv-series")({
  loader: async () => fetchLatestTVSeries(),
  head: () => ({
    meta: [
      { title: "Sinhala Subtitles for TV Series | Download All Episodes | PixelPopLK" },
      {
        name: "description",
        content:
          "Download Sinhala subtitles for top TV series, K-Dramas, Anime, and web shows. Complete season subtitle packages, synced episode by episode on PixelPopLK.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Sinhala Subtitles for TV Series | PixelPopLK" },
      {
        property: "og:description",
        content:
          "Download Sinhala subtitles for top TV series, K-Dramas, Anime, and web shows. Complete season subtitle packages on PixelPopLK.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE_URL}/tv-series` },
      { property: "og:site_name", content: "PixelPopLK" },
      { property: "og:image", content: `${BASE_URL}/og-banner.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sinhala Subtitles for TV Series | PixelPopLK" },
      {
        name: "twitter:description",
        content: "Download Sinhala subtitles for TV series on PixelPopLK.",
      },
      { name: "twitter:image", content: `${BASE_URL}/og-banner.png` },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/tv-series` }],
  }),
  component: TVSeriesPage,
});

const TV_GENRES = ["All", "Action", "Drama", "Mystery", "Sci-Fi", "Crime", "Animation", "Comedy"];

function TVSeriesPage() {
  const data = Route.useLoaderData();
  const [selectedGenre, setSelectedGenre] = useState("All");

  const allSeries = useMemo(() => {
    return buildGridItems(data ?? []).filter((it) => it.kind === "series");
  }, [data]);

  const filteredSeries = useMemo(() => {
    if (selectedGenre === "All") return allSeries;
    const target = selectedGenre.toLowerCase();
    return allSeries.filter((it) => {
      const episodes = (it as any).episodes || [];
      return episodes.some((ep: any) => {
        const gList = splitGenres(ep.genre).map((g) => g.toLowerCase());
        return gList.some((g) => g === target || g.includes(target));
      });
    });
  }, [allSeries, selectedGenre]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Sinhala Subtitles for TV Series",
    "url": `${BASE_URL}/tv-series`,
    "numberOfItems": filteredSeries.length,
    "itemListElement": filteredSeries.slice(0, 24).map((it, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `${BASE_URL}/content/${it.id}`,
      "name": `${itemTitle(it)} Sinhala Subtitles`,
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
        "name": "TV Series",
        "item": `${BASE_URL}/tv-series`,
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
          <span className="text-foreground font-semibold">TV Series</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center">
              <Tv className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Sinhala Subtitles for <span className="text-gradient">TV Series</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Download Sinhala subtitles for popular television series, mini-series, Korean dramas, and anime.
            All episodes are structured season-by-season with fast direct download links.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            Showing {filteredSeries.length} TV series available with Sinhala subtitles
          </p>
        </div>

        {/* Genre Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 mb-6">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
          {TV_GENRES.map((g) => {
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

        {/* Series Grid */}
        {filteredSeries.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Tv className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-semibold">No TV series found in this category.</p>
            <button
              onClick={() => setSelectedGenre("All")}
              className="mt-3 text-xs text-primary underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3.5 sm:gap-4 items-stretch">
            {filteredSeries.map((it) => (
              <SeriesCard key={it.key} item={it as Extract<GridItem, { kind: "series" }>} />
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
            Watching TV Series with Sinhala Subtitles
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Episode Navigation Guide
              </h3>
              <p>
                Each TV Series page provides episode-by-episode Sinhala subtitles (.srt) grouped cleanly by Season. You can choose individual episodes or download the complete season pack to sync with your media player.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Download className="w-4 h-4 text-primary" /> Video & Subtitle Matching
              </h3>
              <p>
                Make sure your video file name and subtitle (.srt) file name match exactly (e.g. Breaking.Bad.S01E01.mkv and Breaking.Bad.S01E01.srt) for automatic subtitle loading on smart TVs and media boxes.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SeriesCard({ item }: { item: Extract<GridItem, { kind: "series" }> }) {
  const title = itemTitle(item);
  const poster = itemPoster(item);
  const seasonCount = new Set(item.episodes.map((e) => e.season)).size;
  const rating = item.episodes.find((e) => e.rating != null && e.rating !== "")?.rating;
  const year = item.episodes.find((e) => e.year != null && e.year !== "")?.year;

  return (
    <Link
      to="/content/$id"
      params={{ id: String(item.id) }}
      className="group flex flex-col h-full text-left bg-card-elevated rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition shadow-card hover:shadow-glow w-full cursor-pointer"
      title={`${title} Sinhala Subtitles All Seasons`}
    >
      <div className="relative aspect-[2/3] w-full bg-muted overflow-hidden shrink-0">
        {poster ? (
          <img
            src={poster}
            alt={`${title} Sinhala Subtitles Poster`}
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
            <Tv className="w-10 h-10" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur text-[10px] font-semibold uppercase tracking-wide">
            <Tv className="w-3 h-3 text-accent-cyan" /> Series
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
            {seasonCount} S · {item.episodes.length} EP
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
            <Download className="w-3.5 h-3.5 text-primary" /> View Episodes
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
          {rating && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {rating}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground shrink-0">{formatDate(itemDate(item))}</p>
      </div>
    </Link>
  );
}
