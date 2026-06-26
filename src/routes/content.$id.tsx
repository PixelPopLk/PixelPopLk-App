import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Download,
  Film,
  PlayCircle,
  Star,
  Subtitles,
  Tv,
} from "lucide-react";

import { supabase, SUBTITLES_TABLE, SUBTITLE_COLUMNS, type Subtitle } from "@/integrations/supabase/client";
import {
  buildGridItems,
  formatRating,
  genreBadgeClass,
  splitGenres,
  type GridItem,
} from "@/lib/subtitles";
import { Navbar } from "@/components/Navbar";
import { DownloadButton } from "@/components/DownloadCountdown";

export const Route = createFileRoute("/content/$id")({
  head: () => ({ meta: [{ title: "Subtitle — PixelPopLK" }] }),
  component: ContentPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Content not found</h1>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          ← Back home
        </Link>
      </div>
    </div>
  ),
});

function ContentPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["subtitles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(SUBTITLES_TABLE)
        .select(SUBTITLE_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Subtitle[];
    },
  });

  const item = useMemo<GridItem | null>(() => {
    if (!data) return null;
    const items = buildGridItems(data);
    // direct id match
    const direct = items.find((it) => String(it.id) === id);
    if (direct) return direct;
    // search across series episodes
    for (const it of items) {
      if (it.kind === "series" && it.episodes.some((e) => String(e.id) === id)) return it;
    }
    return null;
  }, [data, id]);

  if (isLoading) return <Shell><div className="h-96 rounded-3xl bg-muted/30 animate-pulse" /></Shell>;
  if (!data) return <Shell><p>Loading…</p></Shell>;
  if (!item) throw notFound();

  return <Shell>{item.kind === "movie" ? <MovieView item={item} /> : <SeriesView item={item} />}</Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar showBack backTo="/" backText="Back" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}


