import { BOOKS } from './data.js';

const cache = new Map();

const HAO_TID = {
  kjv: 'KJV',
  niv: 'NIV',
  esv: 'ESV',
  nkjv: 'NKJV',
  nlt: 'NLT',
  nasb: 'NASB',
  nrsv: 'NRSV',
  bsb: 'BSB',
  net: 'NET',
  amp: 'AMP',
  msg: 'MSG',
  web: 'WEB',
  asv: 'ASV',
  ylt: 'YLT',
  bbe: 'BBE'
};

function getLocal(key) {
  try { const v = localStorage.getItem('sc-v:' + key); return v ? JSON.parse(v) : null } catch { return null }
}
function setLocal(key, data) {
  try { localStorage.setItem('sc-v:' + key, JSON.stringify(data)) } catch {}
}

async function fetchJSON(url, ms = 6000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getChapter(bookNum, chapter, translation) {
  const book = BOOKS.find(b => b.num == bookNum);
  if (!book) throw new Error("Book not found");

  // Ensure translation key is lowercase for consistent caching and lookups
  const tKey = translation.toLowerCase();
  const cacheKey = `${book.ab}:${chapter}:${tKey}`;

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const local = getLocal(cacheKey);
  if (local) { cache.set(cacheKey, local); return local; }

  const ab3 = book.ab3;
  const tid = HAO_TID[tKey];

  // Race all APIs — first one with valid verses wins
  // Prioritize local files for speed and offline access
  const race = [];

  // 1. Local JSON files (highest priority)
  race.push(
    fetch(`/bibles/${tKey}/${book.ab3.toLowerCase()}/${chapter}.json`)
      .then(response => {
        if (!response.ok) throw new Error("Local file not found");
        return response.json();
      })
      .then(verses => { if (!verses.length) throw new Error("Empty local verses"); return verses; })
  );

  if (tid) {
    race.push(
      fetchJSON(`https://bible.helloao.org/api/${tid}/${ab3}/${chapter}.json`)
        .then(d => {
          const verses = (d?.chapter?.content || []).filter(v => v.type === 'verse').map(v => ({
            verse: v.number,
            text: v.content
              .map(c => typeof c === 'string' ? c : (c.text || ''))
              .join('')
              .replace(/<[^>]*>?/gm, '') // Strip HTML
              .replace(/\d{3,5}/g, '') // Strip Strong's numbers (3-5 digits)
              .trim()
          }));
          if (!verses.length) throw new Error("Empty verses");
          return verses;
        })
    );
  }

  // Add Bolls Life API - Excellent for modern versions like NIV, ESV, NLT, NRSV
  if (tid) {
    race.push(
      fetchJSON(`https://bolls.life/get-text/${tid}/${book.num}/${chapter}/`)
        .then(d => {
          if (!Array.isArray(d) || !d.length) throw new Error("Invalid Bolls response");
          return d.map(v => ({
            verse: v.verse,
            text: v.text
              .replace(/<[^>]*>?/gm, '') // Strip HTML
              .replace(/\d{3,5}/g, '') // Strip Strong's numbers (Indices)
              .replace(/\s*[a-z]+: (or|Heb|Gk|Gr|Lat|Lit|meaning).+$/gi, '') // Strip Margin Notes
              .trim()
          }));
        })
    );
  }

  race.push(
    fetchJSON(`https://bible-api.com/${book.ab.replace(/\+/g, ' ')}+${chapter}?translation=${translation}`)
      .then(d => {
        const verses = (d?.verses || []).map(v => ({ verse: v.verse, text: v.text.trim() }));
        if (!verses.length) throw new Error("Empty verses");
        return verses;
      })
  );

  race.push(
    fetchJSON(`https://getbible.net/v2/${translation}/${book.num}/${chapter}.json`)
      .then(d => {
        const verses = Object.values(d?.verses || {}).map(v => ({ verse: v.verse, text: v.text.trim() }));
        if (!verses.length) throw new Error("Empty verses");
        return verses;
      })
  );

  try {
    const winner = await Promise.any(race);
    cache.set(cacheKey, winner);
    setLocal(cacheKey, winner);
    return winner;
  } catch (err) {
    throw new Error("Could not load chapter. Check your internet connection.");
  }
}

export async function askAI(messages, systemPrompt) {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);

  try {
    const res = await fetch(`${baseUrl}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemPrompt }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      let msg;
      try { msg = JSON.parse(text).error; } catch { msg = text || `Server error (${res.status})`; }
      throw new Error(msg);
    }

    const data = await res.json();
    return data.response;
  } finally {
    clearTimeout(timer);
  }
}

export async function askAIStream(messages, systemPrompt, onToken) {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const res = await fetch(`${baseUrl}/ai/ask/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt }),
    signal: controller.signal,
  }).catch((e) => { clearTimeout(timeout); throw e; });

  clearTimeout(timeout);

  if (!res) throw new Error('No response from AI server');
  if (!res.ok) {
    const text = await res.text().catch(() => `Server error (${res?.status})`);
    throw new Error(text || `Server error (${res.status})`);
  }

  if (!res.body || typeof res.body.getReader !== 'function') {
    throw new Error('Server did not return a readable stream for AI responses');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.done) return;
        if (data.token) onToken(data.token);
      } catch (e) {
        console.warn("AI Stream chunk error:", e);
      }
    }
  }
}

/**
 * Fetches commentary for a specific chapter to provide context for the AI.
 * @param {string} commentaryId - e.g., 'matthew_henry'
 */
export async function getCommentary(commentaryId, bookAb3, chapter) {
  const data = await fetchJSON(`https://bible.helloao.org/api/${commentaryId}/${bookAb3}/${chapter}.json`);
  if (!data) return null;
  
  // Format the commentary content into a string for the AI
  return data.chapter.content
    .filter(c => c.type === 'commentary')
    .map(c => {
      if (Array.isArray(c.content)) return c.content.join(' ');
      return c.text || c.content || '';
    })
    .join('\n\n');
}
