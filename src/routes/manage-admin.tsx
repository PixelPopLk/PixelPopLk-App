import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { supabase, SUBTITLES_TABLE, SUBTITLE_COLUMNS, type Subtitle } from "@/integrations/supabase/client";
import { splitGenres, genreBadgeClass } from "@/lib/subtitles";

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
    // සක්‍රිය Session එක ලබා ගැනීම
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Login/Logout වෙනස්වීම් නිරීක්ෂණය කිරීම
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ලොග් වී නොමැති නම් Login Panel (Gate) එක පෙන්වන්න
  if (!session) return <Gate />;
  
  // ලොග් වී ඇත්නම් Dashboard එක පෙන්වන්න
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

    // Supabase Auth භාවිතයෙන් Login වීම
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
  description: "",
  rating: "",
  year: "",
  genre: "",
  season: "",
  episode: "",
  metatags: "",
};

// URL එකකින් TMDB ID එක සහ Type එක වෙන්කර ගන්නා Regex ශ්‍රිතය
const extractTmdbId = (input: string): { id: string; type: "movie" | "tv" | null } => {
  const clean = input.trim();
  if (/^\d+$/.test(clean)) {
    return { id: clean, type: null };
  }
  const match = clean.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
  if (match) {
    return { id: match[2], type: match[1] as "movie" | "tv" };
  }
  return { id: clean, type: null };
};

function Dashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"subtitles" | "requests">("subtitles");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [search, setSearch] = useState("");

  // TMDB API States
  const [tmdbId, setTmdbId] = useState("");
  const [tmdbType, setTmdbType] = useState<"movie" | "tv">("movie");
  const [tmdbKey, setTmdbKey] = useState("");
  const [tmdbLoading, setTmdbLoading] = useState(false);

  // Telegram States
  const [tgEnabled, setTgEnabled] = useState(false);
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");

  // Phone එකෙහි LocalStorage එකෙන් දත්ත කියවා ගැනීම
  useEffect(() => {
    const savedKey = localStorage.getItem("pixelpop_tmdb_key");
    if (savedKey) setTmdbKey(savedKey);

    const savedTgEnabled = localStorage.getItem("pixelpop_tg_enabled") === "true";
    setTgEnabled(savedTgEnabled);

    const savedTgBotToken = localStorage.getItem("pixelpop_tg_bot_token");
    if (savedTgBotToken) setTgBotToken(savedTgBotToken);

    const savedTgChatId = localStorage.getItem("pixelpop_tg_chat_id");
    if (savedTgChatId) setTgChatId(savedTgChatId);
  }, []);

  const { data: rows, refetch } = useQuery({
    queryKey: ["subtitles", "admin-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(SUBTITLES_TABLE)
        .select(SUBTITLE_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Subtitle[];
    },
  });

  // User Requests Query (පරිශීලක ඉල්ලීම් ලබාගැනීම)
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
    enabled: activeTab === "requests", // Tab එක සක්‍රිය වූ විට පමණක් Load කරයි
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((r) => r.title?.toLowerCase().includes(q));
  }, [rows, search]);

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
    
    // Auto-return data for Telegram routing (.select() එකතු කර ඇත)
    const query = editing
      ? supabase.from(SUBTITLES_TABLE).update(payload).eq("id", form.id as Subtitle["id"]).select()
      : supabase.from(SUBTITLES_TABLE).insert(payload).select();

    const { data: dbData, error } = await query;

    if (error) {
      setStatus({ type: "error", msg: error.message });
      return;
    }

    // 🔥 Telegram Auto-Post සජීවීව ක්‍රියාත්මක කිරීම
    if (!error && dbData && dbData[0]) {
      const insertedRow = dbData[0];
      if (tgEnabled && tgBotToken && tgChatId) {
        try {
          const siteUrl = "https://pixelpopshows.netlify.app";
          const isSeries = insertedRow.season != null || insertedRow.episode != null;
          
          let caption = `<b>🎬 ${insertedRow.title}</b>\n\n`;
          if (insertedRow.year) caption += `📅 <b>Year:</b> ${insertedRow.year}\n`;
          if (insertedRow.rating) caption += `⭐ <b>Rating:</b> ${insertedRow.rating}/10\n`;
          if (insertedRow.genre) caption += `🎭 <b>Genres:</b> ${insertedRow.genre}\n`;
          if (isSeries) {
            caption += `📺 <b>Season:</b> ${insertedRow.season} | <b>Episode:</b> ${insertedRow.episode}\n`;
          }
          if (insertedRow.description) {
            const desc = insertedRow.description.length > 250 
              ? insertedRow.description.substring(0, 250) + "..."
              : insertedRow.description;
            caption += `\n📝 <b>Overview:</b>\n<i>${desc}</i>\n`;
          }
          
          caption += `\n📥 <b>Download Sinhala Subtitle:</b>\n`;
          caption += `<a href="${siteUrl}/content/${insertedRow.id}">Click Here to Download</a>\n\n`;
          caption += `Join ${tgChatId.startsWith("@") ? tgChatId : "@pixelpoplk"} for more updates! ❤`;

          await fetch(`https://api.telegram.org/bot${tgBotToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tgChatId,
              photo: insertedRow.image_url || "https://pixelpoplk.com/placeholder-poster.jpg",
              caption: caption,
              parse_mode: 'HTML',
            }),
          });
        } catch (err) {
          console.error("Telegram broadcast failed:", err);
        }
      }
    }

    setStatus({ type: "success", msg: editing ? "Updated successfully and Broadcasted!" : "Inserted successfully and Broadcasted!" });
    resetForm();
    qc.invalidateQueries({ queryKey: ["subtitles"] });
    refetch();
  };

  const startEdit = (r: Subtitle) => {
    setForm({
      id: r.id,
      title: r.title ?? "",
      image_url: r.image_url ?? "",
      download_link: r.download_link ?? "",
      description: r.description ?? "",
      rating: r.rating == null ? "" : String(r.rating),
      year: r.year == null ? "" : String(r.year),
      genre: r.genre ?? "",
      season: r.season == null ? "" : String(r.season),
      episode: r.episode == null ? "" : String(r.episode),
      metatags: (r as any).metatags ?? "",
    });
    setStatus({ type: "idle" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (r: Subtitle) => {
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
    const { error } = await supabase
      .from("subtitle_requests")
      .update({ status: nextStatus })
      .eq("id", id);
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

  const handleFetchTmdb = async () => {
    if (!tmdbId.trim()) {
      setStatus({ type: "error", msg: "Please enter a TMDB ID or Link!" });
      return;
    }
    if (!tmdbKey.trim()) {
      setStatus({ type: "error", msg: "Please enter your TMDB API Key below first!" });
      return;
    }

    setTmdbLoading(true);
    setStatus({ type: "idle" });

    try {
      const parsed = extractTmdbId(tmdbId);
      const activeId = parsed.id;
      const activeType = parsed.type || tmdbType;

      if (parsed.type) {
        setTmdbType(parsed.type);
      }

      const res = await fetch(
        `https://api.themoviedb.org/3/${activeType}/${activeId}?api_key=${tmdbKey}&language=en-US`
      );

      if (!res.ok) {
        throw new Error(`TMDB returned status ${res.status}. Check your ID/Link and API Key.`);
      }

      const data = await res.json();

      const title = data.title || data.name || "";
      const year = activeType === "movie" 
        ? (data.release_date ? data.release_date.split("-")[0] : "")
        : (data.first_air_date ? data.first_air_date.split("-")[0] : "");
      
      const rating = data.vote_average ? data.vote_average.toFixed(1) : "";
      const genres = data.genres ? data.genres.map((g: any) => g.name).join(", ") : "";
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

      setStatus({ type: "success", msg: `Successfully imported "${title}" from TMDB!` });
      setTmdbId("");
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message || "Failed to fetch from TMDB" });
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
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === "subtitles" ? (
          <>
            {/* TMDB Auto-fill Section */}
            <div className="bg-card-elevated rounded-3xl border border-border p-6 sm:p-8 shadow-card space-y-4">
              <h3 className="text-sm font-bold tracking-wide uppercase text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse text-amber-500" /> TMDB Auto-Fill Details
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
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">TMDB ID or Link</span>
                  <input
                    type="text"
                    value={tmdbId}
                    onChange={(e) => setTmdbId(e.target.value)}
                    placeholder="e.g. 550 or Paste TMDB Link"
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
              
              {/* Secret API Key Input */}
              <div className="pt-4 border-t border-border/50">
                <label className="block max-w-sm">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">TMDB API Key (Saved on your browser)</span>
                  <input
                    type="password"
                    value={tmdbKey}
                    onChange={(e) => {
                      setTmdbKey(e.target.value);
                      localStorage.setItem("pixelpop_tmdb_key", e.target.value);
                    }}
                    placeholder="Paste your TMDB API Key (v3 auth) here"
                    className="mt-2.5 w-full px-3 py-2 rounded-lg bg-muted/30 border border-border focus:border-primary focus:outline-none text-xs transition-colors"
                  />
                </label>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                  Get a free API Key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">themoviedb.org</a>. It is safely stored only in your browser's local storage.
                </p>
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
                  Enable Auto-Posting to Telegram Channel
                </label>
              </div>
              {tgEnabled && (
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <label className="block">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Telegram Bot Token</span>
                    <input
                      type="password"
                      value={tgBotToken}
                      onChange={(e) => {
                        setTgBotToken(e.target.value);
                        localStorage.setItem("pixelpop_tg_bot_token", e.target.value);
                      }}
                      placeholder="e.g. 123456789:ABCdefGhI..."
                      className="mt-2 w-full px-3 py-2 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs transition-colors"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Channel Username or Chat ID</span>
                    <input
                      type="text"
                      value={tgChatId}
                      onChange={(e) => {
                        setTgChatId(e.target.value);
                        localStorage.setItem("pixelpop_tg_chat_id", e.target.value);
                      }}
                      placeholder="e.g. @pixelpoplk or -100xxxxxxxx"
                      className="mt-2 w-full px-3 py-2 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none text-xs transition-colors"
                    />
                  </label>
                </div>
              )}
            </div>

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
                  <Field label="Image URL *" value={form.image_url} onChange={(v) => set("image_url", v)} placeholder="https://image.tmdb.org/..." className="sm:col-span-2" />
                  <Field label="Genre (comma separated)" value={form.genre} onChange={(v) => set("genre", v)} placeholder="Movie, Sci-Fi, Horror" className="sm:col-span-2" />
                  
                  <Field label="SEO Meta Tags" value={form.metatags} onChange={(v) => set("metatags", v)} placeholder="Keywords, description etc. e.g. breaking-bad-sinhala-sub, download-sub" className="sm:col-span-2" />

                  <Field label="Year" value={form.year} onChange={(v) => set("year", v)} placeholder="2024" />
                  <Field label="Rating (IMDb)" value={form.rating} onChange={(v) => set("rating", v)} placeholder="8.5" />
                  <Field label="Season" value={form.season} onChange={(v) => set("season", v)} placeholder="1" />
                  <Field label="Episode" value={form.episode} onChange={(v) => set("episode", v)} placeholder="1" />
                  <label className="sm:col-span-2 block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Description
                    </span>
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Poster Preview
                  </span>
                  <div className="rounded-xl overflow-hidden border border-border aspect-[2/3] bg-muted">
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
                        No image
                      </div>
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
                                {r.image_url && (
                                  <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium max-w-xs">
                              <div className="truncate">{r.title}</div>
                              {r.description && (
                                <div className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                                  {r.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {genres.slice(0, 3).map((g) => (
                                  <span
                                    key={g}
                                    className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${genreBadgeClass(g.toLowerCase())}`}
                                  >
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{r.year ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{r.rating ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.season != null || r.episode != null
                                ? `S${r.season ?? "?"} · E${r.episode ?? "?"}`
                                : "—"}
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
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                            No rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* 🔥 User Requests Tab */
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
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${req.type === 'tv' ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                            {req.type === 'tv' ? 'TV Series' : 'Movie'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={req.notes}>
                          {req.notes ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRequestStatus(req.id, req.status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${req.status === 'completed' ? 'bg-green-500/15 text-green-500 border-green-500/30' : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'}`}
                          >
                            {req.status === 'completed' ? 'Completed' : 'Pending'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                            aria-label="Delete Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!requests || requests.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          No requests submitted yet.
                        </td>
                      </tr>
                    )}
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
        className="mt-2 w-full px-4 py-3 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition"
      />
    </label>
  );
    }
