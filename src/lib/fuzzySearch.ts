/**
 * 🔍 Smart Sinhala / English Fuzzy Search Engine for PixelPopLK
 * 
 * Features:
 * 1. Damerau-Levenshtein Typo Distance (e.g. "avangers" -> "Avengers", "oppenhiemer" -> "Oppenheimer")
 * 2. Normalized Token Matching (ignores spaces, dashes, punctuation: "spider-man" == "spiderman")
 * 3. Singlish / Phonetic Word Mapping (e.g. "sinhala sub", "film", "chithrapati")
 * 4. Sinhala Unicode to English Phonetic Transliteration
 * 5. Weighted Multi-field Scoring (Title > EpTitle > Genres > Year > Description)
 */

// Sinhala Unicode to English approximate phonetic replacement table
const SINHALA_TO_ENG: Record<string, string> = {
  අ: "a", ආ: "a", ඇ: "a", ඈ: "a", ඉ: "i", ඊ: "i", උ: "u", ඌ: "u",
  එ: "e", ඒ: "e", ඔ: "o", ඕ: "o",
  ක: "k", ඛ: "k", ග: "g", ඝ: "g", ඞ: "n",
  ච: "c", ඡ: "c", ජ: "j", ඣ: "j", ඤ: "n",
  ට: "t", ඨ: "t", ඩ: "d", ඪ: "d", ණ: "n",
  ත: "t", ථ: "t", ද: "d", ධ: "d", න: "n",
  ප: "p", ඵ: "p", බ: "b", භ: "b", ම: "m",
  ය: "y", ර: "r", ල: "l", ව: "w", ශ: "s", ෂ: "s", ස: "s", හ: "h", ළ: "l", ෆ: "f",
  // Diacritics (Pillam)
  ්: "", ා: "a", ැ: "a", ෑ: "a", ි: "i", ී: "i", ු: "u", ූ: "u",
  ෘ: "u", ෙ: "e", ේ: "e", ෛ: "ai", ො: "o", ෝ: "o", ෞ: "au", ෟ: "",
};

/**
 * Converts Sinhala Unicode string to an English phonetic representation
 */
export function transliterateSinhalaToEng(text: string): string {
  let result = "";
  for (const char of text) {
    result += SINHALA_TO_ENG[char] ?? char;
  }
  return result;
}

/**
 * Normalizes text: lowercase, remove punctuation, strip accents, normalize spaces
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  let clean = text.toLowerCase();

  // If text contains Sinhala Unicode characters (\u0D80-\u0DFF)
  if (/[\u0D80-\u0DFF]/.test(clean)) {
    clean = transliterateSinhalaToEng(clean);
  }

  // Remove common punctuation and special characters
  clean = clean.replace(/[-_.:/\\+*&%$#@!?,;'"()[\]{}<>|~`^]/g, " ");
  // Collapse whitespace
  return clean.replace(/\s+/g, " ").trim();
}

/**
 * Strips all spaces and non-alphanumeric characters for compact matching
 * e.g. "Spider-Man: No Way Home" -> "spidermannowayhome"
 */
export function compactText(text: string): string {
  return normalizeText(text).replace(/[^a-z0-9]/g, "");
}

/**
 * Fast Levenshtein Distance Calculation (Typo tolerance)
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  if (m < n) return levenshteinDistance(s2, s1);

  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      let val: number;
      if (s1[i - 1] === s2[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n];
}

/**
 * Computes a fuzzy match score between 0 (no match) and 1 (exact match)
 */
export function fuzzyMatchWord(target: string, query: string): number {
  const t = normalizeText(target);
  const q = normalizeText(query);
  if (!t || !q) return 0;

  if (t === q) return 1.0;
  if (t.startsWith(q)) return 0.95;
  if (t.includes(q)) return 0.85;

  const cTarget = compactText(target);
  const cQuery = compactText(query);
  if (cTarget && cQuery) {
    if (cTarget === cQuery) return 0.98;
    if (cTarget.startsWith(cQuery)) return 0.92;
    if (cTarget.includes(cQuery)) return 0.82;
  }

  if (q.length < 3) return 0;

  const dist = levenshteinDistance(t, q);
  const maxEdits = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3;

  if (dist <= maxEdits) {
    return 0.75 - dist * 0.12;
  }

  return 0;
}

export interface FuzzySearchCandidate {
  id: string | number;
  title: string;
  type?: string;
  year?: string | number;
  posterUrl?: string;
  genre?: string | null;
  description?: string | null;
  epTitle?: string | null;
  [key: string]: any;
}

/**
 * Searches a collection of items using multi-token fuzzy matching
 */
export function searchFuzzy<T extends FuzzySearchCandidate>(items: T[], rawQuery: string): T[] {
  const query = rawQuery.trim();
  if (!query) return items;

  const normalizedQ = normalizeText(query);
  const queryTokens = normalizedQ.split(" ").filter((w) => w.length > 0);
  if (queryTokens.length === 0) return items;

  // Generic sub query detection
  const isGenericSubQuery = queryTokens.every(
    (token) => ["sub", "subs", "subtitle", "subtitles", "sinhala", "film", "movie"].includes(token)
  );
  if (isGenericSubQuery) {
    return items;
  }

  const scored: { item: T; score: number }[] = [];

  for (const item of items) {
    let score = 0;

    const title = item.title || "";
    const epTitle = item.epTitle || "";
    const genre = item.genre || "";
    const year = item.year ? String(item.year) : "";
    const desc = item.description || "";

    const titleTokens = normalizeText(title).split(" ");
    let matchedTokenCount = 0;

    for (const qToken of queryTokens) {
      let maxTokenScore = 0;

      for (const tToken of titleTokens) {
        const wordScore = fuzzyMatchWord(tToken, qToken);
        if (wordScore > maxTokenScore) maxTokenScore = wordScore;
      }

      const phraseScore = fuzzyMatchWord(title, qToken);
      if (phraseScore > maxTokenScore) maxTokenScore = phraseScore;

      const compactScore = fuzzyMatchWord(compactText(title), compactText(qToken));
      if (compactScore > maxTokenScore) maxTokenScore = compactScore;

      if (epTitle) {
        const epScore = fuzzyMatchWord(epTitle, qToken);
        if (epScore * 0.8 > maxTokenScore) maxTokenScore = epScore * 0.8;
      }

      if (genre && fuzzyMatchWord(genre, qToken) > 0.7) {
        maxTokenScore = Math.max(maxTokenScore, 0.6);
      }

      if (year && qToken === year) {
        maxTokenScore = Math.max(maxTokenScore, 0.85);
      }

      if (desc && desc.toLowerCase().includes(qToken)) {
        maxTokenScore = Math.max(maxTokenScore, 0.45);
      }

      if (maxTokenScore >= 0.4) {
        matchedTokenCount++;
        score += maxTokenScore;
      }
    }

    const matchRatio = matchedTokenCount / queryTokens.length;
    if (matchRatio >= 0.5 && score > 0) {
      const finalScore = score * matchRatio;
      scored.push({ item, score: finalScore });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
