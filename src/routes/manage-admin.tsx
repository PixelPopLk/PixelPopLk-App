import { useEffect, useMemo, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Subtitles,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Pencil,
  ArrowLeft,
  Lock,
  Search,
  Save,
  XCircle,
  Sparkles,
  Send,
  Upload,
  BarChart3,
  TrendingUp,
  Download,
  Flame,
  Clock,
  PieChart as PieIcon,
  Activity,
  Film,
  Tv,
  ChevronDown,
  ChevronUp,
  Settings,
  Eye,
  EyeOff,
  RotateCcw,
  FastForward,
} from "lucide-react";
import { supabase, SUBTITLES_TABLE, type Subtitle } from "@/integrations/supabase/client";
import { splitGenres, genreBadgeClass, buildGridItems, parseTitle, cleanShowName } from "@/lib/subtitles";

export const Route = createFileRoute("/manage-admin")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — PixelPopLK" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
});

function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) {
        setSession(currentSession);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading && !session) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Gate />;
  return <Dashboard />;
}

function Gate() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });

    setLoading(false);
    if (error) {
      setErr(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card-elevated border border-border rounded-3xl shadow-card p-8"
      >
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
          <Lock className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-center tracking-tight">
          Admin <span className="text-gradient">Access</span>
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter your credentials to continue.
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErr("");
          }}
          placeholder="Email Address"
          required
          autoFocus
          className="mt-6 w-full px-4 py-3 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />

        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr("");
          }}
          placeholder="Password"
          required
          className="mt-3 w-full px-4 py-3 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />

        {err && (
          <p className="mt-2 text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:opacity-95 transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
            </>
          ) : (
            "Unlock Dashboard"
          )}
        </button>
        <Link
          to="/"
          className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground transition"
        >
          ← Back to site
        </Link>
      </motion.form>
    </div>
  );
}

type FormState = {
  id: Subtitle["id"] | null;
  title: string;
  image_url: string;
  download_link: string;
  telegram_link: string;
  description: string;
  rating: string;
  year: string;
  genre: string;
  season: string;
  episode: string;
  metatags: string;
};

const EMPTY: FormState = {
  id: null,
  title: "",
  image_url: "",
  download_link: "",
  telegram_link: "",
  description: "",
  rating: "",
  year: "",
  genre: "",
  season: "",
  episode: "",
  metatags: "",
};

const extractMediaId = (input: string): { id: string; type: "movie" | "tv" | null; isImdb: boolean } => {
  const clean = input.trim();
  if (clean.startsWith("tt")) {
    return { id: clean, type: null, isImdb: true };
  }
  const imdbMatch = clean.match(/imdb\.com\/title\/(tt\d+)/);
  if (imdbMatch) {
    return { id: imdbMatch[1], type: null, isImdb: true };
  }
  if (/^\d+$/.test(clean)) {
    return { id: clean, type: null, isImdb: false };
  }
  const tmdbMatch = clean.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
  if (tmdbMatch) {
    return { id: tmdbMatch[2], type: tmdbMatch[1] as "movie" | "tv", isImdb: false };
  }
  return { id: clean, type: null, isImdb: false };
};

const escapeHtml = (text: string) =>
  (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function parseComplexCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let entry = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          entry += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        entry += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(entry);
        entry = "";
      } else if (char === "\n" || char === "\r") {
        row.push(entry);
        entry = "";
        if (row.length > 0 && row.some((cell) => cell.trim() !== "")) {
          result.push(row);
        }
        row = [];
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
      } else {
        entry += char;
      }
    }
  }
  if (entry || row.length > 0) {
    row.push(entry);
    if (row.some((cell) => cell.trim() !== "")) {
      result.push(row);
    }
  }
  return result;
}

interface CSVUploaderProps {
  refetch: () => void;
}

