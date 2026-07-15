/**
 * Full-text local verse search
 * Indexes KJV chapters already cached in localStorage (sc-v:* keys).
 * Falls back gracefully when no cache is available yet.
 *
 * Search strategy:
 *   1. Tokenise query into required words.
 *   2. Score each cached verse by how many query words it contains.
 *   3. Return top N results sorted by relevance then canonical order.
 */

import { BOOKS } from './data.js';

/** Build a lookup from ab (lowercase) → book object */
const AB_MAP = Object.fromEntries(BOOKS.map(b => [b.ab.replace(/\+/g, ' ').toLowerCase(), b]));
const AB3_MAP = Object.fromEntries(BOOKS.map(b => [b.ab3.toLowerCase(), b]));
const NUM_MAP = Object.fromEntries(BOOKS.map(b => [b.num, b]));

/**
 * Parse a localStorage key like "sc-v:genesis:3:kjv"
 * Returns { book, chapter } or null.
 */
function parseCacheKey(rawKey) {
  // key format: sc-v:<ab>:<chapter>:<translation>
  const key = rawKey.replace(/^sc-v:/, '');
  const parts = key.split(':');
  if (parts.length < 3) return null;
  const tKey = parts[parts.length - 1];
  if (tKey !== 'kjv') return null; // index KJV only for consistent offline search
  const chapter = parseInt(parts[parts.length - 2], 10);
  const bookAb = parts.slice(0, parts.length - 2).join(':').toLowerCase();
  const book = AB_MAP[bookAb] || AB3_MAP[bookAb] || null;
  if (!book || !Number.isFinite(chapter)) return null;
  return { book, chapter };
}

/**
 * Load all KJV verses already cached in localStorage.
 * Returns an array of { book, chapter, verse, text } objects.
 */
function loadIndexedVerses() {
  const verses = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const rawKey = localStorage.key(i);
      if (!rawKey || !rawKey.startsWith('sc-v:')) continue;
      const meta = parseCacheKey(rawKey);
      if (!meta) continue;
      const raw = localStorage.getItem(rawKey);
      if (!raw) continue;
      let data;
      try { data = JSON.parse(raw); } catch { continue; }
      const verseArr = Array.isArray(data) ? data : (data?.verses || []);
      for (const v of verseArr) {
        if (v && v.text && v.verse) {
          verses.push({ book: meta.book, chapter: meta.chapter, verse: v.verse, text: v.text });
        }
      }
    }
  } catch { /* localStorage unavailable */ }
  return verses;
}

/**
 * Tokenise a search query into lowercase words, filtering stop words.
 */
const STOP_WORDS = new Set(['a','an','the','and','or','of','in','to','is','it','he','she','they','for','on','with','that','this','his','her','but','not','be','at','by','from','as','we','you','i','my','thy','thine','your','our','was','were','are','has','have','had','shall','will','would','could','should','did','do','does','so','if','then','into','unto','upon','which','who','whom','when','where','how','said','unto','also','let','yet','thus','all','any','no','nor','may','might','us','him','them','their','its','those','these']);

function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Score a verse text against query tokens.
 * Returns a number 0–N (higher = more relevant).
 */
function scoreVerse(verseText, queryTokens) {
  const lower = verseText.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    // Exact word match scores 2, partial match scores 1
    const wordBoundary = new RegExp(`\\b${token}\\b`);
    if (wordBoundary.test(lower)) score += 2;
    else if (lower.includes(token)) score += 1;
  }
  return score;
}

/**
 * Main search function.
 * @param {string} query - User search string
 * @param {number} limit - Max results to return (default 12)
 * @returns {Array<{ book, chapter, verse, text, score }>}
 */
export function searchVerses(query, limit = 12) {
  if (!query || query.trim().length < 3) return [];

  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const indexed = loadIndexedVerses();
  if (indexed.length === 0) return [];

  const scored = [];
  for (const v of indexed) {
    const s = scoreVerse(v.text, tokens);
    if (s > 0) scored.push({ ...v, score: s });
  }

  // Sort by score desc, then canonical order (bookNum, chapter, verse)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.book.num !== b.book.num) return a.book.num - b.book.num;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  return scored.slice(0, limit);
}

/**
 * How many KJV chapters are indexed locally.
 * Useful for showing "X chapters indexed" in the UI.
 */
export function getIndexedChapterCount() {
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sc-v:') && k.endsWith(':kjv')) count++;
    }
  } catch {}
  return count;
}
