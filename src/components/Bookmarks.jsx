import React, { useState } from 'react';
import { useAppContext } from '../AppContext.jsx';
import { BOOKS } from '../js/data.js';
import { useToast } from './Toast.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function Bookmarks({ setTab, setSelectedBook, setCurrentChapter }) {
  usePageTitle('Bookmarks');
  const showToast = useToast();
  const { bookmarks = [], deleteBookmark } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('book');

  const filteredBookmarks = bookmarks.filter(b => {
    const q = searchQuery.toLowerCase();
    return b.bn?.toLowerCase().includes(q) || b.text?.toLowerCase().includes(q) || `${b.ch}:${b.vn}`.includes(q);
  });

  const sorted = [...filteredBookmarks].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.date || 0) - new Date(a.date || 0);
    }
    const cmp = (a.bn || '').localeCompare(b.bn || '');
    if (cmp !== 0) return cmp;
    return (a.ch || 0) - (b.ch || 0);
  });

  const grouped = {};
  sorted.forEach(b => {
    const key = b.bn || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  });

  const handleCopy = async (b) => {
    try {
      await navigator.clipboard.writeText(`"${b.text}" — ${b.bn} ${b.ch}:${b.vn}`);
      showToast('Verse copied to clipboard!');
    } catch { showToast('Could not copy - clipboard access denied'); }
  };

  const handleAskScholar = (b) => {
    localStorage.setItem('sc-scholar-query', `Explain the significance of ${b.bn} ${b.ch}:${b.vn}: "${b.text}"`);
    setTab('scholar');
  };

  const handleJumpToRead = (b) => {
    const bookObj = BOOKS.find(x => x.ab === b.bk || x.n === b.bn);
    if (bookObj) setSelectedBook(bookObj);
    else setSelectedBook({ num: 1, n: b.bn, ab: b.bk, ch: 1 });
    setCurrentChapter(b.ch);
    setTab('read');
  };

  return (
    <div className="fade-in">
      <div className="bm-head">
        <span className="lbl" style={{ margin: 0 }}>Saved Scripture ({bookmarks.length})</span>
        <div className="bm-sort">
          <button className={`bm-sort-btn ${sortBy === 'book' ? 'on' : ''}`} onClick={() => setSortBy('book')}>By Book</button>
          <button className={`bm-sort-btn ${sortBy === 'recent' ? 'on' : ''}`} onClick={() => setSortBy('recent')}>Recent</button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input type="text" className="bm-search" placeholder="Search saved verses..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="empty" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
          <div style={{ fontSize: '48px' }}>🔖</div>
          <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
            {bookmarks.length === 0 ? "Bookmark verses while reading to save them here" : "No matching bookmarks found"}
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([book, items]) => (
          <div key={book} className="bm-group">
            <div className="bm-group-label">{book} ({items.length})</div>
            {items.map(b => (
              <div key={b.id} className="bm-card">
                <div className="bm-card-top">
                  <div className="bm-ref" onClick={() => handleJumpToRead(b)} title="Jump to Chapter">
                    {b.bn} {b.ch}:{b.vn}
                  </div>
                  <div className="bm-date">{b.date}</div>
                </div>
                <div className="bm-text">"{b.text}"</div>
                <div className="bm-acts">
                  <button className="bm-btn" onClick={() => handleAskScholar(b)}>✨ Scholar</button>
                  <button className="bm-btn" onClick={() => handleCopy(b)}>📋 Copy</button>
                  <button className="bm-btn bm-btn-del" onClick={() => { if (window.confirm('Remove this bookmark?')) deleteBookmark(b.id); }}>✕ Remove</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
