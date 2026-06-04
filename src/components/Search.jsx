import React, { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { BOOKS, MENU_LINKS, DAILY } from '../js/data.js';

// Simple debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Search({ onSelect, onClose }) {
  const [q, setQ] = useState('');
  const [navResults, setNavResults] = useState([]);
  const [verseResults, setVerseResults] = useState([]);
  const [verseLoading, setVerseLoading] = useState(false);

  const debouncedQ = useDebounce(q, 380);

  // ── Fuse navigation corpus ─────────────────────────────────────────────────
  const corpus = useMemo(() => {
    const bookItems = BOOKS.map(b => ({ type: 'book', id: `book:${b.n}`, title: b.n, payload: b }));
    const menuItems = MENU_LINKS.map(m => ({ type: 'menu', id: `menu:${m.id}`, title: m.label, payload: m }));
    const daily = DAILY.map((d, i) => ({ type: 'daily', id: `daily:${i}`, title: d.ref, snippet: d.text, payload: d }));
    return [...bookItems, ...menuItems, ...daily];
  }, []);

  const fuse = useMemo(() => new Fuse(corpus, { keys: ['title', 'snippet'], threshold: 0.35 }), [corpus]);

  useEffect(() => {
    if (!q) { setNavResults([]); return; }
    setNavResults(fuse.search(q, { limit: 5 }).map(x => x.item));
  }, [q, fuse]);

  // ── Full-text scripture search via bolls.life ──────────────────────────────
  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 3) {
      setVerseResults([]);
      setVerseLoading(false);
      return;
    }

    let cancelled = false;
    setVerseLoading(true);

    fetch(`https://bolls.life/search/KJV/${encodeURIComponent(debouncedQ)}/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (cancelled) return;
        const verses = (Array.isArray(data) ? data : []).slice(0, 8).map(v => {
          const book = BOOKS.find(b => b.num === v.book);
          return {
            type: 'verse-result',
            id: `vs:${v.book}:${v.chapter}:${v.verse}`,
            title: `${v.book_name || (book ? book.n : '')} ${v.chapter}:${v.verse}`,
            snippet: (v.text || '').replace(/<[^>]+>/g, '').slice(0, 90) + '…',
            book,
            chapter: v.chapter,
          };
        }).filter(v => v.book); // drop unmapped books
        setVerseResults(verses);
      })
      .catch(() => { if (!cancelled) setVerseResults([]); })
      .finally(() => { if (!cancelled) setVerseLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQ]);

  // ── Keyboard close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleVerseSelect = (item) => {
    onSelect({ type: 'book', payload: item.book, chapter: item.chapter });
  };

  const hasResults = navResults.length > 0 || verseResults.length > 0 || verseLoading;

  return (
    <div className="search-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-box">
        <input
          autoFocus
          placeholder="Search books, topics or verses…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {!hasResults && q.length > 0 && q.length < 3 && (
          <div style={{ padding: '8px 14px', color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
            Keep typing to search scriptures…
          </div>
        )}

        {navResults.length > 0 && (
          <div className="search-results">
            <div className="search-section-lbl">Books &amp; Navigation</div>
            {navResults.map(r => (
              <div key={r.id} className="search-result" onClick={() => onSelect(r)}>
                <div className="search-title">{r.title}</div>
                {r.snippet && <div className="search-snippet">{r.snippet}</div>}
              </div>
            ))}
          </div>
        )}

        {debouncedQ.length >= 3 && (
          <div className="search-results">
            <div className="search-section-lbl">
              📖 Scripture Search
              {verseLoading && (
                <span style={{ marginLeft: 6, opacity: 0.5, fontSize: '10px' }}>searching…</span>
              )}
            </div>
            {verseResults.length > 0 ? verseResults.map(r => (
              <div key={r.id} className="search-result" onClick={() => handleVerseSelect(r)}>
                <div className="search-title" style={{ color: 'var(--gold)' }}>{r.title}</div>
                <div className="search-snippet">{r.snippet}</div>
              </div>
            )) : !verseLoading && (
              <div style={{ padding: '8px 14px', color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
                No verses found for "{debouncedQ}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
