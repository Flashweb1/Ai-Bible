import React, { useEffect, useRef } from 'react';
import { MENU_LINKS } from '../js/data.js';

export default function Drawer({ isOpen, onClose, setTab, setSelectedBook, setCurrentChapter, openAuth, user, isDark, toggleTheme }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      // simple focus trap: focus drawer
      setTimeout(() => drawerRef.current && drawerRef.current.focus(), 50);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const grouped = MENU_LINKS.reduce((acc, item) => {
    // small heuristic grouping by known ids
    const group = item.group || (['prayer','reading_plans','audio_bible','daily_reading'].some(k => item.id.includes(k)) ? 'Day by Day' : (['bookmarks','notes','favorite'].some(k => item.id.includes(k)) ? 'Personal' : 'More'));
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  function handleClick(item) {
    if (item.id === 'profile') {
      if (!user) { openAuth(); onClose(); return; }
      localStorage.setItem('sc-about-tab', 'profile');
      setTab('about');
    } else if (item.id === 'settings') {
      setTab('settings');
    } else if (item.id === 'bookmarks') {
      setTab('bookmarks');
    } else if (item.id === 'prayer') {
      setTab('pray');
    } else if (item.id === 'day_by_day' || item.id === 'reading_plans') {
      localStorage.setItem('sc-scholar-tab', 'devotionals');
      setTab('scholar');
    } else if (item.id === 'donate' || item.id === 'about' || item.id === 'privacy' || item.id === 'contact') {
      localStorage.setItem('sc-about-tab', item.id);
      setTab('about');
    } else if (item.id === 'audio_bible') {
      setTab('read');
    } else if (item.id === 'notifications') {
      alert("Daily reading notifications are active.");
    } else {
      // fallback: try setting tab by id
      setTab(item.id);
    }
    onClose();
  }

  return (
    <div>
      <div className={`drw-ov open`} onClick={onClose} />
      <aside className={`drw open`} ref={drawerRef} tabIndex={-1} aria-modal="true" role="dialog">
        <div className="drw-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {user ? (
            <div className="user-card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={user.photoURL || '/avatar.png'} alt="avatar" className="user-avatar" style={{ margin: 0 }} />
              <div>
                <div className="user-name" style={{ margin: 0 }}>{user.displayName || user.email}</div>
                <div className="user-sub">Member</div>
              </div>
            </div>
          ) : (
            <div className="user-card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar-placeholder">U</div>
              <button className="btn" onClick={() => { openAuth(); onClose(); }}>Sign in</button>
            </div>
          )}
          <button className="hico" onClick={toggleTheme} title="Toggle Theme" style={{ padding: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {isDark 
                ? <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                : <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>
              }
            </svg>
          </button>
        </div>

        <div className="drw-body">
          {Object.keys(grouped).map((g) => (
            <div key={g} className="drw-group">
              <div className="drw-group-header">{g}</div>
              {grouped[g].map((it) => (
                <button key={it.id} className="drw-it" onClick={() => handleClick(it)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={it.icon} /></svg>
                  <span className="drw-it-label">{it.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
