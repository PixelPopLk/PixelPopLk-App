# PixelPopLK — Full Production Updates Package

මෙම `update/` ෆෝල්ඩරය තුළ වෙබ් අඩවිය සඳහා සාදන ලද සියලුම Options (Option 1, 2, 3 සහ නව Features 4) හි සම්පූර්ණ ගොනු අඩංගු කර ඇත.
ඔබගේ GitHub repository එකෙහි අදාළ paths වලට මෙම files කෙලින්ම **Copy-Replace** කරන්න.

---

## 📂 ෆෝල්ඩර ව්‍යුහය (Update Folder Structure):

```text
update/
├── package.json                         (Node sitemap build fix)
├── public/
│   ├── manifest.json                    (📱 PWA Web App Manifest)
│   └── sw.js                            (⚡ PWA Service Worker - Offline Cache)
└── src/
    ├── lib/
    │   └── fuzzySearch.ts               (🔍 Smart Sinhala/English Fuzzy Search Engine)
    ├── components/
    │   ├── AgeGate.tsx                  (🛡️ Clean AgeGate - No Ads, No Redirect)
    │   ├── DownloadCountdown.tsx        (📥 Smooth Native Download & Ticker)
    │   ├── Navbar.tsx                   (🔍 Fuzzy Search Live Dropdown)
    │   ├── PwaInstallPrompt.tsx         (📱 Mobile PWA Install App Prompt)
    │   └── ShareCardModal.tsx           (🎨 1200x630 Social Media Card Generator & PNG Exporter)
    ├── routes/
    │   ├── __root.tsx                   (📱 PWA Tags & 35s Balanced Ad Cooldown)
    │   ├── index.tsx                    (📜 Infinite Scroll & Fuzzy Search Grid)
    │   ├── content.$id.tsx              (🎨 Share Card Integration & .ZIP Labels)
    │   ├── episode.$id.tsx              (🎨 Episode Share Card & .ZIP Labels)
    │   ├── api.og.ts                    (🖼️ Dynamic Server-Side 1200x630 OG SVG Generator)
    │   └── sitemap[.]xml.ts             (🗺️ Image Sitemap Extension)
    ├── integrations/
    │   └── supabase/
    │       └── client.ts                (🔒 Data Leak Prevention & Session Fix)
    └── styles.css                       (🎨 Light/Dark Mode Contrast Tokens)
```

---

## 🌟 අලුතින් එක් කරන ලද ප්‍රධාන පහසුකම් (New Features Breakdown):

### 1. 📜 Database-Level Infinite Scroll
- Home page එකේදී චිත්‍රපට 24ක් මුලින් load වී, පහළට scroll කරද්දී `IntersectionObserver` හරහා ස්වයංක්‍රීයව අලුත් චිත්‍රපට පහළින් load වේ.
- Users ලාට බොත්තම් ඔබන්න අවශ්‍ය නැති අතර Smooth Infinite Scroll අත්දැකීමක් ලැබේ.

### 2. 🔍 Smart Sinhala & English Fuzzy Search
- **Typo Tolerance:** අකුරු 1-2ක් වැරදුනද හඳුනාගනී (e.g. `avangers` ➔ `Avengers`, `oppenhiemer` ➔ `Oppenheimer`).
- **Normalized Tokens:** `Spider-Man` = `Spiderman` = `Spider Man` ලෙස space/dash නොසලකා match කරයි.
- **Singlish & Sinhala Unicode:** `sinhala sub`, `film`, `ස්පයිඩර් මෑන්`, `ඇවෙන්ජර්ස්` ආදී ඕනෑම භාෂාවකින් සෙවිය හැක.

### 3. 📱 Progressive Web App (PWA) Support
- Android සහ iOS Users ලාට "📱 Install PixelPopLK App" prompt එක පෙන්වයි.
- දුරකථනයේ Home Screen එකට Native App එකක් මෙන් Add කරගත හැක.
- Offline Service Worker (`sw.js`) මඟින් Images සහ Layout ක්ෂණිකව load වේ.

### 4. 🎨 Social Media OG Share Card Generator
- ඕනෑම Movie හෝ Episode පිටුවක ඇති **Share Card (.png)** බොත්තම මඟින් 1200x630 HD Branded Poster Card එකක් Generate වේ.
- Poster, Title, Rating, Sinhala Subtitle Badges සමඟ 1-Click PNG Download කර WhatsApp Status, Facebook Stories හෝ Telegram Channels වල Share කළ හැක.
- `/api/og?id=...` dynamic server-side image endpoint එකක්ද ඇතුළත්ය.

---

## 🚀 GitHub Deploy කරන්නේ කෙසේද?:
1. ඔබගේ Local repo එකේ හෝ GitHub Web එකේ `update/` ෆෝල්ඩරයේ ඇති `public` සහ `src` ඇතුළු සියලු files ඒ ඒ folder paths වලට copy-replace කරන්න.
2. Commit & Push කරන්න.
3. Cloudflare Pages විසින් Build එක ස්වයංක්‍රීයවම Deploy කරනු ඇත! ✅
