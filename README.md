# 🚀 PixelPopLK — SEO Improvement & Optimization Package

මෙම `update` ෆෝල්ඩරය තුළ ඔබගේ වෙබ් අඩවියේ SEO තත්ත්වය උපරිම මට්ටමකට ගෙන ඒම සඳහා ChatGPT Analysis එක පදනම් කරගෙන සිදුකළ සියලුම fixes සහ නව කේත අඩංගු වේ. 

> 🟢 **වැදගත්ම කරුණ (Ads Safety):** ඔබගේ වෙබ් අඩවියේ දැනට පවතින කිසිදු Advertisement එකක් (AdBanner, AcornTar scripts, AntiAdBlock, Popunder ad cooldown) වෙනස් කර හෝ ඉවත් කර **නැත**. සියලුම SEO වෙනස්කම් Ads වලට කිසිදු බාධාවක් නොවන පරිදි සිදු කර ඇත.

---

## 📁 ගොනු ව්‍යුහය (File Structure)

ඔබගේ GitHub Repo එකට පහසුවෙන් replace කරගත හැකි වන පරිදි folder structure එක සකසා ඇත:

```
update/
├── sql/
│   └── schema_update.sql          <-- Supabase Database Migration (Slugs & Fast Indexes)
├── src/
│   ├── components/
│   │   ├── Navbar.tsx             <-- Movies, TV Series, Latest internal links එකතු කර ඇත
│   │   └── Sidebar.tsx            <-- Dedicated routes navigation (Ads 100% preserved)
│   ├── routes/
│   │   ├── __root.tsx             <-- Meta keywords ඉවත් කර HTML lang/schema update කර ඇත
│   │   ├── index.tsx              <-- H1 fix, meta keywords remove, CSS animation (Framer Motion load අඩු කිරීම)
│   │   ├── movies.tsx             <-- [NEW] Dedicated Movies SEO Landing Page (/movies)
│   │   ├── tv-series.tsx          <-- [NEW] Dedicated TV Series SEO Landing Page (/tv-series)
│   │   ├── genres.$genre.tsx      <-- [NEW] Dedicated Genre SEO Landing Pages (/genres/action, /genres/sci-fi, etc.)
│   │   ├── latest.tsx             <-- [NEW] Freshness SEO Page (/latest)
│   │   ├── search.tsx             <-- [NEW] Search Page with noindex, follow (Duplicate content penalty වැළැක්වීමට)
│   │   ├── content.$id.tsx        <-- H1 intent reflect කිරීම, Subtitle specs/compatibility guide, breadcrumb fix
│   │   ├── episode.$id.tsx        <-- Episode H1, Subtitle specs/sync guide, genre links fix
│   │   └── sitemap[.]xml.ts       <-- Consolidated Server Sitemap Route
│   └── styles.css                 <-- Smooth fadeInUp CSS animation
├── functions/
│   └── sitemap.xml.js             <-- Cloudflare Pages Runtime Sitemap (All landing pages included)
├── generate-sitemap.js            <-- Build-time XML Sitemap Generator
├── public/
│   └── robots.txt                 <-- Clean robots.txt (Disallows admin & search query duplication)
└── README.md
```

---

## 🛠️ සිදුකරන ලද ප්‍රධාන SEO වෙනස්කම් (Summary of SEO Fixes)

### 🔴 Priority 1 — URL & Routing Architecture
1. **Dedicated Indexable Routes**:
   - `/movies` : සියලුම චිත්‍රපට උපසිරැසි සඳහා သီးသန့် landing page එකක්.
   - `/tv-series` : සියලුම TV Series උපසිරැසි සඳහා သီးသန့် landing page එකක්.
   - `/genres/:genre` : Action, Sci-Fi, Horror ආදී genres සඳහා high-converting landing pages.
   - `/latest` : අලුතින් upload වන උපසිරැසි Google freshness crawler එකට හසුවන පරිදි fresh listing page එකක්.
2. **Search Results Protection**:
   - `/search` පිටුවට `noindex, follow` robots directive එක ලබා දී ඇත. මඟින් Google search console එකේ thin content / duplicate content issues ඇතිවීම සම්පූර්ණයෙන්ම වළකී.
