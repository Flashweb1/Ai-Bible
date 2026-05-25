import { BOOKS } from './data.js';

const cache = new Map();

const HAO_TID = {
  kjv: 'eng_kjv',
  web: 'ENGWEBP',
  bbe: 'eng_bbe',
  ylt: 'eng_ylt',
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
  const book = BOOKS.find(b => b.num === bookNum);
  if (!book) throw new Error("Book not found");

  const cacheKey = `${book.ab}:${chapter}:${translation}`;

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const local = getLocal(cacheKey);
  if (local) { cache.set(cacheKey, local); return local; }

  const ab3 = book.ab3;
  const haoTid = HAO_TID[translation];

  // Race all APIs — first one with valid verses wins
  const race = [];

  if (haoTid) {
    race.push(
      fetchJSON(`https://bible.helloao.org/api/${haoTid}/${ab3}/${chapter}.json`)
        .then(d => {
          const verses = (d?.chapter?.content || []).filter(v => v.type === 'verse').map(v => ({
            verse: v.number,
            text: v.content.filter(c => typeof c === 'string').join('').trim()
          }));
          if (!verses.length) throw new Error("Empty verses");
          return verses;
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

  const res = await fetch(`${baseUrl}/ai/ask/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt }),
  });

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
      const data = JSON.parse(line.slice(6));
      if (data.done) return;
      if (data.token) onToken(data.token);
    }
  }
}
