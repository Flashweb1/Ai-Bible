import React, { useState } from 'react';
import { useAppContext } from '../AppContext.jsx';
import { BOOKS } from '../js/data.js';

export default function Bookmarks({ setTab, setSelectedBook, setCurrentChapter }) {
  const { bookmarks, deleteBookmark } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookmarks = bookmarks.filter(b => {
    const q = searchQuery.toLowerCase();
    return (
      b.bn?.toLowerCase().includes(q) ||
      b.text?.toLowerCase().includes(q) ||
      `${b.ch}:${b.vn}`.includes(q)
    );
  });

  const handleCopy = (b) => {
    navigator.clipboard.writeText(`"${b.text}" — ${b.bn} ${b.ch}:${b.vn}`);
    alert('Verse copied to clipboard!');
  };

  const handleAskScholar = (b) => {
    // We can pre-fill scholar chat by passing state or setting query params/local storage, 
    // or we can set it in a shared state. Let's write the query to localStorage so Scholar can read it.
    localStorage.setItem('sc-scholar-query', `Explain the significance of ${b.bn} ${b.ch}:${b.vn}: "${b.text}"`);
    setTab('scholar');
  };

  const handleJumpToRead = (b) => {
    // Find the correct book object from the static BOOKS database to prevent a 'Book not found' error
    const bookObj = BOOKS.find(x => x.ab === b.bk || x.n === b.bn);
    if (bookObj) {
      setSelectedBook(bookObj);
    } else {
      // Fallback fallback if not found
      setSelectedBook({ num: 1, n: b.bn, ab: b.bk, ch: 1 });
    }
    setCurrentChapter(b.ch);
    setTab('read');
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span className="lbl" style={{ margin: 0 }}>Saved Scripture ({bookmarks.length})</span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          className="chatinp"
          placeholder="Search saved verses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="empty" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
          <div style={{ fontSize: '48px' }}>🔖</div>
          <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
            {bookmarks.length === 0 ? "Bookmark verses while reading to save them here" : "No matching bookmarks found"}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filteredBookmarks.map(b => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div 
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: 'var(--gold)', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => handleJumpToRead(b)}
                  title="Jump to Chapter"
                >
                  {b.bn} {b.ch}:{b.vn}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.4 }}>{b.date}</div>
              </div>
              
              <div style={{ fontStyle: 'italic', fontSize: '15px', lineHeight: '1.6', color: 'var(--txt)', borderLeft: '2px solid var(--bdr)', paddingLeft: '10px', margin: '4px 0' }}>
                "{b.text}"
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' }}>
                <button className="hbtn" style={{ fontSize: '10px', padding: '4px 10px' }} onClick={() => handleAskScholar(b)}>
                  ✨ Scholar
                </button>
                <button className="hbtn" style={{ fontSize: '10px', padding: '4px 10px' }} onClick={() => handleCopy(b)}>
                  📋 Copy
                </button>
                <button 
                  className="hbtn" 
                  style={{ fontSize: '10px', padding: '4px 10px', borderColor: 'rgba(240, 80, 80, 0.4)', color: '#ff6b6b' }} 
                  onClick={() => deleteBookmark(b.id)}
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
