"use client";

import { useMemo, useState } from "react";

type Subtitle = {
  title: string;
  year: string;
  kind: "Movie" | "TV Series";
  language: string;
  quality: string;
  downloads: string;
  image: string;
  accent: string;
  badge?: string;
};

const subtitles: Subtitle[] = [
  { title: "Dune: Part Two", year: "2024", kind: "Movie", language: "සිංහල", quality: "WEB-DL", downloads: "12.8K", image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=900&q=85", accent: "sand", badge: "TRENDING" },
  { title: "The Last of Us", year: "2025", kind: "TV Series", language: "සිංහල", quality: "1080p", downloads: "9.4K", image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&q=85", accent: "forest", badge: "NEW EPISODE" },
  { title: "Interstellar", year: "2014", kind: "Movie", language: "සිංහල", quality: "BluRay", downloads: "8.1K", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=900&q=85", accent: "space" },
  { title: "Wednesday", year: "2022", kind: "TV Series", language: "සිංහල", quality: "WEB-DL", downloads: "6.7K", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&q=85", accent: "night" },
  { title: "Oppenheimer", year: "2023", kind: "Movie", language: "සිංහල", quality: "1080p", downloads: "5.2K", image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&q=85", accent: "fire" },
  { title: "Planet Earth", year: "2023", kind: "TV Series", language: "සිංහල", quality: "2160p", downloads: "4.9K", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&q=85", accent: "earth" },
];

const categories = ["සියල්ල", "චිත්‍රපට", "TV Series", "අලුත්ම උපසිරැසි"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("සියල්ල");
  const filtered = useMemo(() => subtitles.filter((item) => {
    const matches = item.title.toLowerCase().includes(query.toLowerCase());
    const typeMatches = category === "සියල්ල" || category === "අලුත්ම උපසිරැසි" || (category === "චිත්‍රපට" ? item.kind === "Movie" : item.kind === "TV Series");
    return matches && typeMatches;
  }), [query, category]);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-symbol">P<span>.</span></span><span>pixelpop</span></a>
        <nav className="main-nav"><a className="nav-active" href="#discover">ගවේෂණය</a><a href="#movies">චිත්‍රපට</a><a href="#series">TV Series</a><a href="#community">Community</a></nav>
        <a className="nav-cta" href="#discover">උපසිරැසි සොයන්න <span>↗</span></a>
      </header>

      <section className="hero">
        <div className="hero-backdrop" />
        <div className="hero-content">
          <div className="hero-kicker"><span className="live-dot" /> THE HOME OF SINHALA SUBTITLES</div>
          <h1>Every story<br />deserves to be <em>understood.</em></h1>
          <p>ඔබ ආදරය කරන චිත්‍රපට සහ කතාමාලා — දැන් ඔබේම භාෂාවෙන්.</p>
          <div className="hero-search">
            <span className="search-symbol">⌕</span>
            <input value={query} onChange={(e) => { setQuery(e.target.value); document.getElementById("discover")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} placeholder="චිත්‍රපටයක් හෝ TV Series එකක් සොයන්න..." aria-label="Search subtitles" />
            <button onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })}>සොයන්න <span>→</span></button>
          </div>
          <div className="hero-foot"><span>✦  සිංහල උපසිරැසි ප්‍රජාව</span><span>චිත්‍රපට · කතාමාලා · තවත්</span></div>
        </div>
        <div className="hero-feature">
          <div className="feature-poster"><img src="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=900&q=85" alt="Cinematic starscape" /><span className="feature-label">EDITOR'S PICK</span><div className="feature-overlay"><small>FEATURED TITLE · 2024</small><strong>DUNE: PART TWO</strong><span>සිංහල උපසිරැසි ලබාගන්න</span></div></div>
          <div className="feature-caption"><span>මේ සතියේ විශේෂාංගය</span><b>01 <i>/</i> 06</b></div>
        </div>
      </section>

      <section className="trust-strip"><div><strong>01</strong><span>පහසු සෙවුම</span></div><div><strong>02</strong><span>ගුණාත්මක උපසිරැසි</span></div><div><strong>03</strong><span>ප්‍රජාව විසින්</span></div><div className="trust-note">YOUR NEXT STORY STARTS HERE <span>✳</span></div></section>

      <section className="discover-section" id="discover">
        <div className="section-top"><div><div className="section-eyebrow">FIND YOUR NEXT WATCH</div><h2>අලුත්ම <em>උපසිරැසි.</em></h2><p>ඔබේ ඊළඟ ප්‍රියතම කතාව මෙතැනින් සොයාගන්න.</p></div><a className="text-link" href="#discover">සියල්ල බලන්න <span>↗</span></a></div>
        <div className="category-row">{categories.map((item) => <button key={item} className={category === item ? "category-active" : ""} onClick={() => setCategory(item)}>{item}</button>)}<span className="showing-count">{filtered.length} TITLES</span></div>
        {filtered.length ? <div className="poster-grid">{filtered.map((item, index) => <article className="title-card" key={item.title}>
          <div className={"poster-image poster-" + item.accent}><img src={item.image} alt="" loading="lazy" /><div className="poster-shade" />{item.badge && <span className="poster-badge">{item.badge}</span>}<span className="poster-index">0{index + 1}</span><button className="quick-view" aria-label={"View " + item.title} onClick={() => alert("මෙය design preview එකකි. සැබෑ subtitle විස්තර සහ download පහසුකම් ඊළඟ අදියරේදී සම්බන්ධ කරමු.")}>↗</button></div>
          <div className="title-info"><div className="title-meta"><span>{item.kind === "Movie" ? "FILM" : "SERIES"}</span><i>·</i><span>{item.year}</span></div><h3>{item.title}</h3><div className="title-bottom"><span className="language-pill">◉ {item.language}</span><span>{item.quality}</span></div></div>
        </article>)}</div> : <div className="empty-state">ඔබ සෙවූ නමට ගැළපෙන උපසිරැසි හමු වුණේ නැහැ.</div>}
      </section>

      <section className="community-banner" id="community"><div className="community-art"><span>ප</span><i>✳</i></div><div className="community-copy"><div className="section-eyebrow">BUILT TOGETHER</div><h2>කතාවක් තේරෙන විට,<br /><em>ලෝකය තවත් ළඟයි.</em></h2><p>සිංහල උපසිරැසි ප්‍රජාවට එකතු වෙලා ඔබේ දායකත්වය ලබාදෙන්න.</p></div><a href="https://github.com/PixelPopLK/PixelPopLK-App">දායක වන්න <span>↗</span></a></section>
      <footer className="footer"><a className="brand" href="#"><span className="brand-symbol">P<span>.</span></span><span>pixelpop</span></a><span>© 2026 PIXELPOP · MADE FOR THE COMMUNITY</span><a href="#top">ඉහළට ↑</a></footer>
    </main>
  );
}
