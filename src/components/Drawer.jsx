import React, { useEffect, useRef } from 'react';
import { MENU_LINKS } from '../js/data.js';
import { navigateTo, ITEM_TO_TAB } from '../js/navigation.js';
import { useToast } from './Toast.jsx';

const GROUP_ORDER = ['Quick Access', 'Personal', 'App'];

export default function Drawer({ isOpen, onClose, setTab, setSelectedBook, setCurrentChapter, openAuth, user, isDark, toggleTheme, currentTab, onLogout }) {
  const showToast = useToast();
  const drawerRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      setTimeout(() => drawerRef.current && drawerRef.current.focus(), 50);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const grouped = MENU_LINKS.reduce((acc, item) => {
    const group = item.group || 'More';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  function isActive(itemId) {
    return ITEM_TO_TAB[itemId] === currentTab;
  }

  function handleClick(item) {
    if (item.id === 'notifications') {
      showToast("Daily reading notifications are active.");
      return;
    }
    navigateTo(item.id, { user, setTab, setSelectedBook, setCurrentChapter, openAuth, onClose });
  }

  return (
    <div>
      <div className="drw-ov open" onClick={onClose} />
      <aside className="drw open" ref={drawerRef} tabIndex={-1} aria-modal="true" role="dialog">
        <div className="drw-hdr">
          <div className="drw-user">
            {user ? (
              <div className="user-card">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">{(user.displayName || user.email || 'U')[0].toUpperCase()}</div>
                )}
                <div className="user-info">
                  <div className="user-name">{user.displayName || user.email}</div>
                  <div className="user-sub">Member</div>
                </div>
                <button className="user-signout" onClick={onLogout} title="Sign out" aria-label="Sign out">✕</button>
              </div>
            ) : (
              <div className="user-card">
                <div className="user-avatar-placeholder">U</div>
                <button className="btn-signin" onClick={() => { openAuth(); onClose(); }}>Sign in</button>
              </div>
            )}
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle theme">
            {isDark ? '🌙' : '☀️'}
          </button>
        </div>

        <div className="drw-body">
          {GROUP_ORDER.map((g) => {
            const items = grouped[g];
            if (!items) return null;
            return (
              <div key={g} className="drw-group">
                <div className="drw-group-label">{g}</div>
                {items.map((it, idx) => (
                  <button
                    key={it.id}
                    className={`drw-it ${isActive(it.id) ? 'active' : ''}`}
                    onClick={() => handleClick(it)}
                    style={{ '--i': idx }}
                  >
                    <span className="drw-it-icon">{it.icon}</span>
                    <span className="drw-it-label">{it.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