3. **Database Migration Script (`schema_update.sql`)**:
   - ඔබගේ කිසිදු පැරණි දත්තයක් මකා නොදමමින් (non-destructive) `slug` column එකක් සහ වේගවත් සෙවුම් සඳහා Postgres indexes එකතු කරන SQL script එක සකසා ඇත.

### 🟠 Priority 2 — Content Quality & Hierarchy
4. **Meta Keywords සම්පූර්ණයෙන්ම ඉවත් කිරීම**:
   - Google විසින් meta keywords සැලකිල්ලට නොගන්නා බැවින් `__root.tsx`, `index.tsx`, `content.$id.tsx`, `episode.$id.tsx` වලින් ඉවත් කර page load size අඩු කරන ලදී.
5. **Exact Intent H1 Headings**:
   - Movie page: `<Title> (<Year>) Sinhala Subtitle`
   - TV Series page: `<Show Name> Sinhala Subtitles`
   - Episode page: `<Show Name> S01E01 Sinhala Subtitle`
   - Home page: `PixelPopLK` නිවැරදි H1 hierarchy සහිතයි.
6. **Thin-Page Risk එකට පිළියම් (Subtitle Specifications & Compatibility Box)**:
   - සෑම Movie සහ Episode පිටුවකටම Technical Specifications Box එකක් එකතු කරන ලදී (.SRT Format, UTF-8 Encoding, BluRay/WEB-DL Sync, Player Compatibility Info). මෙයින් Google Panda / Helpful Content guidelines වලට අනුකූලව පිටුවේ අගය (content depth) ඉහළ යයි.
7. **Fake/Misleading Rating Count ඉවත් කිරීම**:
   - Google Structured Data guidelines වලට අනුව `ratingCount: "1"` වැනි placeholder අගයන් spam flags ඇති කරන බැවින් schema එක නිවැරදි කර ඇත.

### 🟡 Priority 3 — Internal Linking & Sitemap
8. **Internal Linking Network ශක්තිමත් කිරීම**:
   - Navbar එකට Movies, TV Series, Latest සෘජු links එකතු කරන ලදී.
   - Breadcrumbs සහ Genre badges සියල්ල generic query strings වෙනුවට dedicated landing pages වලට සම්බන්ධ කර ඇත.
9. **Sitemap Consolidate කිරීම**:
   - `generate-sitemap.js`, `functions/sitemap.xml.js`, සහ `sitemap[.]xml.ts` යන තුනම සමපාත කර `/movies`, `/tv-series`, `/latest`, `/genres/*` සියලුම URLs ඇතුළත් කර ඇත.

### 🟣 Priority 4 — Performance & Core Web Vitals
10. **Framer Motion බර අඩු කර Pure CSS Animations භාවිතය**:
    - Grid item cards වලට Framer Motion වෙනුවට සැහැල්ලු CSS `fadeInUp` keyframes යොදා JS execution time සහ CPU usage අවම කරන ලදී.
11. **Cumulative Layout Shift (CLS) වැළැක්වීම**:
    - සියලුම පෝස්ටර් පින්තූර සඳහා නිශ්චිත width සහ height ලබා දී layout shifts අවම කර ඇත.

---

## 🚀 GitHub Repo එකට දාගන්නා ආකාරය (How to Apply)

1. **Database Update (Supabase)**:
   - `update/sql/schema_update.sql` ගොනුවේ අන්තර්ගතය copy කරගන්න.
   - ඔබගේ **Supabase Dashboard** -> **SQL Editor** වෙත ගොස් paste කර **RUN** කරන්න. (පැරණි දත්ත කිසිවක් මැකෙන්නේ නැත).

2. **Files Replace කිරීම**:
   - `update/` ෆෝල්ඩරය ඇතුළේ ඇති `src`, `public`, `functions`, `generate-sitemap.js` ඔබගේ ප්‍රධාන GitHub repository එකේ අදාළ තැන් වලට copy/paste (replace) කරන්න.

3. **Git Commit & Push**:
   ```bash
   git add .
   git commit -m "feat(seo): enhance URL architecture, landing pages, metadata, and schemas"
   git push origin main
   ```
