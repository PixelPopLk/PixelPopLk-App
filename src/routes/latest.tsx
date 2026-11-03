import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Film, Tv, Download, Calendar, Star, Clock } from "lucide-react";
import { supabase, SUBTITLES_TABLE, SAFE_SUBTITLE_COLUMNS, type Subtitle } from "@/integrations/supabase/client";
import {
  buildGridItems,
  itemTitle,
  itemPoster,
  itemDate,
  formatDate,
  type GridItem,
} from "@/lib/subtitles";
import { Navbar } from "@/components/Navbar";
import AdBanner from "@/components/AdBanner";
import { useMemo } from "react";

const BASE_URL = "https://pixelpoplk.pages.dev";

async function fetchLatestReleases(): Promise<Subtitle[]> {
  const { data, error } = await supabase
    .from(SUBTITLES_TABLE)
    .select(SAFE_SUBTITLE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(48);

  if (error) throw error;
  return (data ?? []) as Subtitle[];
}

export const Route = createFileRoute("/latest")({
  loader: async () => fetchLatestReleases(),
  head: () => ({
    meta: [
      { title: "Latest Sinhala Subtitles | New Movie & Series Releases | PixelPopLK" },
      {
        name: "description",
        content:
          "Download the newest Sinhala subtitles uploaded today. Fresh releases for recent movies, newly aired TV episodes, and trending shows on PixelPopLK.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Latest Sinhala Subtitles | PixelPopLK" },
      {
        property: "og:description",
        content:
          "Download the newest Sinhala subtitles uploaded today for movies and TV series on PixelPopLK.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE_URL}/latest` },
      { property: "og:site_name", content: "PixelPopLK" },
      { property: "og:image", content: `${BASE_URL}/og-banner.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Latest Sinhala Subtitles | PixelPopLK" },
      {
        name: "twitter:description",
        content: "Newest Sinhala subtitles uploaded today on PixelPopLK.",
      },
      { name: "twitter:image", content: `${BASE_URL}/og-banner.png` },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/latest` }],
  }),
  component: LatestPage,
});

function LatestPage() {
  const data = Route.useLoaderData();
  const items = useMemo(() => buildGridItems(data ?? []), [data]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Latest Sinhala Subtitles",
    "url": `${BASE_URL}/latest`,
    "numberOfItems": items.length,
    "itemListElement": items.slice(0, 24).map((it, idx) => ({
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
        "name": "Latest Subtitles",
        "item": `${BASE_URL}/latest`,
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
          <span className="text-foreground font-semibold">Latest Subtitles</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Latest <span className="text-gradient">Sinhala Subtitles</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Freshly added Sinhala subtitle files for new movies and current episodes. 
            Updated multiple times daily with verified sync and accurate Sinhala translations.
          </p>
        </div>

        {/* Ad Placement */}
        <div className="my-6">
          <AdBanner type="300x250" />
        </div>

        {/* Grid of Results */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3.5 sm:gap-4 items-stretch">
          {items.map((it) => (
            <LatestCard key={it.key} item={it} />
          ))}
        </div>

        {/* Bottom Ad */}
        <div className="mt-10 flex justify-center">
          <AdBanner type="160x300" />
        </div>
      </main>
    </div>
  );
}

function LatestCard({ item }: { item: GridItem }) {
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
      title={`Download ${title} Sinhala Subtitle`}
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
