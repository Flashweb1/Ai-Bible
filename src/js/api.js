import { BOOKS } from './data.js';

const cache = new Map();

const HAO_TID = {
  kjv: 'KJV',
  niv: 'NIV2011',
  esv: 'ESV',
  nkjv: 'NKJV',
  nlt: 'NLT',
  nasb: 'NASB',
  net: 'NET',
  amp: 'AMP',
  msg: 'MSG',
  web: 'WEB',
  asv: 'ASV',
  ylt: 'YLT'
};

function cleanText(text) {
  return text
    .replace(/<S>\d+<\/S>/g, '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/[GH]\d{1,4}|\b\d{1,5}\b/g, '')
    .replace(/\s*[a-z]+: (or|Heb|Gk|Gr|Lat|Lit|meaning).+$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .trim();
}

function getLocal(key) {
  try { const v = localStorage.getItem('sc-v:' + key); return v ? JSON.parse(v) : null } catch { return null }
}
function setLocal(key, data) {
  try { localStorage.setItem('sc-v:' + key, JSON.stringify(data)) } catch {}
}

async function fetchJSON(url, ms = 3000) {
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
  if (local) {
    const normalized = Array.isArray(local) ? { verses: local, source: 'cached' } : local;
    cache.set(cacheKey, normalized);
    return normalized;
  }

  const ab3 = book.ab3;
  const tid = HAO_TID[tKey];

  // Race all APIs — first one with valid verses wins
  // Prioritize local files for speed and offline access
  const race = [];
  
  const baseUrl = import.meta.env.BASE_URL || '/';

  // 1. Local JSON files (highest priority)
  race.push(
    fetch(`${baseUrl}bibles/${tKey}/${book.ab3.toLowerCase()}/${chapter}.json`, { signal: AbortSignal.timeout(5000) })
      .then(response => {
        if (!response.ok) throw new Error("Local file not found");
        return response.json();
      })
      .then(verses => { if (!Array.isArray(verses) || !verses.length) throw new Error("Empty local verses"); return { verses, source: 'local file' }; })
  );

  // Bolls Life API - Best source for modern translations
  if (tid) {
    race.push(
      fetchJSON(`https://bolls.life/get-text/${tid}/${book.num}/${chapter}/`)
        .then(d => {
          if (!Array.isArray(d) || !d.length) throw new Error("Invalid Bolls response");
          return d.map(v => ({
            verse: v.verse,
            text: cleanText(v.text)
          }));
        })
    );
  }

  race.push(
    fetchJSON(`https://bible-api.com/${book.ab.replace(/\+/g, ' ')}+${chapter}?translation=${translation}`)
      .then(d => {
        const verses = (d?.verses || []).map(v => ({ verse: v.verse, text: cleanText(v.text) }));
        if (!verses.length) throw new Error("Empty verses");
        return { verses, source: 'Bible API' };
      })
  );

  race.push(
    fetchJSON(`https://getbible.net/v2/${translation}/${book.num}/${chapter}.json`)
      .then(d => {
        const verses = Object.values(d?.verses || {}).map(v => ({ verse: v.verse, text: cleanText(v.text) }));
        if (!verses.length) throw new Error("Empty verses");
        return { verses, source: 'GetBible' };
      })
  );

  const winner = await Promise.any(race).catch(() => {
    throw new Error(`All Bible sources failed for ${book.n} ${chapter}`);
  });

  const normalizedWinner = Array.isArray(winner) ? { verses: winner, source: 'unknown' } : winner;
  cache.set(cacheKey, normalizedWinner);
  setLocal(cacheKey, normalizedWinner);
  return normalizedWinner;
}

/**
 * Helper to get the correct API base URL
 */
function getApiBase() {
  const envUrl = import.meta.env.VITE_API_URL || '';
  if (!envUrl) return '';
  // Normalize: Remove trailing slashes and the /api suffix if the user included it
  return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
}

export async function askAI(messages, systemPrompt) {
  // Use relative path in dev to leverage Vite proxy, or absolute URL in prod
  const endpoint = `${getApiBase()}/api/ai/ask`;

  console.log(`[API] Fetching AI Response from: ${endpoint}`);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);

  try {
    const res = await fetch(endpoint, {
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
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('AI request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function askAIStream(messages, systemPrompt, onToken, externalSignal) {
  const endpoint = `${getApiBase()}/api/ai/ask/stream`;

  console.log(`[API] Opening AI Stream at: ${endpoint}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const res = await fetch(endpoint, {
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
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;
      
      // Remove 'data: ' prefix (handles both 'data:' and 'data: ')
      const jsonStr = trimmedLine.replace(/^data:\s*/, '');
      
      try {
        const data = JSON.parse(jsonStr);
        if (data.done) return;
        if (data.token !== undefined && data.token !== null) onToken(data.token);
      } catch (e) {
        // Silent catch for partial JSON chunks, will be picked up in next read
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
