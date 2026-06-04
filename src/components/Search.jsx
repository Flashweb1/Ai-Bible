import React, { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { BOOKS, MENU_LINKS, DAILY } from '../js/data.js';

export default function Search({ onSelect, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  const corpus = useMemo(() => {
    const bookItems = BOOKS.map(b => ({ type: 'book', id: `book:${b.n}`, title: b.n, payload: b }));
    const menuItems = MENU_LINKS.map(m => ({ type: 'menu', id: `menu:${m.id}`, title: m.label, payload: m }));
    const daily = DAILY.map((d, i) => ({ type: 'daily', id: `daily:${i}`, title: d.ref, snippet: d.text, payload: d }));
    return [...bookItems, ...menuItems, ...daily];
  }, []);

  const fuse = useMemo(() => new Fuse(corpus, { keys: ['title','snippet'], threshold: 0.35 }), [corpus]);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    const r = fuse.search(q, { limit: 12 }).map(x => x.item);
    setResults(r);
  }, [q, fuse]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="search-overlay" onClick={(e) => { if (e.target.className === 'search-overlay') onClose(); }}>
      <div className="search-box">
        <input autoFocus placeholder="Search books, topics or verses" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="search-results">
          {results.map(r => (
            <div key={r.id} className="search-result" onClick={() => onSelect(r)}>
              <div className="search-title">{r.title}</div>
              {r.snippet && <div className="search-snippet">{r.snippet}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
