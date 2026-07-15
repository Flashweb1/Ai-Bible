import React, { useEffect, useRef } from 'react';
import { MENU_LINKS } from '../js/data.js';
import { navigateTo, ITEM_TO_TAB } from '../js/navigation.js';

const GROUP_ORDER = ['Recently Used', 'Main', 'Library', 'App'];
const RECENT_KEY = 'sc-recent-tabs';

function getRecentTabs() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const TAB_LABELS = { home: 'Home', read: 'Read Bible', scholar: 'AI Scholar', plans: 'Reading Plans', pray: 'Prayer Journal', bookmarks: 'Bookmarks', notes: 'Notes', settings: 'Settings', about: 'About & Help' };

const ICONS = {
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  read: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 4 6 4 4 6v13c2-2 6-2 8 0M12 6.5C14 4 18 4 20 6v13c-2-2-6-2-8 0"/></svg>,
  scholar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
  plans: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pray: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  bookmarks: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  notes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10l4 4V15z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  about: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

export default function Drawer({ isOpen, onClose, setTab, setSelectedBook, setCurrentChapter, openAuth, user, isDark, toggleTheme, currentTab, onLogout, onSearchClick, selectedBook, currentChapter }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      setTimeout(() => drawerRef.current && drawerRef.current.focus(), 50);
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const grouped = MENU_LINKS.reduce((acc, item) => {
    const group = item.group || 'More';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  const recent = getRecentTabs().filter(id => id !== currentTab && TAB_LABELS[id]).slice(0, 3);

  function isActive(itemId) {
    return ITEM_TO_TAB[itemId] === currentTab;
  }

  function handleClick(item) {
    navigateTo(item.id, { user, setTab, setSelectedBook, setCurrentChapter, openAuth, onClose });
  }

  function handleUserClick() {
    if (user) {
      localStorage.setItem('sc-about-tab', 'profile');
      setTab('about');
      onClose();
    } else {
      openAuth();
      onClose();
    }
  }

  return (
    <div>
      <div className="drw-ov open" onClick={onClose} />
      <aside className="drw open" ref={drawerRef} tabIndex={-1} aria-modal="true" role="dialog" aria-label="Navigation menu">
        <div className="drw-hdr">
          <div className="drw-user">
            <button className="user-card" onClick={handleUserClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left' }}>
              {user ? (
                <>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="user-avatar" />
                  ) : (
                    <div className="user-avatar-placeholder">{(user.displayName || user.email || 'U')[0].toUpperCase()}</div>
                  )}
                  <div className="user-info">
                    <div className="user-name">{user.displayName || user.email}</div>
                    <div className="user-sub">View Profile</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="user-avatar-placeholder">U</div>
                  <div className="user-info">
                    <div className="user-name" style={{ color: 'white' }}>Sign In</div>
                    <div className="user-sub">Sync your data</div>
                  </div>
                </>
              )}
            </button>
          </div>
          <button className="drw-close-btn" onClick={onClose} title="Close menu" aria-label="Close navigation menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {selectedBook && (
          <button className="drw-continue" onClick={() => { setTab('read'); onClose(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <div>
              <div className="drw-continue-label">Continue Reading</div>
              <div className="drw-continue-ref">{selectedBook.n} {currentChapter}</div>
            </div>
          </button>
        )}

        <div className="drw-body">
          {onSearchClick && (
            <div className="drw-search">
              <button className="drw-search-btn" onClick={() => { onSearchClick(); onClose(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search Bible, topics or verses…
              </button>
            </div>
          )}

          {recent.length > 0 && (
            <div className="drw-group">
              <div className="drw-group-label">Recent</div>
              {recent.map((id, idx) => (
                <button key={id} className="drw-it drw-recent-it" onClick={() => { setTab(id); onClose(); }} style={{ '--i': idx }}>
                  <span className="drw-it-icon">{ICONS[id]}</span>
                  <span className="drw-it-label">{TAB_LABELS[id]}</span>
                </button>
              ))}
            </div>
          )}

          {GROUP_ORDER.filter(g => g !== 'Recently Used').map((g) => {
            const items = grouped[g];
            if (!items) return null;
            return (
              <div key={g} className="drw-group">
                <div className="drw-group-label">{g}</div>
                {items.map((it, idx) => (
                  <button key={it.id} className={`drw-it ${isActive(it.id) ? 'active' : ''}`} onClick={() => handleClick(it)} style={{ '--i': idx }}>
                    <span className="drw-it-icon">{ICONS[it.id]}</span>
                    <span className="drw-it-label">{it.label}</span>
                  </button>
                ))}
              </div>
            );
          })}

          <div className="drw-footer">
            <button className="drw-theme-btn" onClick={toggleTheme} title="Toggle Theme">
              <span className="drw-it-icon">
                {isDark ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                )}
              </span>
              <span className="drw-it-label">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              <span className="drw-theme-switch">
                <span className={`drw-theme-knob ${isDark ? 'right' : ''}`} />
              </span>
            </button>
            {user && (
              <button className="drw-signout-btn" onClick={onLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
