"use client";

import { useMemo, useState } from "react";

type Subtitle = {
  title: string;
  original: string;
  year: string;
  kind: "Movie" | "TV Series";
  language: string;
  quality: string;
  tag: string;
};

const subtitles: Subtitle[] = [
  { title: "The Last Horizon", original: "The Last Horizon", year: "2025", kind: "Movie", language: "සිංහල", quality: "1080p", tag: "අලුත්" },
  { title: "City of Echoes", original: "City of Echoes", year: "2024", kind: "TV Series", language: "සිංහල", quality: "WEB-DL", tag: "ජනප්‍රිය" },
  { title: "Beyond the Stars", original: "Beyond the Stars", year: "2025", kind: "Movie", language: "සිංහල", quality: "2160p", tag: "අලුත්" },
  { title: "Hidden Kingdom", original: "Hidden Kingdom", year: "2023", kind: "TV Series", language: "සිංහල", quality: "1080p", tag: "ජනප්‍රිය" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Movie" | "TV Series">("All");

  const filtered = useMemo(() => subtitles.filter((item) => {
    const matchesQuery = (item.title + " " + item.original).toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "All" || item.kind === filter);
  }), [query, filter]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">P</span> pixelpop<span className="brand-dot">.</span></a>
        <nav><a href="#browse">සබ්ටයිටල්</a><a href="#about">අපි ගැන</a></nav>
        <a className="upload-link" href="https://github.com/PixelPopLK/PixelPopLK-App">GitHub ↗</a>
      </header>

      <section className="hero">
        <div className="hero-glow" />
        <div className="eyebrow"><span className="pulse" /> SRI LANKAN SUBTITLE COMMUNITY</div>
        <h1>ඔබේ ප්‍රියතම කතාවට<br /><span>සිංහල හඬක්.</span></h1>
        <p className="hero-copy">Movies සහ TV Series සඳහා ගුණාත්මක සිංහල උපසිරැසි එකම තැනකින් සොයාගන්න.</p>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Film හෝ TV Series නමක් සොයන්න..." aria-label="Search subtitles" />
          <button onClick={() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" })}>සොයන්න</button>
        </div>
        <div className="quick-tags"><span>උදාහරණ:</span><button onClick={() => setQuery("Horizon")}>Horizon</button><button onClick={() => setQuery("City")}>City</button><button onClick={() => setQuery("Kingdom")}>Kingdom</button></div>
      </section>

      <section className="browse" id="browse">
        <div className="section-heading">
          <div><div className="eyebrow muted">DISCOVER</div><h2>උපසිරැසි ගවේෂණය</h2><p>ඔබට අවශ්‍ය කතාව මෙතැනින් සොයාගන්න.</p></div>
          <span className="result-count">{filtered.length} results</span>
        </div>
        <div className="filters" role="group" aria-label="Filter subtitles">
          {(["All", "Movie", "TV Series"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "All" ? "සියල්ල" : item === "Movie" ? "චිත්‍රපට" : "TV Series"}</button>)}
        </div>
        {filtered.length ? <div className="cards">{filtered.map((item) => (
          <article className="subtitle-card" key={item.title}>
            <div className="poster"><span className="poster-orbit" /><span className="poster-letter">{item.title.charAt(0)}</span><span className="poster-type">{item.kind === "Movie" ? "FILM" : "SERIES"}</span></div>
            <div className="card-body"><div className="card-meta"><span>{item.year}</span><span className="dot-sep">•</span><span>{item.kind === "Movie" ? "චිත්‍රපටය" : "TV කතාමාලාව"}</span><span className="tag">{item.tag}</span></div><h3>{item.title}</h3><p>{item.original}</p><div className="card-bottom"><span className="language">◉ {item.language}</span><span className="quality">{item.quality}</span></div><button className="details-button" onClick={() => alert("මෙය prototype එකක්. සැබෑ subtitle download පහසුකම ඊළඟ අදියරේදී සම්බන්ධ කරමු.")}>විස්තර බලන්න <span>↗</span></button></div>
          </article>
        ))}</div> : <div className="empty">මේ නමට ගැළපෙන උපසිරැසි හමු වුණේ නැහැ. වෙනත් නමක් උත්සාහ කරන්න.</div>}
      </section>

      <section className="community" id="about"><div className="community-icon">✦</div><div><div className="eyebrow muted">MADE FOR THE COMMUNITY</div><h2>සිංහල උපසිරැසි ලෝකය එකට ගොඩනගමු.</h2><p>ඔබේ දායකත්වයෙන් තවත් රසිකයෙකුට තමන් කැමති කතාව තේරුම්ගන්න පුළුවන්.</p></div><a href="https://github.com/PixelPopLK/PixelPopLK-App">Contribute ↗</a></section>
      <footer><a className="brand" href="#"><span className="brand-mark">P</span> pixelpop<span className="brand-dot">.</span></a><span>© 2026 PixelPop prototype · Community powered</span></footer>
    </main>
  );
}
