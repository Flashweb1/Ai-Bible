import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import { BOOKS, MENU_LINKS, DAILY } from '../js/data.js';
import { searchVerses, getIndexedChapterCount } from '../js/verseSearch.js';

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
  const [verseSource, setVerseSource] = useState(''); // 'local' | 'network'
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef(null);
  const indexedCount = useMemo(() => getIndexedChapterCount(), []);

  const debouncedQ = useDebounce(q, 320);

  const corpus = useMemo(() => {
    const bookItems = BOOKS.map(b => ({ type: 'book', id: `book:${b.n}`, title: b.n, payload: b }));
    const menuItems = MENU_LINKS.map(m => ({ type: 'menu', id: `menu:${m.id}`, title: m.label, payload: m }));
    const daily = DAILY.map((d, i) => ({ type: 'daily', id: `daily:${i}`, title: d.ref, snippet: d.text, payload: d }));
    return [...bookItems, ...menuItems, ...daily];
  }, []);

  const fuse = useMemo(() => new Fuse(corpus, { keys: ['title', 'snippet'], threshold: 0.35 }), [corpus]);

  // Nav results — instant fuzzy match
  useEffect(() => {
    if (!q) { setNavResults([]); return; }
    setNavResults(fuse.search(q, { limit: 5 }).map(x => x.item));
  }, [q, fuse]);

  // Verse results — local index first, network fallback
  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 3) {
      setVerseResults([]);
      setVerseLoading(false);
      setVerseSource('');
      return;
    }

    let cancelled = false;
    setVerseLoading(true);
    setVerseSource('');

    // ── Step 1: Try local index first (offline-capable, instant) ────────────
    const localHits = searchVerses(debouncedQ, 10);

    if (localHits.length > 0) {
      const mapped = localHits.map(v => ({
        type: 'verse-result',
        id: `vs:${v.book.num}:${v.chapter}:${v.verse}`,
        title: `${v.book.n} ${v.chapter}:${v.verse}`,
        snippet: v.text.length > 100 ? v.text.slice(0, 100) + '…' : v.text,
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
      }));
      if (!cancelled) {
        setVerseResults(mapped);
        setVerseSource('local');
        setVerseLoading(false);
      }

      // Still kick off network search in background to supplement if online
      if (navigator.onLine) {
        fetch(`https://bolls.life/search/KJV/${encodeURIComponent(debouncedQ)}/`)
          .then(r => r.ok ? r.json() : [])
          .then(data => {
            if (cancelled) return;
            const networkVerses = (Array.isArray(data) ? data : [])
              .slice(0, 8)
              .map(v => {
                const book = BOOKS.find(b => b.num === v.book);
                if (!book) return null;
                return {
                  type: 'verse-result',
                  id: `vs:${v.book}:${v.chapter}:${v.verse}`,
                  title: `${v.book_name || book.n} ${v.chapter}:${v.verse}`,
                  snippet: (v.text || '').replace(/<[^>]+>/g, '').slice(0, 100) + '…',
                  book,
                  chapter: v.chapter,
                  verse: v.verse,
                };
              })
              .filter(Boolean);

            // Merge: deduplicate by id, network results first (they may be more accurate)
            const seenIds = new Set(networkVerses.map(v => v.id));
            const merged = [
              ...networkVerses,
              ...mapped.filter(v => !seenIds.has(v.id)),
            ].slice(0, 12);

            setVerseResults(merged);
            setVerseSource('network');
          })
          .catch(() => {}); // local results already shown — silent fail
      }
      return;
    }

    // ── Step 2: No local results — try network only ──────────────────────────
    if (!navigator.onLine) {
      setVerseResults([]);
      setVerseLoading(false);
      setVerseSource('offline');
      return;
    }

    fetch(`https://bolls.life/search/KJV/${encodeURIComponent(debouncedQ)}/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (cancelled) return;
        const verses = (Array.isArray(data) ? data : [])
          .slice(0, 10)
          .map(v => {
            const book = BOOKS.find(b => b.num === v.book);
            if (!book) return null;
            return {
              type: 'verse-result',
              id: `vs:${v.book}:${v.chapter}:${v.verse}`,
              title: `${v.book_name || book.n} ${v.chapter}:${v.verse}`,
              snippet: (v.text || '').replace(/<[^>]+>/g, '').slice(0, 100) + '…',
              book,
              chapter: v.chapter,
              verse: v.verse,
            };
          })
          .filter(Boolean);
        setVerseResults(verses);
        setVerseSource('network');
      })
      .catch(() => { if (!cancelled) setVerseResults([]); })
      .finally(() => { if (!cancelled) setVerseLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQ]);

  // Reset focus when results change
  useEffect(() => { setFocusedIdx(-1); }, [navResults, verseResults]);

  const allItems = useMemo(() => {
    const items = [];
    navResults.forEach(r => items.push({ type: 'nav', item: r, onActivate: () => onSelect(r) }));
    verseResults.forEach(r => items.push({
      type: 'verse',
      item: r,
      onActivate: () => onSelect({ type: 'book', payload: r.book, chapter: r.chapter }),
    }));
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
      allItems[focusedIdx]?.onActivate();
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

        {/* Index status hint */}
        {!q && (
          <div style={{ padding: '6px 14px 2px', color: 'var(--muted)', fontSize: '11px', fontFamily: 'var(--font-ui)' }}>
            {indexedCount > 0
              ? `${indexedCount} chapters indexed locally · full-text search available offline`
              : 'Read some chapters to enable offline verse search'}
          </div>
        )}

        {!hasResults && q.length > 0 && q.length < 3 && (
          <div style={{ padding: '8px 14px', color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
            Keep typing to search scriptures…
          </div>
        )}

        {navResults.length > 0 && (
          <div className="search-results" role="listbox">
            <div className="search-section-lbl">Books &amp; Navigation</div>
            {navResults.map((r) => {
              const flatIdx = allItems.findIndex(x => x.type === 'nav' && x.item.id === r.id);
              return (
                <div
                  key={r.id}
                  className={`search-result ${focusedIdx === flatIdx ? 'focused' : ''}`}
                  onClick={() => onSelect(r)}
                  role="option"
                  aria-selected={focusedIdx === flatIdx}
                  tabIndex={-1}
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
            <div className="search-section-lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Scripture Search</span>
              {verseLoading && <span style={{ opacity: 0.5, fontSize: '10px' }}>searching…</span>}
              {!verseLoading && verseSource === 'local' && (
                <span style={{ opacity: 0.5, fontSize: '10px', color: 'var(--gold)' }}>● offline</span>
              )}
              {!verseLoading && verseSource === 'network' && (
                <span style={{ opacity: 0.5, fontSize: '10px' }}>● online</span>
              )}
            </div>

            {verseSource === 'offline' && verseResults.length === 0 && (
              <div style={{ padding: '8px 14px', color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
                Offline — read chapters in KJV to enable local search
              </div>
            )}

            {verseResults.length > 0 ? verseResults.map((r) => {
              const flatIdx = allItems.findIndex(x => x.type === 'verse' && x.item.id === r.id);
              return (
                <div
                  key={r.id}
                  className={`search-result ${focusedIdx === flatIdx ? 'focused' : ''}`}
                  onClick={() => onSelect({ type: 'book', payload: r.book, chapter: r.chapter })}
                  role="option"
                  aria-selected={focusedIdx === flatIdx}
                  tabIndex={-1}
                >
                  <div className="search-title" style={{ color: 'var(--gold)' }}>{r.title}</div>
                  <div className="search-snippet">{r.snippet}</div>
                </div>
              );
            }) : !verseLoading && verseSource !== 'offline' && debouncedQ.length >= 3 && (
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
