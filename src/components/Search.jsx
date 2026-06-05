import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import { BOOKS, MENU_LINKS, DAILY } from '../js/data.js';

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
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef(null);

  const debouncedQ = useDebounce(q, 380);

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
        }).filter(v => v.book);
        setVerseResults(verses);
      })
      .catch(() => { if (!cancelled) setVerseResults([]); })
      .finally(() => { if (!cancelled) setVerseLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQ]);

  // Reset focus when results change
  useEffect(() => {
    setFocusedIdx(-1);
  }, [navResults, verseResults]);

  // Build flat list of all items for keyboard indexing
  const allItems = useMemo(() => {
    const items = [];
    navResults.forEach(r => items.push({ type: 'nav', item: r, onActivate: () => onSelect(r) }));
    verseResults.forEach(r => items.push({ type: 'verse', item: r, onActivate: () => onSelect({ type: 'book', payload: r.book, chapter: r.chapter }) }));
    return items;
  }, [navResults, verseResults, onSelect]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (allItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(prev => (prev <= 0 ? allItems.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      allItems[focusedIdx].onActivate();
    }
  }, [allItems, focusedIdx, onClose]);

  const hasResults = navResults.length > 0 || verseResults.length > 0 || verseLoading;

  return (
    <div className="search-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-box">
        <input
          ref={inputRef}
          autoFocus
          placeholder="Search books, topics or verses…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search"
          aria-autocomplete="list"
        />

        {!hasResults && q.length > 0 && q.length < 3 && (
          <div style={{ padding: '8px 14px', color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
            Keep typing to search scriptures…
          </div>
        )}

        {navResults.length > 0 && (
          <div className="search-results" role="listbox">
            <div className="search-section-lbl">Books &amp; Navigation</div>
            {navResults.map((r, i) => {
              const flatIdx = allItems.findIndex(x => x.type === 'nav' && x.item.id === r.id);
              return (
                <div
                  key={r.id}
                  className={`search-result ${focusedIdx === flatIdx ? 'focused' : ''}`}
                  onClick={() => onSelect(r)}
                  role="option"
                  aria-selected={focusedIdx === flatIdx}
                >
                  <div className="search-title">{r.title}</div>
                  {r.snippet && <div className="search-snippet">{r.snippet}</div>}
                </div>
              );
            })}
          </div>
        )}

        {debouncedQ.length >= 3 && (
          <div className="search-results" role="listbox">
            <div className="search-section-lbl">
              📖 Scripture Search
              {verseLoading && (
                <span style={{ marginLeft: 6, opacity: 0.5, fontSize: '10px' }}>searching…</span>
              )}
            </div>
            {verseResults.length > 0 ? verseResults.map((r, i) => {
              const flatIdx = allItems.findIndex(x => x.type === 'verse' && x.item.id === r.id);
              return (
                <div
                  key={r.id}
                  className={`search-result ${focusedIdx === flatIdx ? 'focused' : ''}`}
                  onClick={() => onSelect({ type: 'book', payload: r.book, chapter: r.chapter })}
                  role="option"
                  aria-selected={focusedIdx === flatIdx}
                >
                  <div className="search-title" style={{ color: 'var(--gold)' }}>{r.title}</div>
                  <div className="search-snippet">{r.snippet}</div>
                </div>
              );
            }) : !verseLoading && (
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
