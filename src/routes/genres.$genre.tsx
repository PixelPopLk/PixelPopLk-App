import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Film, Tv, Download, Calendar, Star, Tag } from "lucide-react";
import { supabase, SUBTITLES_TABLE, SAFE_SUBTITLE_COLUMNS, type Subtitle } from "@/integrations/supabase/client";
import {
  buildGridItems,
  itemTitle,
  itemPoster,
  itemDate,
  formatDate,
  formatGenre,
  type GridItem,
} from "@/lib/subtitles";
import { Navbar } from "@/components/Navbar";
import AdBanner from "@/components/AdBanner";
import { useMemo } from "react";

const BASE_URL = "https://pixelpoplk.pages.dev";

const ALL_GENRES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "drama",
  "horror",
  "mystery",
  "romance",
  "sci-fi",
  "thriller",
];

async function fetchGenreContent(genreParam: string): Promise<Subtitle[]> {
  const cleanGenre = genreParam.replace(/-/g, " ").trim();
  
  // Query items whose genre column contains the keyword
  const { data, error } = await supabase
    .from(SUBTITLES_TABLE)
    .select(SAFE_SUBTITLE_COLUMNS)
    .ilike("genre", `%${cleanGenre}%`)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;
  return (data ?? []) as Subtitle[];
}

export const Route = createFileRoute("/genres/$genre")({
  loader: async ({ params }) => {
    if (!ALL_GENRES.includes(params.genre.toLowerCase())) throw notFound();
    const data = await fetchGenreContent(params.genre);
    if (data.length === 0) throw notFound();
    return { data, genre: params.genre };
  },
  head: ({ params }) => {
    const genreTitle = formatGenre(params.genre.replace(/-/g, " "));
    const titleText = `${genreTitle} Sinhala Subtitles | Movies & TV Series | PixelPopLK`;
    const descText = `Download Sinhala subtitles for the best ${genreTitle} movies and TV series. Free .srt/.zip downloads, perfectly synced on PixelPopLK.`;
    const canonicalUrl = `${BASE_URL}/genres/${params.genre.toLowerCase()}`;

    return {
      meta: [
        { title: titleText },
        { name: "description", content: descText },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: titleText },
        { property: "og:description", content: descText },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonicalUrl },
        { property: "og:site_name", content: "PixelPopLK" },
        { property: "og:image", content: `${BASE_URL}/og-banner.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: titleText },
        { name: "twitter:description", content: descText },
        { name: "twitter:image", content: `${BASE_URL}/og-banner.png` },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
    };
  },
  component: GenrePage,
});

function GenrePage() {
  const { data, genre } = Route.useLoaderData();
  const genreTitle = formatGenre(genre.replace(/-/g, " "));

  const items = useMemo(() => {
    return buildGridItems(data ?? []);
  }, [data]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${genreTitle} Sinhala Subtitles`,
    "url": `${BASE_URL}/genres/${genre.toLowerCase()}`,
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
        "name": "Genres",
        "item": `${BASE_URL}/genres/${genre.toLowerCase()}`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": genreTitle,
        "item": `${BASE_URL}/genres/${genre.toLowerCase()}`,
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
          <span className="text-muted-foreground">Genres</span>
          <span>/</span>
          <span className="text-foreground font-semibold">{genreTitle}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 grid place-items-center">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {genreTitle} <span className="text-gradient">Sinhala Subtitles</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Explore the complete collection of {genreTitle} movies and TV series with Sinhala subtitles. 
            All subtitle packages are high-speed, verified, and free to download.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            Found {items.length} title{items.length !== 1 ? "s" : ""} in {genreTitle}
          </p>
        </div>

        {/* Genre Switcher Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 mb-6">
          {ALL_GENRES.map((g) => {
            const active = g.toLowerCase() === genre.toLowerCase().replace(/-/g, " ");
            const gSlug = g.toLowerCase().replace(/\s+/g, "-");
            return (
              <Link
                key={g}
                to="/genres/$genre"
                params={{ genre: gSlug }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                  active
                    ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-card/60 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                }`}
              >
                {g}
              </Link>
            );
          })}
        </div>

        {/* Ad Placement */}
        <div className="my-6">
          <AdBanner type="300x250" />
        </div>

        {/* Grid of Results */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-base font-semibold">No subtitles currently listed under {genreTitle}.</p>
            <Link to="/movies" className="mt-3 inline-block text-xs text-primary underline">
              Browse all movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3.5 sm:gap-4 items-stretch">
            {items.map((it) => (
              <GenreItemCard key={it.key} item={it} />
            ))}
          </div>
        )}

        {/* Bottom Ad */}
        <div className="mt-10 flex justify-center">
          <AdBanner type="160x300" />
        </div>
      </main>
    </div>
  );
}

function GenreItemCard({ item }: { item: GridItem }) {
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
