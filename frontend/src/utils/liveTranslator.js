/**
 * Live Translation Engine — NEC Sports Management System
 *
 * Uses the FREE MyMemory Translation API (no API key needed, 1000 words/day free).
 * Endpoint: https://api.mymemory.translated.net/get?q=TEXT&langpair=en|ta
 *
 * Architecture:
 *  1. English strings stay as the single source of truth in translations.js
 *  2. When user selects Tamil (ta) or Hindi (hi), we batch-translate all English
 *     strings via MyMemory API → cache results in localStorage
 *  3. On next language switch, we serve from cache (no API call)
 *  4. Cache TTL: 7 days — refreshes automatically when stale
 *  5. Graceful fallback: if API is unavailable, falls back to static translations.js
 */

import { TRANSLATIONS } from "./translations";

// ── Config ────────────────────────────────────────────────────
const CACHE_PREFIX    = "nec_live_trans_";
const CACHE_TTL_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days
const API_BASE        = "https://api.mymemory.translated.net/get";
// MyMemory: free, no key, ~1000 words/day. Register email for 10k/day.
const MYMEMORY_EMAIL  = ""; // optional: add your email for higher free quota

// ── Language code mapping ─────────────────────────────────────
const LANG_CODES = {
  ta: "ta-IN", // Tamil (India)
  hi: "hi-IN", // Hindi (India)
  // add more languages here without any other code change:
  // fr: "fr-FR",
  // de: "de-DE",
  // te: "te-IN", // Telugu
  // ml: "ml-IN", // Malayalam
};

// ── Cache helpers ─────────────────────────────────────────────
const getCacheKey = (lang) => `${CACHE_PREFIX}${lang}`;

const readCache = (lang) => {
  try {
    const raw = localStorage.getItem(getCacheKey(lang));
    if (!raw) return null;
    const { translations, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL_MS) return null; // expired
    return translations;
  } catch {
    return null;
  }
};

const writeCache = (lang, translations) => {
  try {
    localStorage.setItem(
      getCacheKey(lang),
      JSON.stringify({ translations, savedAt: Date.now() })
    );
  } catch {
    // Storage full or unavailable — not critical
  }
};

const clearTranslationCache = (lang) => {
  if (lang) localStorage.removeItem(getCacheKey(lang));
  else Object.keys(LANG_CODES).forEach((l) => localStorage.removeItem(getCacheKey(l)));
};

// ── Core Translation Fetcher ──────────────────────────────────

/**
 * Translates a single string via MyMemory API.
 * Returns the translated string, or the original text on failure.
 */
const translateOneString = async (text, targetLangCode) => {
  try {
    const email = MYMEMORY_EMAIL ? `&de=${encodeURIComponent(MYMEMORY_EMAIL)}` : "";
    const url = `${API_BASE}?q=${encodeURIComponent(text)}&langpair=en|${targetLangCode}${email}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    // MyMemory returns error message in translated text when quota hit
    if (!translated || translated.includes("MYMEMORY WARNING")) return text;
    return translated;
  } catch {
    return text; // fallback to original English
  }
};

/**
 * Translates all English strings in TRANSLATIONS.en to the target language.
 *
 * Strategy:
 *  - Batches strings in groups of 10 with small delay to respect rate limits
 *  - Reports progress via onProgress(percent) callback for UI loading bar
 *  - Returns a flat { key: translatedValue } object matching TRANSLATIONS.en shape
 */
export const fetchLiveTranslations = async (
  lang,
  { onProgress = () => {}, signal } = {}
) => {
  const langCode = LANG_CODES[lang];
  if (!langCode) {
    console.warn(`[LiveTranslate] Unsupported language: ${lang}`);
    return null;
  }

  // Return from cache if fresh
  const cached = readCache(lang);
  if (cached) {
    onProgress(100);
    return cached;
  }

  const enStrings = TRANSLATIONS.en;
  const keys = Object.keys(enStrings);
  const result = {};

  const BATCH_SIZE = 8;
  const BATCH_DELAY_MS = 300; // be nice to the free API

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = keys.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (key) => {
        const original = enStrings[key];
        if (typeof original !== "string" || !original.trim()) {
          result[key] = original;
          return;
        }
        result[key] = await translateOneString(original, langCode);
      })
    );

    const percent = Math.round(((i + BATCH_SIZE) / keys.length) * 100);
    onProgress(Math.min(percent, 99));

    if (i + BATCH_SIZE < keys.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  onProgress(100);
  writeCache(lang, result);
  return result;
};

// ── State management (singleton per session) ──────────────────

/** In-memory store: lang → translated dict (hot, avoids re-reading localStorage) */
const inMemoryCache = {};

/**
 * Get translations for a language.
 * Priority: in-memory → localStorage cache → static file → live API
 *
 * Returns { translations, fromCache: boolean }
 */
export const getTranslations = async (
  lang,
  { onProgress, onStart, onDone, signal } = {}
) => {
  if (lang === "en") return { translations: TRANSLATIONS.en, fromCache: true };

  // 1. In-memory (fastest)
  if (inMemoryCache[lang]) return { translations: inMemoryCache[lang], fromCache: true };

  // 2. localStorage cache
  const cached = readCache(lang);
  if (cached) {
    inMemoryCache[lang] = cached;
    return { translations: cached, fromCache: true };
  }

  // 3. Static fallback while API loads
  const staticFallback = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // 4. Live API fetch
  onStart?.();
  try {
    const live = await fetchLiveTranslations(lang, { onProgress, signal });
    if (live) {
      inMemoryCache[lang] = live;
      onDone?.();
      return { translations: live, fromCache: false };
    }
  } catch (e) {
    console.warn("[LiveTranslate] API fetch failed, using static fallback:", e);
  }

  onDone?.();
  return { translations: staticFallback, fromCache: false };
};

/**
 * Invalidate a language from all caches (force re-fetch on next use).
 */
export const invalidateTranslationCache = (lang) => {
  clearTranslationCache(lang);
  delete inMemoryCache[lang];
};

/**
 * Check if a language has a valid cached translation set.
 */
export const hasTranslationCache = (lang) => {
  if (lang === "en") return true;
  return !!readCache(lang);
};

/**
 * Get cache status info for a language.
 */
export const getTranslationCacheInfo = (lang) => {
  if (lang === "en") return { cached: true, age: null, expiresIn: null };
  try {
    const raw = localStorage.getItem(getCacheKey(lang));
    if (!raw) return { cached: false };
    const { savedAt } = JSON.parse(raw);
    const ageMs = Date.now() - savedAt;
    const expiresInMs = CACHE_TTL_MS - ageMs;
    return {
      cached: expiresInMs > 0,
      ageHours: Math.floor(ageMs / 3600000),
      expiresInDays: Math.floor(expiresInMs / 86400000),
    };
  } catch {
    return { cached: false };
  }
};

export { LANG_CODES, invalidateTranslationCache as clearCache };