function GenreBadges({ genres }: { genres: string[] }) {
  if (genres.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {genres.map((g) => (
        <span
          key={g}
          className={`px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide ${genreBadgeClass(g.toLowerCase())}`}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

function Hero({
  poster,
  title,
  year,
  rating,
  genres,
  kindLabel,
  KindIcon,
  description,
  children,
}: {
  poster: string;
  title: string;
  year?: string | null;
  rating?: string | null;
  genres: string[];
  kindLabel: string;
  KindIcon: typeof Film;
  description?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border shadow-card">
      {poster && (
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <img src={poster} alt="" className="w-full h-full object-cover blur-3xl scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
        </div>
      )}
      <div className="relative grid md:grid-cols-[320px_1fr] gap-0">
        <div className="p-6 md:p-8 md:pr-0">
          <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-border shadow-card bg-muted">
            {poster ? (
              <img src={poster} alt={title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <Film className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>
        <div className="p-6 sm:p-8 md:pl-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wide">
              <KindIcon className="w-3 h-3" /> {kindLabel}
            </span>
            <GenreBadges genres={genres} />
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold leading-[1.1] tracking-tight">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {year && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{year}</span>
              </span>
            )}
            {rating && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-foreground">{rating}</span>
                <span className="text-muted-foreground text-xs">/ 10 IMDb</span>
              </span>
            )}
          </div>
          {description ? (
            <div className="mt-6">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary mb-2">Overview</h3>
              <p className="text-[15px] leading-relaxed text-foreground/85 whitespace-pre-line">{description}</p>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function MovieView({ item }: { item: Extract<GridItem, { kind: "movie" }> }) {
  const s = item.sub;
  const year = s.year != null && s.year !== "" ? String(s.year) : new Date(s.created_at).getFullYear().toString();
  const genres = splitGenres(s.genre);

  const titleText = `${s.title} (${year}) Sinhala Subtitle | Download Movie Subtitles | PixelPopLK`;
  const descText = `Download Sinhala subtitles for ${s.title} (${year}). High-quality Sinhala sub file synced for official release. Fast & secure on PixelPopLK.`;
  const keywordText = `${s.title} Sinhala Subtitle, Download ${s.title} Subtitle, PixelPopLK, Sinhala Subtitles, Movie Subtitles`;

  useEffect(() => {
    document.title = titleText;
    const updateMeta = (nameOrProperty: string, content: string, isProperty = false) => {
      const selector = isProperty 
        ? `meta[property="${nameOrProperty}"]` 
        : `meta[name="${nameOrProperty}"]`;
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        if (isProperty) element.setAttribute("property", nameOrProperty);
        else element.setAttribute("name", nameOrProperty);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    updateMeta("description", descText);
    updateMeta("keywords", keywordText);
    updateMeta("og:title", titleText, true);
    updateMeta("og:description", descText, true);
    updateMeta("og:type", "video.movie", true);
    if (s.image_url) updateMeta("og:image", s.image_url, true);
    updateMeta("twitter:title", titleText);
    updateMeta("twitter:description", descText);
    if (s.image_url) updateMeta("twitter:image", s.image_url);
  }, [s, year, titleText, descText, keywordText]);

  const movieSchema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": s.title,
    "image": s.image_url,
    "description": s.description || `Download Sinhala Subtitle for ${s.title}`,
    "datePublished": s.year || year,
    "workFeaturedBy": {
      "@type": "DataDownload",
      "name": `${s.title} Sinhala Subtitle`,
      "contentUrl": s.download_link,
      "encodingFormat": "application/x-subrip",
      "description": `Download Sinhala Subtitle (.srt) for ${s.title}`
    }
  };

  return (
    <Hero
      poster={s.image_url}
      title={s.title}
      year={year}
      rating={formatRating(s.rating)}
      genres={genres}
      kindLabel="Movie"
      KindIcon={Film}
      description={s.description}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(movieSchema) }}
      />
      <div className="mt-7">
        <DownloadButton downloadLink={s.download_link} label="Download Subtitle" />
        <p className="mt-3 text-[11px] text-muted-foreground">
          Opens in a new tab. Thank you for supporting PixelPopLK ❤
        </p>
      </div>
    </Hero>
  );
}

function SeriesView({ item }: { item: Extract<GridItem, { kind: "series" }> }) {
  const meta = useMemo(() => {
    const withDesc = item.episodes.find((e) => e.description) ?? item.episodes[0];
    const withRating = item.episodes.find((e) => e.rating != null && e.rating !== "") ?? item.episodes[0];
    const withYear = item.episodes.find((e) => e.year != null && e.year !== "") ?? item.episodes[0];
    return {
      description: withDesc?.description ?? null,
      rating: formatRating(withRating?.rating),
      year:
        withYear?.year != null && withYear.year !== ""
          ? String(withYear.year)
          : new Date(item.latestDate).getFullYear().toString(),
    };
  }, [item]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    item.episodes.forEach((e) => splitGenres(e.genre).forEach((g) => set.add(g)));
    return Array.from(set);
  }, [item]);

  const seasons = useMemo(() => {
    const set = new Set(item.episodes.map((e) => e.season));
    return Array.from(set).sort((a, b) => a - b);
  }, [item]);

  const [season, setSeason] = useState<number>(seasons[0] ?? 1);
  const seasonEpisodes = useMemo(
    () => item.episodes.filter((e) => e.season === season).sort((a, b) => a.episode - b.episode),
    [item, season],
  );

  const titleText = `${item.showName} Sinhala Subtitles | TV Series Download | PixelPopLK`;
  const descText = `Download Sinhala subtitles for TV Series ${item.showName} (${meta.year}). Latest seasons and episodes available on PixelPopLK.`;
  const keywordText = `${item.showName} Sinhala Subtitles, Sinhala Subitiles TV Series, ${item.showName} Sinhala Subitiles TV Series, PixelPopLK`;

  useEffect(() => {
    document.title = titleText;
    const updateMeta = (nameOrProperty: string, content: string, isProperty = false) => {
      const selector = isProperty 
        ? `meta[property="${nameOrProperty}"]` 
        : `meta[name="${nameOrProperty}"]`;
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        if (isProperty) element.setAttribute("property", nameOrProperty);
        else element.setAttribute("name", nameOrProperty);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    updateMeta("description", descText);
    updateMeta("keywords", keywordText);
    updateMeta("og:title", titleText, true);
    updateMeta("og:description", descText, true);
    updateMeta("og:type", "video.tv_show", true);
    if (item.poster) updateMeta("og:image", item.poster, true);
    updateMeta("twitter:title", titleText);
    updateMeta("twitter:description", descText);
    if (item.poster) updateMeta("twitter:image", item.poster);
  }, [item, titleText, descText, keywordText]);

  const seriesSchema = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": item.showName,
    "image": item.poster,
    "description": meta.description || `Download Sinhala Subtitles for TV Series ${item.showName}`,
    "numberOfEpisodes": item.episodes.length,
    "numberOfSeasons": seasons.length
  };

  return (
    <Hero
      poster={item.poster}
      title={item.showName}
      year={meta.year}
      rating={meta.rating}
      genres={genres}
      kindLabel="TV Series"
      KindIcon={Tv}
      description={meta.description}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesSchema) }}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        {item.episodes.length} episode{item.episodes.length === 1 ? "" : "s"} across {seasons.length} season
        {seasons.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
          {seasons.map((s) => {
            const active = s === season;
            return (
              <button
                key={s}
                onClick={() => setSeason(s)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                  active
                    ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-card/60 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                }`}
              >
                Season {String(s).padStart(2, "0")}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          {seasonEpisodes.map((ep) => (
            <Link
              key={String(ep.id)}
              to="/episode/$id"
              params={{ id: String(ep.id) }}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border hover:border-primary/40 transition group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition">
                  Episode {String(ep.episode).padStart(2, "0")}
                  {ep.epTitle ? <span className="text-muted-foreground font-normal"> — {ep.epTitle}</span> : null}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{ep.title}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-xs font-semibold text-foreground/80 group-hover:border-primary/50 group-hover:text-primary transition shrink-0">
                Open
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Hero>
  );
}
