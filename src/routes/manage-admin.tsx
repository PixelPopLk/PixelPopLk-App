import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { supabase, SUBTITLES_TABLE, type Subtitle } from "@/integrations/supabase/client";
import { splitGenres, genreBadgeClass, buildGridItems } from "@/lib/subtitles";

export const Route = createFileRoute("/manage-admin")({
  head: () => ({
    meta: [{ title: "Admin — PixelPopLK" }, { name: "robots", content: "noindex" }],
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

// 🟢 Smart ID Extraction (TMDB link, TMDB ID, හෝ IMDb tt... ID)
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

// 🟢 Telegram HTML Entities Fix (&, <, > ගැටලුව සම්පූර්ණයෙන්ම වළක්වයි)
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function parseComplexCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let entry = "";
  let inQuotes = false;

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
    <div className="bg-card-elevated rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-4">
      <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
        <Upload className="w-4 h-4 text-primary" /> Bulk Upload via CSV (Subtitles / Episodes)
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Upload multiple episodes instantly. CSV Headers must match:
        <code className="ml-1 px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono">
          title,download_link,image_url,genre,description,rating,year,season,episode,metatags,telegram_link
        </code>
      </p>

      <div className="pt-2">
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

  const [tmdbId, setTmdbId] = useState("");
  const [tmdbType, setTmdbType] = useState<"movie" | "tv">("movie");
  const [tmdbKey, setTmdbKey] = useState(() => localStorage.getItem("pixelpop_tmdb_key") || "");
  const [tmdbLoading, setTmdbLoading] = useState(false);

  const [tgEnabled, setTgEnabled] = useState(() => localStorage.getItem("pixelpop_tg_enabled") === "true");
  const [tgBotToken, setTgBotToken] = useState(() => localStorage.getItem("pixelpop_tg_bot_token") || "");
  const [tgChatId, setTgChatId] = useState(() => localStorage.getItem("pixelpop_tg_chat_id") || "");

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
    enabled: activeTab === "requests",
  });

  // 🟢 Download Events Query (Direct සහ Telegram වෙන වෙනම තත්පරයෙන් කියවා ගැනීම)
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
    enabled: activeTab === "analytics",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((r) => r.title?.toLowerCase().includes(q));
  }, [rows, search]);

  // 🟢 ADVANCED ANALYTICS ENGINE (Direct vs Telegram Deep Analysis)
  const analytics = useMemo(() => {
    const allRows = rows ?? [];
    const events = downloadEvents ?? [];
    const items = buildGridItems(allRows as any);

    // 1. All-time Totals from columns
    const totalDirectAllTime = allRows.reduce((sum, r) => sum + (Number(r.direct_downloads) || 0), 0);
    const totalTelegramAllTime = allRows.reduce((sum, r) => sum + (Number(r.telegram_downloads) || 0), 0);
    const totalAllTime = totalDirectAllTime + totalTelegramAllTime;

    // 2. Today & Week calculations
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let todayDirect = 0;
    let todayTelegram = 0;
    let weekDirect = 0;
    let weekTelegram = 0;

    // Day-by-Day comparison (Last 14 Days)
    const dayBuckets = new Map<string, { direct: number; telegram: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      dayBuckets.set(d.toISOString().split("T")[0], { direct: 0, telegram: 0 });
    }

    // Peak Activity Hours (00:00 to 23:00)
    const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      direct: 0,
      telegram: 0,
      total: 0,
    }));

    // Item-specific counters
    const itemTodayCounts = new Map<number, { direct: number; telegram: number }>();

    for (const ev of events) {
      const t = new Date(ev.downloaded_at);
      const isTg = ev.variant === "telegram";
      const h = t.getHours();

      hourlyCounts[h].total += 1;
      if (isTg) {
        hourlyCounts[h].telegram += 1;
      } else {
        hourlyCounts[h].direct += 1;
      }

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

    // Donut Ratio Data
    const distributionData = [
      { name: "Direct (.zip)", value: totalDirectAllTime || (totalAllTime ? 1 : 0), color: "#10b981" },
      { name: "Telegram", value: totalTelegramAllTime, color: "#0ea5e9" },
    ];

    // Item stats with Direct & Telegram breakdown
    const itemStats = items.map((it) => {
      if (it.kind === "movie") {
        const id = Number(it.sub.id);
        const directAll = Number(it.sub.direct_downloads) || 0;
        const tgAll = Number(it.sub.telegram_downloads) || 0;
        const todayStats = itemTodayCounts.get(id) ?? { direct: 0, telegram: 0 };
        return {
          key: it.key,
          title: it.sub.title,
          linkId: it.sub.id,
          episodeCount: null as number | null,
          directAll,
          tgAll,
          totalAll: directAll + tgAll,
          todayDirect: todayStats.direct,
          todayTg: todayStats.telegram,
          todayTotal: todayStats.direct + todayStats.telegram,
        };
      }
      const directAll = it.episodes.reduce((s, e: any) => s + (Number(e.direct_downloads) || 0), 0);
      const tgAll = it.episodes.reduce((s, e: any) => s + (Number(e.telegram_downloads) || 0), 0);
      const todayDirect = it.episodes.reduce(
        (s, e) => s + (itemTodayCounts.get(Number(e.id))?.direct ?? 0),
        0
      );
      const todayTg = it.episodes.reduce(
        (s, e) => s + (itemTodayCounts.get(Number(e.id))?.telegram ?? 0),
        0
      );
      return {
        key: it.key,
        title: it.showName,
        linkId: it.id,
        episodeCount: it.episodes.length,
        directAll,
        tgAll,
        totalAll: directAll + tgAll,
        todayDirect,
        todayTg,
        todayTotal: todayDirect + todayTg,
      };
    });

    const trendingToday = itemStats
      .filter((x) => x.todayTotal > 0)
      .sort((a, b) => b.todayTotal - a.todayTotal)
      .slice(0, 10);

    const topAllTime = [...itemStats].sort((a, b) => b.totalAll - a.totalAll).slice(0, 10);

    // Live Feed (Last 15 downloads)
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
      todayTotal,
      todayDirect,
      todayTelegram,
      weekTotal,
      dailyChartData,
      distributionData,
      hourlyCounts,
      trendingToday,
      topAllTime,
      recentFeed,
    };
  }, [rows, downloadEvents]);

  const editing = form.id !== null;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(EMPTY);
    setStatus({ type: "idle" });
  };

  const buildPayload = () => {
    const num = (v: string) => (v.trim() === "" ? null : Number.isNaN(Number(v)) ? v.trim() : Number(v));
    return {
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      download_link: form.download_link.trim(),
      telegram_link: form.telegram_link.trim() || null,
      description: form.description.trim() || null,
      rating: num(form.rating),
      year: num(form.year),
      genre: form.genre.trim() || null,
      season: form.season.trim() === "" ? null : Number(form.season),
      episode: form.episode.trim() === "" ? null : Number(form.episode),
      metatags: form.metatags.trim() || null,
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // 🟢 Telegram Auto-Post එක Insert කළ විට පමණක් ක්‍රියාත්මක වේ
    if (!editing && dbData && dbData[0]) {
      const insertedRow = dbData[0];
      if (tgEnabled && tgBotToken && tgChatId) {
        try {
          const siteUrl = "https://pixelpoplk.pages.dev";
          const isSeries = insertedRow.season != null || insertedRow.episode != null;

          let caption = `<b>🎬 ${escapeHtml(insertedRow.title)}</b>\n\n`;
          if (insertedRow.year) caption += `📅 <b>Year:</b> ${insertedRow.year}\n`;
          if (insertedRow.rating) caption += `⭐ <b>Rating:</b> ${insertedRow.rating}/10\n`;
          if (insertedRow.genre) caption += `🎭 <b>Genres:</b> ${escapeHtml(insertedRow.genre)}\n`;
          if (isSeries) {
            caption += `📺 <b>Season:</b> ${insertedRow.season} | <b>Episode:</b> ${insertedRow.episode}\n`;
          }
          if (insertedRow.description) {
            const desc =
              insertedRow.description.length > 250
                ? insertedRow.description.substring(0, 250) + "..."
                : insertedRow.description;
            caption += `\n📝 <b>Overview:</b>\n<i>${escapeHtml(desc)}</i>\n`;
          }

          caption += `\n📥 <b>Download Sinhala Subtitle:</b>\n`;
          caption += `<a href="${siteUrl}/content/${insertedRow.id}">Click Here to Download</a>\n\n`;
          caption += `Join ${tgChatId.startsWith("@") ? tgChatId : "@pixelpoplk"} for more updates! ❤`;

          await fetch(`https://api.telegram.org/bot${tgBotToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: tgChatId,
              photo: insertedRow.image_url || "https://pixelpoplk.pages.dev/placeholder-poster.jpg",
              caption: caption,
              parse_mode: "HTML",
            }),
          });
        } catch (err) {
          console.error("Telegram broadcast failed:", err);
        }
      }
    }

    setStatus({
      type: "success",
      msg: editing ? "Updated successfully!" : "Inserted successfully & Broadcasted!",
    });
    resetForm();
    qc.invalidateQueries({ queryKey: ["subtitles"] });
    refetch();
  };

  const startEdit = (r: any) => {
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

  const deleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    const { error } = await supabase.from("subtitle_requests").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    refetchRequests();
  };

  const toggleRequestStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "pending" ? "completed" : "pending";
    const { error } = await supabase.from("subtitle_requests").update({ status: nextStatus }).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    refetchRequests();
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* noop */
    }
  };

  // 🟢 Enhanced TMDB + IMDb Support
  const handleFetchTmdb = async () => {
    if (!tmdbId.trim()) {
      setStatus({ type: "error", msg: "Please enter a TMDB ID, TMDB Link, or IMDb ID (tt...)!" });
      return;
    }
    if (!tmdbKey.trim()) {
      setStatus({ type: "error", msg: "Please enter your TMDB API Key below first!" });
      return;
    }

    setTmdbLoading(true);
    setStatus({ type: "idle" });

    try {
      const parsed = extractMediaId(tmdbId);
      let data: any = null;
      let detectedType: "movie" | "tv" = tmdbType;

      if (parsed.isImdb) {
        // IMDb ID (tt...) මගින් TMDB /find API හරහා fetch කිරීම
        const findRes = await fetch(
          `https://api.themoviedb.org/3/find/${parsed.id}?api_key=${tmdbKey}&external_source=imdb_id`
        );
        if (!findRes.ok) throw new Error("Failed to find IMDb ID on TMDB.");
        const findData = await findRes.json();

        if (findData.movie_results && findData.movie_results.length > 0) {
          data = findData.movie_results[0];
          detectedType = "movie";
        } else if (findData.tv_results && findData.tv_results.length > 0) {
          data = findData.tv_results[0];
          detectedType = "tv";
        } else {
          throw new Error("No movie or TV show found for this IMDb ID.");
        }
      } else {
        // TMDB ID / Link මගින් fetch කිරීම
        const activeId = parsed.id;
        const activeType = parsed.type || tmdbType;
        detectedType = activeType;

        const res = await fetch(
          `https://api.themoviedb.org/3/${activeType}/${activeId}?api_key=${tmdbKey}&language=en-US`
        );

        if (!res.ok) {
          throw new Error(`TMDB returned status ${res.status}. Check your ID/Link and API Key.`);
        }
        data = await res.json();
      }

      setTmdbType(detectedType);

      const title = data.title || data.name || "";
      const year =
        detectedType === "movie"
          ? data.release_date
            ? data.release_date.split("-")[0]
            : ""
          : data.first_air_date
          ? data.first_air_date.split("-")[0]
          : "";

      const rating = data.vote_average ? Number(data.vote_average).toFixed(1) : "";
      const genres = data.genres
        ? data.genres.map((g: any) => g.name).join(", ")
        : "";
      const imageUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : "";
      const overview = data.overview || "";

      setForm((f) => ({
        ...f,
        title,
        image_url: imageUrl,
        year,
        rating,
        genre: genres,
        description: overview,
      }));

      setStatus({ type: "success", msg: `Successfully imported "${title}"!` });
      setTmdbId("");
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message || "Failed to fetch details" });
    } finally {
      setTmdbLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Subtitles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight">
              Pixel<span className="text-gradient">Pop</span>LK
            </span>
          </Link>
          <span className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary font-semibold">ADMIN</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-destructive transition cursor-pointer"
            >
              Lock
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex border-b border-border/80">
          <button
            onClick={() => setActiveTab("subtitles")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "subtitles"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Subtitles
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "requests"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            User Requests
            {requests && requests.filter((r: any) => r.status === "pending").length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "analytics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Advanced Analytics
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === "subtitles" ? (
          <>
            {/* TMDB Auto-fill Section */}
            <div className="bg-card-elevated rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-4">
              <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse text-amber-500" /> TMDB & IMDb Auto-Fill
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</span>
                  <select
                    value={tmdbType}
                    onChange={(e) => setTmdbType(e.target.value as "movie" | "tv")}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-sm cursor-pointer transition-colors"
                  >
                    <option value="movie" className="bg-background text-foreground">Movie</option>
                    <option value="tv" className="bg-background text-foreground">TV Series</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    TMDB ID, Link, or IMDb (tt...)
                  </span>
                  <input
                    type="text"
                    value={tmdbId}
                    onChange={(e) => setTmdbId(e.target.value)}
                    placeholder="e.g. 550, tt0137523, or Link"
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-sm transition-colors"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleFetchTmdb}
                  disabled={tmdbLoading}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 h-10 shadow-glow"
                >
                  {tmdbLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Fetching...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Fetch Details</>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-border/50">
                <label className="block max-w-sm">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    TMDB API Key (Stored in your browser)
                  </span>
                  <input
                    type="password"
                    value={tmdbKey}
                    onChange={(e) => {
                      setTmdbKey(e.target.value);
                      localStorage.setItem("pixelpop_tmdb_key", e.target.value);
                    }}
                    placeholder="Paste TMDB API Key"
                    className="mt-2.5 w-full px-3 py-2 rounded-lg bg-muted/30 border border-border focus:border-primary focus:outline-none text-xs transition-colors"
                  />
                </label>
              </div>
            </div>

            {/* Telegram Auto-Poster Settings */}
            <div className="bg-card-elevated rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-4">
              <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" /> Telegram Auto-Poster Settings
              </h3>
              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="tg-enabled"
                  checked={tgEnabled}
                  onChange={(e) => {
                    setTgEnabled(e.target.checked);
                    localStorage.setItem("pixelpop_tg_enabled", e.target.checked ? "true" : "false");
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                />
                <label htmlFor="tg-enabled" className="text-xs font-semibold text-muted-foreground uppercase cursor-pointer">
                  Enable Auto-Posting on New Insert
                </label>
              </div>
              {tgEnabled && (
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Telegram Bot Token
                    </span>
                    <input
                      type="password"
                      value={tgBotToken}
                      onChange={(e) => {
                        setTgBotToken(e.target.value);
                        localStorage.setItem("pixelpop_tg_bot_token", e.target.value);
                      }}
                      placeholder="Bot Token"
                      className="mt-2 w-full px-3 py-2 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs transition-colors"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Channel Username or Chat ID
                    </span>
                    <input
                      type="text"
                      value={tgChatId}
                      onChange={(e) => {
                        setTgChatId(e.target.value);
                        localStorage.setItem("pixelpop_tg_chat_id", e.target.value);
                      }}
                      placeholder="e.g. @pixelpoplk"
                      className="mt-2 w-full px-3 py-2.5 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs transition-colors"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* CSV Uploader */}
            <CSVUploader refetch={refetch} />

            {/* Subtitles Input Form */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={submit}
              className="bg-card-elevated rounded-3xl border border-border shadow-card p-6 sm:p-8"
            >
              <div className="grid lg:grid-cols-[1fr_220px] gap-8">
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Title *" value={form.title} onChange={(v) => set("title", v)} placeholder="e.g. Breaking Bad S01E01" />
                  <Field label="Download Link *" value={form.download_link} onChange={(v) => set("download_link", v)} placeholder="https://..." />
                  
                  <Field label="Telegram Download Link" value={form.telegram_link} onChange={(v) => set("telegram_link", v)} placeholder="https://t.me/pixelpoplk/1234" />
                  <Field label="Image URL *" value={form.image_url} onChange={(v) => set("image_url", v)} placeholder="https://image.tmdb.org/..." className="sm:col-span-2" />
                  <Field label="Genre (comma separated)" value={form.genre} onChange={(v) => set("genre", v)} placeholder="Movie, Sci-Fi, Horror" className="sm:col-span-2" />
                  <Field label="SEO Meta Tags" value={form.metatags} onChange={(v) => set("metatags", v)} placeholder="Keywords etc." className="sm:col-span-2" />

                  <Field label="Year" value={form.year} onChange={(v) => set("year", v)} placeholder="2024" />
                  <Field label="Rating (IMDb)" value={form.rating} onChange={(v) => set("rating", v)} placeholder="8.5" />
                  <Field label="Season" value={form.season} onChange={(v) => set("season", v)} placeholder="1" />
                  <Field label="Episode" value={form.episode} onChange={(v) => set("episode", v)} placeholder="1" />
                  <label className="sm:col-span-2 block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</span>
                    <textarea
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      rows={4}
                      placeholder="Synopsis…"
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-y"
                    />
                  </label>

                  {form.genre && (
                    <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                      {splitGenres(form.genre).map((g) => (
                        <span
                          key={g}
                          className={`px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide ${genreBadgeClass(g.toLowerCase())}`}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Poster Preview</span>
                  <div className="rounded-xl overflow-hidden border border-border aspect-[2/3] bg-muted">
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-6 mt-6 border-t border-border">
                <button
                  type="submit"
                  disabled={status.type === "saving"}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow hover:opacity-95 transition disabled:opacity-60 cursor-pointer"
                >
                  {status.type === "saving" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : editing ? (
                    <><Save className="w-4 h-4" /> Update Row</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Insert Subtitle</>
                  )}
                </button>

                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border text-sm font-semibold hover:border-primary/40 hover:text-primary transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Cancel edit
                  </button>
                )}

                {status.type === "success" && (
                  <span className="inline-flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="w-4 h-4" /> {status.msg}
                  </span>
                )}
                {status.type === "error" && (
                  <span className="inline-flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" /> {status.msg}
                  </span>
                )}
              </div>
            </motion.form>

            {/* Subtitles list table */}
            <section>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold tracking-tight">
                  All Subtitles <span className="text-xs font-medium text-muted-foreground ml-2">{filtered.length}</span>
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search titles…"
                    className="pl-9 pr-4 py-2 rounded-full bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm w-64"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden bg-card/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Poster</th>
                        <th className="text-left px-4 py-3 font-semibold">Title</th>
                        <th className="text-left px-4 py-3 font-semibold">Genres</th>
                        <th className="text-left px-4 py-3 font-semibold">Year</th>
                        <th className="text-left px-4 py-3 font-semibold">Rating</th>
                        <th className="text-left px-4 py-3 font-semibold">S/E</th>
                        <th className="text-left px-4 py-3 font-semibold">Downloads Breakdown</th>
                        <th className="text-right px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((r) => {
                        const genres = splitGenres(r.genre);
                        return (
                          <tr key={String(r.id)} className="hover:bg-muted/20 transition">
                            <td className="px-4 py-3">
                              <div className="w-10 h-14 rounded overflow-hidden bg-muted">
                                {r.image_url && <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium max-w-xs">
                              <div className="truncate">{r.title}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {genres.slice(0, 2).map((g) => (
                                  <span
                                    key={g}
                                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${genreBadgeClass(
                                      g.toLowerCase()
                                    )}`}
                                  >
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{r.year ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{r.rating ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.season != null || r.episode != null ? `S${r.season ?? "?"} · E${r.episode ?? "?"}` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col text-xs gap-1">
                                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                  <Download className="w-3.5 h-3.5" /> {Number(r.direct_downloads) || 0} Direct
                                </span>
                                <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                                  <Send className="w-3.5 h-3.5" /> {Number(r.telegram_downloads) || 0} TG
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex gap-1">
                                <button
                                  onClick={() => startEdit(r)}
                                  className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition cursor-pointer"
                                  aria-label="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => remove(r)}
                                  className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                                  aria-label="Delete"
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
        ) : activeTab === "requests" ? (
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">
              Subtitle Requests <span className="text-xs font-medium text-muted-foreground ml-2">{requests?.length ?? 0} total</span>
            </h2>

            <div className="rounded-2xl border border-border overflow-hidden bg-card/40">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Title</th>
                      <th className="text-left px-4 py-3 font-semibold">Type</th>
                      <th className="text-left px-4 py-3 font-semibold">Notes / Details</th>
                      <th className="text-left px-4 py-3 font-semibold">Date Submitted</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-right px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {requests?.map((req: any) => (
                      <tr key={req.id} className="hover:bg-muted/20 transition">
                        <td className="px-4 py-3 font-medium">{req.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
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
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
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
        ) : (
          /* 🟢 ADVANCED ANALYTICS SECTION */
          <section className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Advanced Download Intelligence
            </h2>

            {analyticsLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading live analytics…
              </p>
            )}

            {/* 6 Advanced KPI Stat Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="text-muted-foreground text-xs font-semibold uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" /> Total Downloads
                </div>
                <p className="text-2xl font-extrabold mt-2 text-foreground">{analytics.totalAllTime.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">All-time lifetime count</span>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-emerald-400 text-xs font-semibold uppercase flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Direct Downloads
                </div>
                <p className="text-2xl font-extrabold mt-2 text-emerald-400">{analytics.totalDirectAllTime.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">
                  {analytics.totalAllTime
                    ? Math.round((analytics.totalDirectAllTime / analytics.totalAllTime) * 100)
                    : 0}
                  % of all downloads
                </span>
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="text-sky-400 text-xs font-semibold uppercase flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Telegram Downloads
                </div>
                <p className="text-2xl font-extrabold mt-2 text-sky-400">{analytics.totalTelegramAllTime.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">
                  {analytics.totalAllTime
                    ? Math.round((analytics.totalTelegramAllTime / analytics.totalAllTime) * 100)
                    : 0}
                  % of all downloads
                </span>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-amber-400 text-xs font-semibold uppercase flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Downloads Today
                </div>
                <p className="text-2xl font-extrabold mt-2 text-amber-400">{analytics.todayTotal.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">
                  Direct: {analytics.todayDirect} | TG: {analytics.todayTelegram}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="text-muted-foreground text-xs font-semibold uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Last 7 Days
                </div>
                <p className="text-2xl font-extrabold mt-2 text-foreground">{analytics.weekTotal.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">Weekly run-rate</span>
              </div>

              <div className="rounded-2xl border border-border bg-card/40 p-4">
                <div className="text-muted-foreground text-xs font-semibold uppercase flex items-center gap-1.5">
                  <Subtitles className="w-3.5 h-3.5 text-cyan-400" /> Active Titles
                </div>
                <p className="text-2xl font-extrabold mt-2 text-foreground">{(rows ?? []).length.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">Catalog size</span>
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Daily Comparison Stacked Bar Chart (Last 14 Days) */}
              <div className="lg:col-span-2 rounded-3xl border border-border bg-card/40 p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Direct vs Telegram — Last 14 Days
                  </h3>
                  <div className="flex items-center gap-4 text-xs">
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

              {/* Donut Chart — Direct vs Telegram Distribution */}
              <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card flex flex-col items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2 w-full">
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

            {/* Peak Activity Hours Bar Chart (00:00 - 23:00) */}
            <div className="rounded-3xl border border-border bg-card/40 p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Peak Activity Hours (Last 30 Days Traffic)
                </h3>
                <span className="text-xs text-muted-foreground">Hourly download volume (24h breakdown)</span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.hourlyCounts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                    <XAxis dataKey="hour" tick={{ fill: "oklch(0.7 0 0)", fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "oklch(0.7 0 0)", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.18 0.01 20)",
                        border: "1px solid oklch(1 0 0 / 0.15)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="total" fill="oklch(0.62 0.24 25)" radius={[4, 4, 0, 0]} name="Total Downloads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Downloads Feed & Trending Tables */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Trending Today with Direct & TG breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" /> Trending Today (Direct vs TG)
                </h3>
                <div className="rounded-2xl border border-border overflow-hidden bg-card/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Title</th>
                          <th className="px-4 py-3 text-left">Direct</th>
                          <th className="px-4 py-3 text-left">TG</th>
                          <th className="px-4 py-3 text-left">Today Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analytics.trendingToday.map((x, i) => (
                          <tr key={x.key} className="hover:bg-muted/20 transition">
                            <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3 font-medium max-w-xs truncate">{x.title}</td>
                            <td className="px-4 py-3 text-emerald-400 font-semibold">{x.todayDirect}</td>
                            <td className="px-4 py-3 text-sky-400 font-semibold">{x.todayTg}</td>
                            <td className="px-4 py-3 font-bold text-primary">{x.todayTotal}</td>
                          </tr>
                        ))}
                        {analytics.trendingToday.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                              No downloads logged yet today.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Live Real-time Downloads Activity Stream */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Recent Downloads Feed
                </h3>
                <div className="rounded-2xl border border-border overflow-hidden bg-card/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left">Movie / Series</th>
                          <th className="px-4 py-3 text-left">Channel</th>
                          <th className="px-4 py-3 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analytics.recentFeed.map((rf) => (
                          <tr key={rf.id} className="hover:bg-muted/20 transition text-xs">
                            <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{rf.title}</td>
                            <td className="px-4 py-2.5">
                              {rf.variant === "telegram" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold text-[10px]">
                                  <Send className="w-2.5 h-2.5" /> Telegram
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                                  <Download className="w-2.5 h-2.5" /> Direct .zip
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">{rf.time}</td>
                          </tr>
                        ))}
                        {analytics.recentFeed.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                              No recent events found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* All-time Top Downloads with Channel Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Lifetime Top Titles (Direct vs Telegram)
              </h3>
              <div className="rounded-2xl border border-border overflow-hidden bg-card/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Title</th>
                        <th className="px-4 py-3 text-left">Direct Downloads</th>
                        <th className="px-4 py-3 text-left">Telegram Downloads</th>
                        <th className="px-4 py-3 text-left">Lifetime Total</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {analytics.topAllTime.map((x, i) => (
                        <tr key={x.key} className="hover:bg-muted/20 transition">
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-medium max-w-xs truncate">{x.title}</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold">{x.directAll.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sky-400 font-bold">{x.tgAll.toLocaleString()}</td>
                          <td className="px-4 py-3 font-extrabold text-primary">{x.totalAll.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to="/content/$id"
                              params={{ id: String(x.linkId) }}
                              className="text-xs text-muted-foreground hover:text-foreground underline"
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
        className="mt-2 w-full px-4 py-3 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition"
      />
    </label>
  );
}