function CSVUploader({ refetch }: CSVUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState("");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("Parsing CSV file...");
    setErrorDetails("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseComplexCSV(text);
        if (rows.length < 2) {
          throw new Error("CSV file is empty or formatted incorrectly.");
        }

        const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
        const parsedData: any[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const obj: any = {};

          headers.forEach((header, index) => {
            let value: any = row[index] !== undefined ? row[index] : null;
            if (typeof value === "string") {
              value = value.trim();
            }

            if (header === "title" || header === "image_url" || header === "download_link") {
              obj[header] = value || "";
            } else if (
              header === "telegram_link" ||
              header === "description" ||
              header === "genre" ||
              header === "metatags"
            ) {
              obj[header] = value || null;
            } else if (header === "rating" || header === "year") {
              obj[header] =
                value === null || value === ""
                  ? null
                  : Number.isNaN(Number(value))
                  ? value
                  : Number(value);
            } else if (header === "season" || header === "episode") {
              obj[header] = value === null || value === "" ? null : Number(value);
            } else {
              obj[header] = value;
            }
          });

          if (obj.title && obj.download_link) {
            obj.direct_downloads = 0;
            obj.telegram_downloads = 0;
            obj.download_count = 0;
            parsedData.push(obj);
          }
        }

        if (parsedData.length === 0) {
          throw new Error('No valid records containing both "title" and "download_link" were found.');
        }

        setMessage(`Uploading ${parsedData.length} records to Database...`);

        const { error } = await supabase.from(SUBTITLES_TABLE).insert(parsedData);
        if (error) throw error;

        setMessage(`Successfully uploaded ${parsedData.length} items via CSV! 🎉`);
        refetch();
      } catch (err: any) {
        console.error(err);
        setMessage("Upload Failed!");
        setErrorDetails(err.message || "Unknown database error occurred.");
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      setMessage("Error reading file.");
      setUploading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Upload multiple subtitles or episodes in bulk. CSV column headers must include:
        <code className="ml-1 px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono">
          title,download_link,image_url,genre,description,rating,year,season,episode,metatags,telegram_link
        </code>
      </p>

      <div className="pt-1">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="flex h-10 w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-bold file:text-primary hover:cursor-pointer disabled:opacity-50"
        />
      </div>

      {message && (
        <p
          className={`text-xs font-semibold flex items-center gap-1.5 ${
            message.includes("Successfully") ? "text-green-500" : "text-primary"
          }`}
        >
          {message.includes("Successfully") ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          {message}
        </p>
      )}
      {errorDetails && (
        <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 font-medium">
          Error: {errorDetails}
        </p>
      )}
    </div>
  );
}

type Status =
  | { type: "idle" }
  | { type: "saving" }
  | { type: "success"; msg: string }
  | { type: "error"; msg: string };

function Dashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"subtitles" | "requests" | "analytics">("subtitles");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [search, setSearch] = useState("");
  const [listTypeFilter, setListTypeFilter] = useState<"all" | "movie" | "tv">("all");

  // Friendly Mode Switcher: "movie" vs "tv"
  const [mediaMode, setMediaMode] = useState<"movie" | "tv">("movie");

  // TV Episode Helper State for rapid entry
  const [tvShowName, setTvShowName] = useState("");
  const [tvSeason, setTvSeason] = useState("1");
  const [tvEpisode, setTvEpisode] = useState("1");
  const [tvEpTitle, setTvEpTitle] = useState("");

  // TMDB Instant Search & Auto-Fill
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbKey, setTmdbKey] = useState(() => localStorage.getItem("pixelpop_tmdb_key") || "");
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);

  // Telegram Configuration & Controls
  const [tgEnabled, setTgEnabled] = useState(() => localStorage.getItem("pixelpop_tg_enabled") === "true");
  const [tgBotToken, setTgBotToken] = useState(() => localStorage.getItem("pixelpop_tg_bot_token") || "");
  const [tgChatId, setTgChatId] = useState(() => localStorage.getItem("pixelpop_tg_chat_id") || "");

  // Post to Telegram Checkbox (Default false on edit, true on new insert if tg configured)
  const [postToTelegram, setPostToTelegram] = useState(true);

  // Collapsible drawers
  const [showTgSettings, setShowTgSettings] = useState(false);
  const [showTmdbSettings, setShowTmdbSettings] = useState(false);
  const [showTmdbKey, setShowTmdbKey] = useState(false);
  const [showCsvUploader, setShowCsvUploader] = useState(false);

  // Analytics sub-tab & search
  const [analyticsTab, setAnalyticsTab] = useState<"all" | "movies" | "series" | "episodes" | "genres">("all");
  const [analyticsSearch, setAnalyticsSearch] = useState("");

  // Next Episode focus ref
  const downloadInputRef = useRef<HTMLInputElement | null>(null);

  // All Subtitles Query
  const { data: rows, refetch } = useQuery({
    queryKey: ["subtitles", "admin-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(SUBTITLES_TABLE)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: requests, refetch: refetchRequests } = useQuery({
    queryKey: ["subtitle_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtitle_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: true,
  });

  // Download Events Query
  const { data: downloadEvents, isLoading: analyticsLoading } = useQuery({
    queryKey: ["download_events", "admin-detailed"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("download_events")
        .select("subtitle_id, variant, downloaded_at")
        .gte("downloaded_at", since)
        .order("downloaded_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as { subtitle_id: number; variant?: string; downloaded_at: string }[];
    },
    enabled: true,
  });

  const editing = form.id !== null;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Keep dashboard data current when another admin or visitor changes it.
  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-live-data")
      .on("postgres_changes", { event: "*", schema: "public", table: SUBTITLES_TABLE }, () => qc.invalidateQueries({ queryKey: ["subtitles"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "subtitle_requests" }, () => qc.invalidateQueries({ queryKey: ["subtitle_requests"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "download_events" }, () => qc.invalidateQueries({ queryKey: ["download_events"] }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // When editing, default postToTelegram to false (to prevent accidental spam)
  useEffect(() => {
    if (editing) {
      setPostToTelegram(false);
    } else {
      setPostToTelegram(tgEnabled && Boolean(tgBotToken && tgChatId));
    }
  }, [editing, tgEnabled, tgBotToken, tgChatId]);

  // Keep composed title in sync for TV Series mode
  const updateTvTitle = (show: string, s: string, e: string, epT: string) => {
    const sPadded = s.trim() ? String(s.trim()).padStart(2, "0") : "01";
    const ePadded = e.trim() ? String(e.trim()).padStart(2, "0") : "01";
    const subTitle = epT.trim() ? ` - ${epT.trim()}` : "";
    const showClean = cleanShowName(show.trim());
    if (showClean) {
      set("title", `${showClean} S${sPadded}E${ePadded}${subTitle}`);
    }
  };

  const resetForm = () => {
    setForm(EMPTY);
    setTvEpTitle("");
    setStatus({ type: "idle" });
  };

  // TMDB Live Search & Direct Auto-fill
  const handleTmdbSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = tmdbQuery.trim();
    if (!query) {
      setStatus({ type: "error", msg: "Please enter a Movie or TV Show title or ID." });
      return;
    }
    if (!tmdbKey.trim()) {
      setStatus({ type: "error", msg: "Please enter your TMDB API Key in Settings below." });
      return;
    }

    setTmdbLoading(true);
    setStatus({ type: "idle" });
    setTmdbResults([]);

    try {
      const parsed = extractMediaId(query);

      // 1. Direct ID / IMDb / Link lookup
      if (parsed.isImdb || /^\d+$/.test(parsed.id)) {
        let data: any = null;
        let detectedType: "movie" | "tv" = mediaMode;

        if (parsed.isImdb) {
          const findRes = await fetch(
            `https://api.themoviedb.org/3/find/${parsed.id}?api_key=${tmdbKey}&external_source=imdb_id`
          );
          if (!findRes.ok) throw new Error("Failed to find IMDb ID on TMDB.");
          const findData = await findRes.json();
          if (findData.movie_results?.length > 0) {
            data = findData.movie_results[0];
            detectedType = "movie";
          } else if (findData.tv_results?.length > 0) {
            data = findData.tv_results[0];
            detectedType = "tv";
          } else {
            throw new Error("No movie or TV show found for this IMDb ID.");
          }
        } else {
          const activeType = parsed.type || mediaMode;
          detectedType = activeType;
          const res = await fetch(
            `https://api.themoviedb.org/3/${activeType}/${parsed.id}?api_key=${tmdbKey}&language=en-US`
          );
          if (!res.ok) throw new Error(`TMDB error ${res.status}. Check ID/Link & API Key.`);
          data = await res.json();
        }

        applyTmdbData(data, detectedType);
        return;
      }

      // 2. Text Search (Search Movies & TV Shows)
      const searchEndpoint = mediaMode === "movie" ? "search/movie" : "search/tv";
      const res = await fetch(
        `https://api.themoviedb.org/3/${searchEndpoint}?api_key=${tmdbKey}&query=${encodeURIComponent(
          query
        )}&page=1`
      );
      if (!res.ok) throw new Error(`TMDB returned status ${res.status}`);
      const data = await res.json();
      const results = data.results || [];
      if (results.length === 0) {
        setStatus({ type: "error", msg: `No ${mediaMode === "movie" ? "movies" : "TV shows"} found for "${query}"` });
      } else {
        setTmdbResults(results.slice(0, 6));
      }
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message || "Failed to fetch from TMDB." });
    } finally {
      setTmdbLoading(false);
    }
  };

  const applyTmdbData = (item: any, type: "movie" | "tv") => {
    setMediaMode(type);
    const title = item.title || item.name || "";
    const year =
      type === "movie"
        ? item.release_date
          ? item.release_date.split("-")[0]
          : ""
        : item.first_air_date
        ? item.first_air_date.split("-")[0]
        : "";

    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : "";
    const imageUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
    const overview = item.overview || "";

    // Genres: if array of objects or ids
    let genres = "";
    if (Array.isArray(item.genres)) {
      genres = item.genres.map((g: any) => g.name).join(", ");
    }

    if (type === "tv") {
      setTvShowName(title);
      set("season", tvSeason);
      set("episode", tvEpisode);
      updateTvTitle(title, tvSeason, tvEpisode, tvEpTitle);
    } else {
      set("title", year ? `${title} (${year})` : title);
      set("season", "");
      set("episode", "");
    }

    set("image_url", imageUrl);
    set("year", year);
    set("rating", rating);
    if (genres) set("genre", genres);
    set("description", overview);

    setTmdbResults([]);
    setStatus({ type: "success", msg: `Auto-filled details for "${title}"! ✨` });
  };

  const buildPayload = () => {
    const num = (v: string) => (v.trim() === "" ? null : Number.isNaN(Number(v)) ? v.trim() : Number(v));
    const s = form.season.trim() === "" ? null : Number(form.season);
    const e = form.episode.trim() === "" ? null : Number(form.episode);

    return {
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      download_link: form.download_link.trim(),
      telegram_link: form.telegram_link.trim() || null,
      description: form.description.trim() || null,
      rating: num(form.rating),
      year: num(form.year),
      genre: form.genre.trim() || null,
      season: s,
      episode: e,
      metatags: form.metatags.trim() || null,
    };
  };

  // Broadcast to Telegram Helper
  const sendTelegramBroadcast = async (row: any, isUpdate: boolean) => {
    if (!tgBotToken || !tgChatId) return;
    try {
      const siteUrl = "https://pixelpoplk.pages.dev";
      const isSeries = row.season != null && row.episode != null;
      const downloadTargetUrl = isSeries ? `${siteUrl}/episode/${row.id}` : `${siteUrl}/content/${row.id}`;

      let caption = isUpdate
        ? `<b>🔄 UPDATE: ${escapeHtml(row.title)}</b>\n\n`
        : `<b>🎬 NEW: ${escapeHtml(row.title)}</b>\n\n`;

      if (row.year) caption += `📅 <b>Year:</b> ${row.year}\n`;
      if (row.rating) caption += `⭐ <b>Rating:</b> ${row.rating}/10\n`;
      if (row.genre) caption += `🎭 <b>Genres:</b> ${escapeHtml(row.genre)}\n`;
      if (isSeries) {
        caption += `📺 <b>Season:</b> ${row.season} | <b>Episode:</b> ${row.episode}\n`;
      }
      if (row.description) {
        const desc =
          row.description.length > 250
            ? row.description.substring(0, 250) + "..."
            : row.description;
        caption += `\n📝 <b>Overview:</b>\n<i>${escapeHtml(desc)}</i>\n`;
      }

      caption += `\n📥 <b>Download Sinhala Subtitle:</b>\n`;
      caption += `<a href="${downloadTargetUrl}">Click Here to Download Subtitle</a>\n\n`;
      caption += `Join ${tgChatId.startsWith("@") ? tgChatId : "@pixelpoplk"} for more updates! ❤`;

      await fetch(`https://api.telegram.org/bot${tgBotToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId,
          photo: row.image_url || "https://pixelpoplk.pages.dev/og-banner.png",
          caption: caption,
          parse_mode: "HTML",
        }),
      });
    } catch (err) {
      console.error("Telegram broadcast failed:", err);
    }
  };

  const submit = async (e?: React.FormEvent, isNextEpisode: boolean = false) => {
    if (e) e.preventDefault();
    if (!form.title.trim() || !form.image_url.trim() || !form.download_link.trim()) {
      setStatus({ type: "error", msg: "Title, Image URL, and Download Link are required." });
      return;
    }

    setStatus({ type: "saving" });
    const payload = buildPayload();

    const query = editing
      ? supabase.from(SUBTITLES_TABLE).update(payload).eq("id", form.id as Subtitle["id"]).select()
      : supabase.from(SUBTITLES_TABLE).insert(payload).select();

    const { data: dbData, error } = await query;

    if (error) {
      setStatus({ type: "error", msg: error.message });
      return;
    }

    const savedRow = dbData?.[0];

    // Broadcast to Telegram if selected
    if (savedRow && postToTelegram) {
      await sendTelegramBroadcast(savedRow, editing);
    }

    if (isNextEpisode) {
      // 🚀 Auto-prepare next episode
      const nextEpNum = (Number(tvEpisode) || 1) + 1;
      const nextEpStr = String(nextEpNum);
      setTvEpisode(nextEpStr);
      setTvEpTitle("");
      set("episode", nextEpStr);
      set("download_link", "");
      set("telegram_link", "");
      set("id", null);
      updateTvTitle(tvShowName || form.title, tvSeason, nextEpStr, "");

      setStatus({
        type: "success",
        msg: `Episode ${nextEpNum - 1} saved! Ready for Episode ${nextEpNum}. ⚡`,
      });

      setTimeout(() => {
        downloadInputRef.current?.focus();
      }, 100);
    } else {
      setStatus({
        type: "success",
        msg: editing
          ? postToTelegram
            ? "Updated & broadcasted to Telegram!"
            : "Updated successfully!"
          : postToTelegram
          ? "Inserted & broadcasted to Telegram!"
          : "Inserted successfully!",
      });
      resetForm();
    }

    qc.invalidateQueries({ queryKey: ["subtitles"] });
    refetch();
  };

  const startEdit = (r: any) => {
    const isTv = r.season != null || r.episode != null;
    setMediaMode(isTv ? "tv" : "movie");

    if (isTv) {
      const parsed = parseTitle(r.title ?? "");
      setTvShowName(parsed.showName || r.title || "");
      setTvSeason(r.season != null ? String(r.season) : "1");
      setTvEpisode(r.episode != null ? String(r.episode) : "1");
      setTvEpTitle(parsed.episode?.episodeTitle || "");
    }

    setForm({
      id: r.id,
      title: r.title ?? "",
      image_url: r.image_url ?? "",
      download_link: r.download_link ?? "",
      telegram_link: r.telegram_link ?? "",
      description: r.description ?? "",
      rating: r.rating == null ? "" : String(r.rating),
      year: r.year == null ? "" : String(r.year),
      genre: r.genre ?? "",
      season: r.season == null ? "" : String(r.season),
      episode: r.episode == null ? "" : String(r.episode),
      metatags: r.metatags ?? "",
    });

    setPostToTelegram(false);
    setStatus({ type: "idle" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (r: any) => {
    if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from(SUBTITLES_TABLE).delete().eq("id", r.id);
    if (error) {
      setStatus({ type: "error", msg: error.message });
      return;
    }
    if (form.id === r.id) resetForm();
    qc.invalidateQueries({ queryKey: ["subtitles"] });
    refetch();
  };

  const toggleRequestStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    await supabase.from("subtitle_requests").update({ status: newStatus }).eq("id", id);
    refetchRequests();
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    await supabase.from("subtitle_requests").delete().eq("id", id);
    refetchRequests();
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* noop */
    }
  };

  // Subtitles Filter & List
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      const matchQ = !q || r.title?.toLowerCase().includes(q);
      const isTv = r.season != null || r.episode != null;
      if (listTypeFilter === "movie") return matchQ && !isTv;
      if (listTypeFilter === "tv") return matchQ && isTv;
      return matchQ;
    });
  }, [rows, search, listTypeFilter]);

  // 🟢 ADVANCED MULTI-DIMENSIONAL ANALYTICS ENGINE
  const analytics = useMemo(() => {
    const allRows = rows ?? [];
    const events = downloadEvents ?? [];
    const items = buildGridItems(allRows as any);

    // 1. All-time Totals
    const totalDirectAllTime = allRows.reduce((sum, r) => sum + (Number(r.direct_downloads) || 0), 0);
    const totalTelegramAllTime = allRows.reduce((sum, r) => sum + (Number(r.telegram_downloads) || 0), 0);
    const totalAllTime = totalDirectAllTime + totalTelegramAllTime;

    // 2. Movies vs Series Segregation
    const movieRows = allRows.filter((r) => r.season == null && r.episode == null);
    const tvEpisodeRows = allRows.filter((r) => r.season != null || r.episode != null);

    const movieDirectAll = movieRows.reduce((sum, r) => sum + (Number(r.direct_downloads) || 0), 0);
    const movieTgAll = movieRows.reduce((sum, r) => sum + (Number(r.telegram_downloads) || 0), 0);
    const movieTotalAll = movieDirectAll + movieTgAll;

    const tvDirectAll = tvEpisodeRows.reduce((sum, r) => sum + (Number(r.direct_downloads) || 0), 0);
    const tvTgAll = tvEpisodeRows.reduce((sum, r) => sum + (Number(r.telegram_downloads) || 0), 0);
    const tvTotalAll = tvDirectAll + tvTgAll;

    // 3. Today & 7 Days Calculations
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let todayDirect = 0;
    let todayTelegram = 0;
    let weekDirect = 0;
    let weekTelegram = 0;

    const dayBuckets = new Map<string, { direct: number; telegram: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      dayBuckets.set(d.toISOString().split("T")[0], { direct: 0, telegram: 0 });
    }

    const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      direct: 0,
      telegram: 0,
      total: 0,
    }));

    const itemTodayCounts = new Map<number, { direct: number; telegram: number }>();

    for (const ev of events) {
      const t = new Date(ev.downloaded_at);
      const isTg = ev.variant === "telegram";
      const h = t.getHours();

      hourlyCounts[h].total += 1;
      if (isTg) hourlyCounts[h].telegram += 1;
      else hourlyCounts[h].direct += 1;

      const dayKey = t.toISOString().split("T")[0];
      if (dayBuckets.has(dayKey)) {
        const b = dayBuckets.get(dayKey)!;
        if (isTg) b.telegram += 1;
        else b.direct += 1;
      }

      if (t >= sevenDaysAgo) {
        if (isTg) weekTelegram += 1;
        else weekDirect += 1;
      }

      if (t >= startOfToday) {
        if (isTg) todayTelegram += 1;
        else todayDirect += 1;

        const current = itemTodayCounts.get(ev.subtitle_id) ?? { direct: 0, telegram: 0 };
        if (isTg) current.telegram += 1;
        else current.direct += 1;
        itemTodayCounts.set(ev.subtitle_id, current);
      }
    }

    const todayTotal = todayDirect + todayTelegram;
    const weekTotal = weekDirect + weekTelegram;

    const dailyChartData = Array.from(dayBuckets.entries()).map(([date, counts]) => ({
      date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      direct: counts.direct,
      telegram: counts.telegram,
      total: counts.direct + counts.telegram,
    }));

    const distributionData = [
      { name: "Direct (.zip)", value: totalDirectAllTime || (totalAllTime ? 1 : 0), color: "#10b981" },
      { name: "Telegram", value: totalTelegramAllTime, color: "#0ea5e9" },
    ];

    // 4. Grouped TV Series Stats
    const seriesStats = items
      .filter((it) => it.kind === "series")
      .map((it: any) => {
        const directAll = it.episodes.reduce((s: number, e: any) => s + (Number(e.direct_downloads) || 0), 0);
        const tgAll = it.episodes.reduce((s: number, e: any) => s + (Number(e.telegram_downloads) || 0), 0);
        const total = directAll + tgAll;
        const avgPerEp = it.episodes.length > 0 ? Math.round(total / it.episodes.length) : 0;
        return {
          id: it.id,
          showName: it.showName,
          poster: it.poster,
          episodesCount: it.episodes.length,
          directAll,
          tgAll,
          total,
          avgPerEp,
        };
      })
      .sort((a, b) => b.total - a.total);

    // 5. Individual Top Movies
    const topMovies = movieRows
      .map((m) => {
        const directAll = Number(m.direct_downloads) || 0;
        const tgAll = Number(m.telegram_downloads) || 0;
        return {
          id: m.id,
          title: m.title,
          year: m.year,
          rating: m.rating,
          image_url: m.image_url,
          directAll,
          tgAll,
          total: directAll + tgAll,
        };
      })
      .sort((a, b) => b.total - a.total);

    // 6. Individual Top Episodes
    const topEpisodes = tvEpisodeRows
      .map((ep) => {
        const directAll = Number(ep.direct_downloads) || 0;
        const tgAll = Number(ep.telegram_downloads) || 0;
        return {
          id: ep.id,
          title: ep.title,
          season: ep.season,
          episode: ep.episode,
          image_url: ep.image_url,
          directAll,
          tgAll,
          total: directAll + tgAll,
        };
      })
      .sort((a, b) => b.total - a.total);

    // 7. Genre Analytics
    const genreMap = new Map<string, { titlesCount: number; direct: number; tg: number; total: number }>();
    for (const r of allRows) {
      const direct = Number(r.direct_downloads) || 0;
      const tg = Number(r.telegram_downloads) || 0;
      const rawGenres = splitGenres(r.genre || "Uncategorized");
      for (const g of rawGenres) {
        const cleanG = g.trim();
        if (!cleanG) continue;
        const existing = genreMap.get(cleanG) || { titlesCount: 0, direct: 0, tg: 0, total: 0 };
        existing.titlesCount += 1;
        existing.direct += direct;
        existing.tg += tg;
        existing.total += direct + tg;
        genreMap.set(cleanG, existing);
      }
    }

    const genreStats = Array.from(genreMap.entries())
      .map(([genre, data]) => ({
        genre,
        ...data,
      }))
      .sort((a, b) => b.total - a.total);

    // 8. Live Feed
    const recentFeed = events.slice(0, 15).map((ev) => {
      const match = allRows.find((r) => Number(r.id) === Number(ev.subtitle_id));
      return {
        id: `${ev.subtitle_id}-${ev.downloaded_at}`,
        title: match?.title || `Subtitle #${ev.subtitle_id}`,
        variant: ev.variant === "telegram" ? "telegram" : "direct",
        time: new Date(ev.downloaded_at).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
    });

    return {
      totalAllTime,
      totalDirectAllTime,
      totalTelegramAllTime,
      movieDirectAll,
      movieTgAll,
      movieTotalAll,
      movieCount: movieRows.length,
      tvDirectAll,
      tvTgAll,
      tvTotalAll,
      tvEpisodeCount: tvEpisodeRows.length,
      tvSeriesCount: seriesStats.length,
      todayTotal,
      todayDirect,
      todayTelegram,
      weekTotal,
      dailyChartData,
      distributionData,
      hourlyCounts,
      topMovies,
      seriesStats,
      topEpisodes,
      genreStats,
      recentFeed,
    };
  }, [rows, downloadEvents]);

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                <Subtitles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight">
                Pixel<span className="text-gradient">Pop</span>LK
              </span>
            </Link>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold tracking-wide">
              ADMIN
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive px-3 py-1.5 rounded-lg border border-border/60 hover:border-destructive/30 transition cursor-pointer"
            >
              Lock
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to site
            </Link>
          </div>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex border-b border-border/80 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("subtitles")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "subtitles"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="w-4 h-4" /> Add & Manage Subtitles
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "analytics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Advanced Analytics
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "requests"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            User Requests
            {requests && requests.filter((r: any) => r.status === "pending").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === "subtitles" && (
          <>
            {/* Quick Action Drawer Toggles (Telegram & CSV) */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTgSettings((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer font-medium ${
                    showTgSettings
                      ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram Bot Settings
                  {tgEnabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {showTgSettings ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTmdbSettings((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer font-medium ${
                    showTmdbSettings
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  TMDB API Settings
                  {tmdbKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {showTmdbSettings ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCsvUploader((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer font-medium ${
                    showCsvUploader
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Bulk CSV Upload
                  {showCsvUploader ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </button>
              </div>

              {editing && (
                <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                  <Pencil className="w-3.5 h-3.5" /> Editing: #{form.id} - {form.title}
                  <button onClick={resetForm} className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    ✕ Cancel
                  </button>
                </div>
              )}
            </div>

            {/* TMDB key is masked by default and used only by this signed-in browser. */}
            <AnimatePresence>
              {showTmdbSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card-elevated rounded-2xl border border-amber-500/20 p-5 shadow-card space-y-3 overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-500/15 grid place-items-center">
                      <Settings className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-amber-400">TMDB API configuration</h4>
                      <p className="mt-1 text-xs text-muted-foreground">Add your TMDB v3 API key to enable poster and metadata auto-fill. The field is masked by default and saved only in this browser.</p>
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TMDB API Key</span>
                    <div className="relative mt-1.5">
                      <input
                        type={showTmdbKey ? "text" : "password"}
                        value={tmdbKey}
                        onChange={(e) => {
                          setTmdbKey(e.target.value);
                          localStorage.setItem("pixelpop_tmdb_key", e.target.value);
                        }}
                        autoComplete="off"
                        placeholder="Paste your TMDB v3 API key"
                        className="w-full px-4 py-2.5 pr-12 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTmdbKey((visible) => !visible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                        aria-label={showTmdbKey ? "Hide TMDB API key" : "Show TMDB API key"}
                        title={showTmdbKey ? "Hide key" : "Show key"}
                      >
                        {showTmdbKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsible Telegram Settings Drawer */}
            <AnimatePresence>
              {showTgSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card-elevated rounded-2xl border border-border p-5 shadow-card space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Telegram Broadcast Bot Configuration
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tgEnabled}
                        onChange={(e) => {
                          setTgEnabled(e.target.checked);
                          localStorage.setItem("pixelpop_tg_enabled", e.target.checked ? "true" : "false");
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                      />
                      <span className="text-xs font-semibold text-foreground">Active Telegram Posting</span>
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <Field
                      label="Telegram Bot Token"
                      value={tgBotToken}
                      onChange={(v) => {
                        setTgBotToken(v);
                        localStorage.setItem("pixelpop_tg_bot_token", v);
                      }}
                      placeholder="e.g. 7123456789:AAH..."
                    />
                    <Field
                      label="Channel Username or Chat ID"
                      value={tgChatId}
                      onChange={(v) => {
                        setTgChatId(v);
                        localStorage.setItem("pixelpop_tg_chat_id", v);
                      }}
                      placeholder="e.g. @pixelpoplk or -100..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsible CSV Drawer */}
            <AnimatePresence>
              {showCsvUploader && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card-elevated rounded-2xl border border-border p-5 shadow-card overflow-hidden"
                >
                  <CSVUploader refetch={refetch} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subtitles Input Form */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={(e) => submit(e, false)}
              className="bg-card-elevated rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-6"
            >
              {/* Header: Type Switcher & TMDB Live Search */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border">
                {/* Mode Switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground mr-1">Upload Mode:</span>
                  <div className="inline-flex p-1 bg-muted/70 rounded-2xl border border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaMode("movie");
                        set("season", "");
                        set("episode", "");
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        mediaMode === "movie"
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" /> Movie
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaMode("tv");
                        set("season", tvSeason || "1");
                        set("episode", tvEpisode || "1");
                        updateTvTitle(tvShowName, tvSeason || "1", tvEpisode || "1", tvEpTitle);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        mediaMode === "tv"
                          ? "bg-gradient-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Tv className="w-3.5 h-3.5" /> TV Series Episode
                    </button>
                  </div>
                </div>

                {/* TMDB Quick Search Bar */}
                <div className="relative flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={tmdbQuery}
                      onChange={(e) => setTmdbQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleTmdbSearch();
                        }
                      }}
                      placeholder={`Search ${mediaMode === "movie" ? "Movie" : "TV Show"} title or IMDb tt...`}
                      className="pl-8 pr-3 py-2 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs w-64 sm:w-72"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTmdbSearch()}
                    disabled={tmdbLoading}
                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {tmdbLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                    Auto-Fill
                  </button>
                </div>
              </div>

              {/* TMDB Search Results Dropdown Cards */}
              {tmdbResults.length > 0 && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>Select matching {mediaMode === "movie" ? "Movie" : "TV Series"}:</span>
                    <button onClick={() => setTmdbResults([])} className="hover:text-foreground">✕ Close</button>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {tmdbResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyTmdbData(item, mediaMode)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card/60 hover:border-primary/50 hover:bg-card transition text-left cursor-pointer"
                      >
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          {item.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-[9px] text-muted-foreground">No img</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate text-foreground">{item.title || item.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.release_date?.split("-")[0] || item.first_air_date?.split("-")[0] || "—"} • ⭐ {item.vote_average ? Number(item.vote_average).toFixed(1) : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">{item.overview || ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TV Series Specific Rapid Workflow Box */}
              {mediaMode === "tv" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
                      <Tv className="w-4 h-4" /> TV Episode Quick Setup
                    </span>
                    <span className="text-[11px] text-muted-foreground">Title auto-composes as you type</span>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <Field
                        label="Show Name *"
                        value={tvShowName}
                        onChange={(v) => {
                          setTvShowName(v);
                          updateTvTitle(v, tvSeason, tvEpisode, tvEpTitle);
                        }}
                        placeholder="e.g. Breaking Bad"
                      />
                    </div>
                    <div>
                      <Field
                        label="Season #"
                        value={tvSeason}
                        onChange={(v) => {
                          setTvSeason(v);
                          set("season", v);
                          updateTvTitle(tvShowName, v, tvEpisode, tvEpTitle);
                        }}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Field
                        label="Episode #"
                        value={tvEpisode}
                        onChange={(v) => {
                          setTvEpisode(v);
                          set("episode", v);
                          updateTvTitle(tvShowName, tvSeason, v, tvEpTitle);
                        }}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <Field
                      label="Episode Title (Optional)"
                      value={tvEpTitle}
                      onChange={(v) => {
                        setTvEpTitle(v);
                        updateTvTitle(tvShowName, tvSeason, tvEpisode, v);
                      }}
                      placeholder="e.g. Pilot / Ozymandias"
                    />
                  </div>
                </div>
              )}

              {/* Form Core Fields */}
              <div className="grid lg:grid-cols-[1fr_240px] gap-8">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Field
                      label="Full Title *"
                      value={form.title}
                      onChange={(v) => set("title", v)}
                      placeholder={mediaMode === "movie" ? "e.g. Inception (2010)" : "e.g. Breaking Bad S01E01"}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Field
                      label="Direct Download Link (.zip) *"
                      value={form.download_link}
                      onChange={(v) => set("download_link", v)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Field
                      label="Telegram Download Link (Optional Video/File Link)"
                      value={form.telegram_link}
                      onChange={(v) => set("telegram_link", v)}
                      placeholder="https://t.me/pixelpoplk/1234"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Field
                      label="Image Poster URL *"
                      value={form.image_url}
                      onChange={(v) => set("image_url", v)}
                      placeholder="https://image.tmdb.org/t/p/..."
                    />
                  </div>

                  <Field label="Release Year" value={form.year} onChange={(v) => set("year", v)} placeholder="2024" />
                  <Field label="IMDb Rating" value={form.rating} onChange={(v) => set("rating", v)} placeholder="8.5" />

                  <div className="sm:col-span-2">
                    <Field
                      label="Genre(s) (comma-separated)"
                      value={form.genre}
                      onChange={(v) => set("genre", v)}
                      placeholder="Action, Thriller, Sci-Fi"
                    />
                  </div>

                  {form.genre && (
                    <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                      {splitGenres(form.genre).map((g) => (
                        <span
                          key={g}
                          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${genreBadgeClass(
                            g.toLowerCase()
                          )}`}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  <label className="sm:col-span-2 block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</span>
                    <textarea
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      rows={3}
                      placeholder="Movie or Episode synopsis…"
                      className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-sm resize-y"
                    />
                  </label>
                </div>

                {/* Right: Poster Preview & Telegram Post Toggle */}
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
                      Poster Preview
                    </span>
                    <div className="rounded-2xl overflow-hidden border border-border aspect-[2/3] bg-muted relative shadow-sm">
                      {form.image_url ? (
                        <img
                          src={form.image_url}
                          alt="Poster Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xs text-muted-foreground p-4 text-center">
                          No poster image provided
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 🟢 TELEGRAM BROADCAST TOGGLE (For both Insert & Edit) */}
                  <div className="p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={postToTelegram}
                        onChange={(e) => setPostToTelegram(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          {editing ? "📢 Broadcast update to Telegram" : "📢 Broadcast to Telegram Channel"}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                          {editing
                            ? "Check this if you want to notify users about changes on Telegram."
                            : "Auto-sends poster, title and link to your Telegram channel."}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={status.type === "saving"}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    {status.type === "saving" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                      </>
                    ) : editing ? (
                      <>
                        <Save className="w-4 h-4" /> Update Subtitle
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Publish Subtitle
                      </>
                    )}
                  </button>

                  {/* Next Episode Button (Series Fast Flow) */}
                  {mediaMode === "tv" && !editing && (
                    <button
                      type="button"
                      onClick={() => submit(undefined, true)}
                      disabled={status.type === "saving"}
                      className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full bg-sky-500 text-white font-bold text-sm shadow-[0_4px_15px_rgba(14,165,233,0.35)] hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FastForward className="w-4 h-4" /> Save & Next Ep (E{Number(tvEpisode) + 1})
                    </button>
                  )}

                  {editing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full border border-border text-sm font-semibold hover:border-primary/40 hover:text-primary transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Cancel Edit
                    </button>
                  )}
                </div>

                {status.type === "success" && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" /> {status.msg}
                  </span>
                )}
                {status.type === "error" && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20 animate-shake">
                    <AlertCircle className="w-4 h-4" /> {status.msg}
                  </span>
                )}
              </div>
            </motion.form>

            {/* Subtitles List Management Table */}
            <section className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    Catalog Subtitles <span className="text-xs font-normal text-muted-foreground ml-1">({filtered.length})</span>
                  </h2>
                  <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border text-xs">
                    <button
                      onClick={() => setListTypeFilter("all")}
                      className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        listTypeFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      All ({rows?.length ?? 0})
                    </button>
                    <button
                      onClick={() => setListTypeFilter("movie")}
                      className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        listTypeFilter === "movie" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      Movies ({analytics.movieCount})
                    </button>
                    <button
                      onClick={() => setListTypeFilter("tv")}
                      className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        listTypeFilter === "tv" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      TV Episodes ({analytics.tvEpisodeCount})
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search titles in database…"
                    className="pl-9 pr-4 py-2 rounded-full bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs w-64"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden bg-card/40 shadow-sm">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur text-xs uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Poster</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Downloads</th>
                        <th className="px-4 py-3">Links</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((r: any) => {
                        const isTv = r.season != null || r.episode != null;
                        const directCount = Number(r.direct_downloads) || 0;
                        const tgCount = Number(r.telegram_downloads) || 0;
                        const total = directCount + tgCount;

                        return (
                          <tr key={r.id} className="hover:bg-muted/20 transition">
                            <td className="px-4 py-2.5">
                              <div className="w-9 h-12 rounded-md overflow-hidden bg-muted">
                                {r.image_url ? (
                                  <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full grid place-items-center text-[9px] text-muted-foreground">—</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-medium max-w-sm">
                              <span className="text-foreground font-semibold block truncate">{r.title}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {r.year || "—"} • ⭐ {r.rating || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {isTv ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                  S{r.season} E{r.episode}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  Movie
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="text-xs">
                                <span className="font-bold text-foreground">{total}</span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {directCount} dir • {tgCount} tg
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                {r.download_link && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Direct Download link active" />
                                )}
                                {r.telegram_link ? (
                                  <span className="w-2 h-2 rounded-full bg-sky-400" title="Telegram link active" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" title="No telegram link" />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  to={isTv ? "/episode/$id" : "/content/$id"}
                                  params={{ id: String(r.id) }}
                                  target="_blank"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                                  title="View Page"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => startEdit(r)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition cursor-pointer"
                                  title="Edit Subtitle"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => remove(r)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                                  title="Delete Subtitle"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {/* 🟢 ADVANCED INTELLIGENCE & ANALYTICS SUITE */}
        {activeTab === "analytics" && (
          <section className="space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-primary" /> Advanced Download Intelligence
                </h2>
                <p className="text-xs text-muted-foreground">
                  Deep analysis across Movies, TV Series, Episodes, and Genres.
                </p>
              </div>

              {/* Sub-Tabs Selector */}
              <div className="inline-flex p-1 bg-muted/60 rounded-2xl border border-border text-xs font-bold overflow-x-auto">
                <button
                  onClick={() => setAnalyticsTab("all")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                    analyticsTab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🌐 Overview
                </button>
                <button
                  onClick={() => setAnalyticsTab("movies")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                    analyticsTab === "movies" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🎬 Movies ({analytics.movieCount})
                </button>
                <button
                  onClick={() => setAnalyticsTab("series")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                    analyticsTab === "series" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📺 TV Series ({analytics.tvSeriesCount})
                </button>
                <button
                  onClick={() => setAnalyticsTab("episodes")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                    analyticsTab === "episodes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🎞️ Episodes ({analytics.tvEpisodeCount})
                </button>
                <button
                  onClick={() => setAnalyticsTab("genres")}
                  className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                    analyticsTab === "genres" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🎭 Genres
                </button>
              </div>
            </div>

            {analyticsLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Syncing live download telemetry…
              </p>
            )}

            {/* TAB 1: 🌐 OVERVIEW */}
            {analyticsTab === "all" && (
              <div className="space-y-6">
                {/* 6 Key KPI Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="rounded-2xl border border-border bg-card/40 p-4 shadow-sm">
                    <div className="text-muted-foreground text-xs font-semibold uppercase flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" /> Total Downloads
                    </div>
                    <p className="text-2xl font-black mt-2 text-foreground">{analytics.totalAllTime.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">All-time lifetime downloads</span>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
                    <div className="text-emerald-400 text-xs font-semibold uppercase flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Direct Downloads
                    </div>
                    <p className="text-2xl font-black mt-2 text-emerald-400">
                      {analytics.totalDirectAllTime.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {analytics.totalAllTime
                        ? Math.round((analytics.totalDirectAllTime / analytics.totalAllTime) * 100)
                        : 0}
                      % of total volume
                    </span>
                  </div>

                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 shadow-sm">
                    <div className="text-sky-400 text-xs font-semibold uppercase flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Telegram Downloads
                    </div>
                    <p className="text-2xl font-black mt-2 text-sky-400">
                      {analytics.totalTelegramAllTime.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {analytics.totalAllTime
                        ? Math.round((analytics.totalTelegramAllTime / analytics.totalAllTime) * 100)
                        : 0}
                      % of total volume
                    </span>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
                    <div className="text-amber-400 text-xs font-semibold uppercase flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" /> Downloads Today
                    </div>
                    <p className="text-2xl font-black mt-2 text-amber-400">{analytics.todayTotal.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">
                      Direct: {analytics.todayDirect} • TG: {analytics.todayTelegram}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/40 p-4 shadow-sm">
                    <div className="text-muted-foreground text-xs font-semibold uppercase flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Last 7 Days
                    </div>
                    <p className="text-2xl font-black mt-2 text-foreground">{analytics.weekTotal.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">7-day rolling traffic</span>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/40 p-4 shadow-sm">
                    <div className="text-muted-foreground text-xs font-semibold uppercase flex items-center gap-1.5">
                      <Subtitles className="w-3.5 h-3.5 text-cyan-400" /> Total Titles
                    </div>
                    <p className="text-2xl font-black mt-2 text-foreground">{(rows ?? []).length.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {analytics.movieCount} Movies • {analytics.tvEpisodeCount} Eps
                    </span>
                  </div>
                </div>

                {/* Visual Charts Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Daily Stacked Bar Chart */}
                  <div className="lg:col-span-2 rounded-3xl border border-border bg-card/40 p-6 shadow-card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> 14-Day Traffic Velocity (Direct vs Telegram)
                      </h3>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Direct
                        </span>
                        <span className="flex items-center gap-1.5 text-sky-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Telegram
                        </span>
                      </div>
                    </div>

                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                          <XAxis dataKey="date" tick={{ fill: "oklch(0.7 0 0)", fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "oklch(0.7 0 0)", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              background: "oklch(0.18 0.01 20)",
                              border: "1px solid oklch(1 0 0 / 0.15)",
                              borderRadius: 12,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="direct" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name="Direct (.zip)" />
                          <Bar dataKey="telegram" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Telegram" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Donut Chart: Ratio */}
                  <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card flex flex-col items-center justify-between">
                    <h3 className="text-xs font-bold tracking-wide uppercase text-primary flex items-center gap-2 w-full">
                      <PieIcon className="w-4 h-4" /> Download Share Ratio
                    </h3>

                    <div className="h-56 w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.distributionData}
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analytics.distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "oklch(0.18 0.01 20)",
                              border: "1px solid oklch(1 0 0 / 0.15)",
                              borderRadius: 12,
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black">{analytics.totalAllTime.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Total</span>
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-border/60 text-xs">
                      <div className="flex flex-col p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-emerald-400 font-bold text-sm">
                          {analytics.totalAllTime
                            ? Math.round((analytics.totalDirectAllTime / analytics.totalAllTime) * 100)
                            : 0}
                          %
                        </span>
                        <span className="text-muted-foreground text-[10px]">Direct (.zip)</span>
                      </div>
                      <div className="flex flex-col p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
                        <span className="text-sky-400 font-bold text-sm">
                          {analytics.totalAllTime
                            ? Math.round((analytics.totalTelegramAllTime / analytics.totalAllTime) * 100)
                            : 0}
                          %
                        </span>
                        <span className="text-muted-foreground text-[10px]">Telegram</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Peak Hours & Recent Downloads Stream */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Hourly traffic */}
                  <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card space-y-3">
                    <h3 className="text-xs font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" /> Peak Traffic Hours (24h Distribution)
                    </h3>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.hourlyCounts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                          <XAxis dataKey="hour" tick={{ fill: "oklch(0.7 0 0)", fontSize: 9 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "oklch(0.7 0 0)", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              background: "oklch(0.18 0.01 20)",
                              border: "1px solid oklch(1 0 0 / 0.15)",
                              borderRadius: 12,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="total" fill="oklch(0.62 0.24 25)" radius={[3, 3, 0, 0]} name="Downloads" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Real-time event stream */}
                  <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card space-y-3">
                    <h3 className="text-xs font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Telemetry Feed
                    </h3>
                    <div className="rounded-2xl border border-border overflow-hidden bg-card/60">
                      <div className="overflow-x-auto max-h-60">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-border">
                            {analytics.recentFeed.map((rf) => (
                              <tr key={rf.id} className="hover:bg-muted/30 transition">
                                <td className="px-4 py-2.5 font-medium max-w-[200px] truncate text-foreground">
                                  {rf.title}
                                </td>
                                <td className="px-4 py-2.5">
                                  {rf.variant === "telegram" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-bold text-[10px]">
                                      Telegram
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                                      Direct .zip
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">{rf.time}</td>
                              </tr>
                            ))}
                            {analytics.recentFeed.length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                  No download events recorded recently.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 🎬 MOVIES ANALYTICS */}
            {analyticsTab === "movies" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border border-border bg-card/40 shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Total Movie Downloads</span>
                    <p className="text-2xl font-black mt-1 text-primary">{analytics.movieTotalAll.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">Across all movies</span>
                  </div>
                  <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                    <span className="text-xs text-emerald-400 uppercase font-semibold">Direct Downloads</span>
                    <p className="text-2xl font-black mt-1 text-emerald-400">{analytics.movieDirectAll.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {analytics.movieTotalAll ? Math.round((analytics.movieDirectAll / analytics.movieTotalAll) * 100) : 0}% of movie traffic
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 shadow-sm">
                    <span className="text-xs text-sky-400 uppercase font-semibold">Telegram Downloads</span>
                    <p className="text-2xl font-black mt-1 text-sky-400">{analytics.movieTgAll.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {analytics.movieTotalAll ? Math.round((analytics.movieTgAll / analytics.movieTotalAll) * 100) : 0}% of movie traffic
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-card/40 shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Movies in Catalog</span>
                    <p className="text-2xl font-black mt-1 text-foreground">{analytics.movieCount}</p>
                    <span className="text-[10px] text-muted-foreground">Active movie titles</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase text-foreground flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" /> Top Movies by Lifetime Downloads
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={analyticsSearch}
                        onChange={(e) => setAnalyticsSearch(e.target.value)}
                        placeholder="Search movies…"
                        className="pl-8 pr-3 py-1.5 rounded-full bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs w-56"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border overflow-hidden bg-card/60">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/90 backdrop-blur text-xs uppercase text-muted-foreground border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-left">#</th>
                            <th className="px-4 py-3 text-left">Movie Title</th>
                            <th className="px-4 py-3 text-left">Year</th>
                            <th className="px-4 py-3 text-left">Direct (.zip)</th>
                            <th className="px-4 py-3 text-left">Telegram</th>
                            <th className="px-4 py-3 text-left">Total</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {analytics.topMovies
                            .filter((m) => !analyticsSearch || m.title.toLowerCase().includes(analyticsSearch.toLowerCase()))
                            .map((m, i) => (
                              <tr key={m.id} className="hover:bg-muted/20 transition">
                                <td className="px-4 py-3 text-muted-foreground font-semibold">{i + 1}</td>
                                <td className="px-4 py-3 font-semibold text-foreground max-w-xs truncate">{m.title}</td>
                                <td className="px-4 py-3 text-muted-foreground">{m.year || "—"}</td>
                                <td className="px-4 py-3 text-emerald-400 font-bold">{m.directAll.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sky-400 font-bold">{m.tgAll.toLocaleString()}</td>
                                <td className="px-4 py-3 font-black text-primary">{m.total.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                  <Link
                                    to="/content/$id"
                                    params={{ id: String(m.id) }}
                                    target="_blank"
                                    className="text-xs text-primary hover:underline font-semibold"
                                  >
                                    View
                                  </Link>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 📺 TV SERIES ANALYTICS */}
            {analyticsTab === "series" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border border-border bg-card/40 shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Total Series Downloads</span>
                    <p className="text-2xl font-black mt-1 text-sky-400">{analytics.tvTotalAll.toLocaleString()}</p>
                    <span className="text-[10px] text-muted-foreground">Combined across all episodes</span>
                  </div>
                  <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                    <span className="text-xs text-emerald-400 uppercase font-semibold">Total TV Episodes</span>
                    <p className="text-2xl font-black mt-1 text-emerald-400">{analytics.tvEpisodeCount}</p>
                    <span className="text-[10px] text-muted-foreground">In active catalog</span>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-card/40 shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Unique TV Series</span>
                    <p className="text-2xl font-black mt-1 text-foreground">{analytics.tvSeriesCount}</p>
                    <span className="text-[10px] text-muted-foreground">Distinct TV shows</span>
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-card/40 shadow-sm">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Avg Downloads / Episode</span>
                    <p className="text-2xl font-black mt-1 text-amber-400">
                      {analytics.tvEpisodeCount ? Math.round(analytics.tvTotalAll / analytics.tvEpisodeCount) : 0}
                    </p>
                    <span className="text-[10px] text-muted-foreground">Per episode metric</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase text-foreground flex items-center gap-2">
                      <Tv className="w-4 h-4 text-sky-400" /> TV Series Leaderboard (Combined Episode Downloads)
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={analyticsSearch}
                        onChange={(e) => setAnalyticsSearch(e.target.value)}
                        placeholder="Search series…"
                        className="pl-8 pr-3 py-1.5 rounded-full bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs w-56"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border overflow-hidden bg-card/60">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/90 backdrop-blur text-xs uppercase text-muted-foreground border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-left">#</th>
                            <th className="px-4 py-3 text-left">Series Show Name</th>
                            <th className="px-4 py-3 text-left">Episodes</th>
                            <th className="px-4 py-3 text-left">Direct (.zip)</th>
                            <th className="px-4 py-3 text-left">Telegram</th>
                            <th className="px-4 py-3 text-left">Total Downloads</th>
                            <th className="px-4 py-3 text-left">Avg / Episode</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {analytics.seriesStats
                            .filter((s) => !analyticsSearch || s.showName.toLowerCase().includes(analyticsSearch.toLowerCase()))
                            .map((s, i) => (
                              <tr key={s.id} className="hover:bg-muted/20 transition">
                                <td className="px-4 py-3 text-muted-foreground font-semibold">{i + 1}</td>
                                <td className="px-4 py-3 font-bold text-foreground max-w-xs truncate">{s.showName}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20">
                                    {s.episodesCount} eps
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-emerald-400 font-semibold">{s.directAll.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sky-400 font-semibold">{s.tgAll.toLocaleString()}</td>
                                <td className="px-4 py-3 font-black text-primary">{s.total.toLocaleString()}</td>
                                <td className="px-4 py-3 text-muted-foreground font-semibold">{s.avgPerEp}</td>
                                <td className="px-4 py-3 text-right">
                                  <Link
                                    to="/content/$id"
                                    params={{ id: String(s.id) }}
                                    target="_blank"
                                    className="text-xs text-primary hover:underline font-semibold"
                                  >
                                    View Hub
                                  </Link>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 🎞️ EPISODES ANALYTICS */}
            {analyticsTab === "episodes" && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase text-foreground flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500" /> Individual TV Episodes Leaderboard
                      </h3>
                      <p className="text-xs text-muted-foreground">Shows which specific episodes generate the highest engagement.</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={analyticsSearch}
                        onChange={(e) => setAnalyticsSearch(e.target.value)}
                        placeholder="Search episodes…"
                        className="pl-8 pr-3 py-1.5 rounded-full bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs w-56"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border overflow-hidden bg-card/60">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/90 backdrop-blur text-xs uppercase text-muted-foreground border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-left">#</th>
                            <th className="px-4 py-3 text-left">Episode Title</th>
                            <th className="px-4 py-3 text-left">Season / Ep</th>
                            <th className="px-4 py-3 text-left">Direct (.zip)</th>
                            <th className="px-4 py-3 text-left">Telegram</th>
                            <th className="px-4 py-3 text-left">Total</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {analytics.topEpisodes
                            .filter((e) => !analyticsSearch || e.title.toLowerCase().includes(analyticsSearch.toLowerCase()))
                            .map((ep, i) => (
                              <tr key={ep.id} className="hover:bg-muted/20 transition">
                                <td className="px-4 py-3 text-muted-foreground font-semibold">{i + 1}</td>
                                <td className="px-4 py-3 font-semibold text-foreground max-w-xs truncate">{ep.title}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20">
                                    S{ep.season} E{ep.episode}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-emerald-400 font-semibold">{ep.directAll.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sky-400 font-semibold">{ep.tgAll.toLocaleString()}</td>
                                <td className="px-4 py-3 font-black text-primary">{ep.total.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                  <Link
                                    to="/episode/$id"
                                    params={{ id: String(ep.id) }}
                                    target="_blank"
                                    className="text-xs text-primary hover:underline font-semibold"
                                  >
                                    View Episode
                                  </Link>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: 🎭 GENRES ANALYTICS */}
            {analyticsTab === "genres" && (
              <div className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Genre Bar Chart */}
                  <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card space-y-3">
                    <h3 className="text-xs font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Download Volume by Genre
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.genreStats.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                          <XAxis dataKey="genre" tick={{ fill: "oklch(0.7 0 0)", fontSize: 10 }} angle={-25} textAnchor="end" />
                          <YAxis allowDecimals={false} tick={{ fill: "oklch(0.7 0 0)", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              background: "oklch(0.18 0.01 20)",
                              border: "1px solid oklch(1 0 0 / 0.15)",
                              borderRadius: 12,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Total Downloads" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Genre Breakdown Table */}
                  <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card space-y-3">
                    <h3 className="text-xs font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500" /> Genre Performance Share
                    </h3>
                    <div className="rounded-2xl border border-border overflow-hidden bg-card/60">
                      <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted/90 backdrop-blur text-[10px] uppercase text-muted-foreground border-b border-border">
                            <tr>
                              <th className="px-3 py-2 text-left">Genre</th>
                              <th className="px-3 py-2 text-left">Titles</th>
                              <th className="px-3 py-2 text-left">Direct</th>
                              <th className="px-3 py-2 text-left">Telegram</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {analytics.genreStats.map((g) => (
                              <tr key={g.genre} className="hover:bg-muted/20 transition">
                                <td className="px-3 py-2 font-bold text-foreground">{g.genre}</td>
                                <td className="px-3 py-2 text-muted-foreground">{g.titlesCount}</td>
                                <td className="px-3 py-2 text-emerald-400 font-semibold">{g.direct.toLocaleString()}</td>
                                <td className="px-3 py-2 text-sky-400 font-semibold">{g.tg.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right font-black text-primary">{g.total.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: USER REQUESTS */}
        {activeTab === "requests" && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Subtitle Requests from Users</h2>
            <div className="rounded-2xl border border-border overflow-hidden bg-card/40 shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">User Notes</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(requests ?? []).map((req: any) => (
                      <tr key={req.id} className="hover:bg-muted/20 transition">
                        <td className="px-4 py-3 font-medium text-foreground">{req.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                              req.type === "tv"
                                ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {req.type === "tv" ? "TV Series" : "Movie"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={req.notes}>
                          {req.notes ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRequestStatus(req.id, req.status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                              req.status === "completed"
                                ? "bg-green-500/15 text-green-500 border-green-500/30"
                                : "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                            }`}
                          >
                            {req.status === "completed" ? "Completed" : "Pending"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition"
      />
    </label>
  );
}
