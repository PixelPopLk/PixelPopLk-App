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

const PASSWORD = "PixelPop@2026";
const AUTH_KEY = "pixelpop_admin_unlocked";

function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(AUTH_KEY) === "1") setUnlocked(true);
    } catch {
      /* noop */
    }
  }, []);

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />;
  return <Dashboard />;
}

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === PASSWORD) {
      try {
        sessionStorage.setItem(AUTH_KEY, "1");
      } catch {
        /* noop */
      }
      onUnlock();
    } else {
      setErr(true);
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
          Enter the password to continue.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr(false);
          }}
          placeholder="Password"
          autoFocus
          className="mt-6 w-full px-4 py-3 rounded-xl bg-muted/60 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
        {err && (
          <p className="mt-2 text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Incorrect password.
          </p>
        )}
        <button
          type="submit"
          className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:opacity-95 transition"
        >
          Unlock Dashboard
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

type Status = { type: "idle" } | { type: "saving" } | { type: "success"; msg: string } | { type: "error"; msg: string };

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
};

function Dashboard() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [search, setSearch] = useState("");

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
    const { error } = editing
      ? await supabase.from(SUBTITLES_TABLE).update(payload).eq("id", form.id as Subtitle["id"])
      : await supabase.from(SUBTITLES_TABLE).insert(payload);

    if (error) {
      setStatus({ type: "error", msg: error.message });
      return;
    }
    setStatus({ type: "success", msg: editing ? "Updated successfully." : "Inserted successfully." });
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

  const logout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* noop */
    }
    window.location.reload();
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
              className="text-xs text-muted-foreground hover:text-destructive transition"
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

      <section className="bg-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {editing ? "Edit" : "Add New"} <span className="text-gradient">Subtitle</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Full CRUD over the <code className="font-mono">{SUBTITLES_TABLE}</code> table.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow hover:opacity-95 transition disabled:opacity-60"
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
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border text-sm font-semibold hover:border-primary/40 hover:text-primary transition"
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
                                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${genreBadgeClass(g.toLowerCase())}`}
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
                              className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                              aria-label="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => remove(r)}
                              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
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
