import React, { useState, useEffect, lazy, Suspense } from 'react';
const Home = lazy(() => import('./components/Home'));
const Read = lazy(() => import('./components/Read'));
const Scholar = lazy(() => import('./components/Scholar'));
const Pray = lazy(() => import('./components/Pray'));
const Quiz = lazy(() => import('./components/Quiz'));
const Notes = lazy(() => import('./components/Notes'));
const Bookmarks = lazy(() => import('./components/Bookmarks'));
const Settings = lazy(() => import('./components/Settings'));
const Drawer = lazy(() => import('./components/Drawer'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const About = lazy(() => import('./components/About'));
const Search = lazy(() => import('./components/Search'));
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { loadPreferences, savePreferences, applyPreferences } from './js/preferences.js';

const DEFAULT_PREFERENCES = {
  theme: 'light',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  fontScale: 1,
  accent: 'hsl(348 70% 45%)',
  accentCompl: 'hsl(168 70% 45%)',
};

function getSavedBook() {
  try {
    const raw = localStorage.getItem('sc-selected-book');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSavedChapter() {
  const raw = localStorage.getItem('sc-current-chapter');
  const value = parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isDark, setIsDark] = useState(() => {
    const prefs = loadPreferences();
    if (prefs && prefs.theme) {
      return prefs.theme === 'dark';
    }
    return localStorage.getItem('sc-dark') === '1';
  });
  const [user, setUser] = useState(null);
  const [selectedBook, setSelectedBook] = useState(() => getSavedBook());
  const [currentChapter, setCurrentChapter] = useState(() => getSavedChapter());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load and apply all user preferences on initial mount
  useEffect(() => {
    const prefs = loadPreferences() || DEFAULT_PREFERENCES;
    applyPreferences(prefs);
  }, []);

  // Update theme setting in preferences and apply when isDark toggled
  useEffect(() => {
    const currentPrefs = loadPreferences() || DEFAULT_PREFERENCES;
    const nextPrefs = { ...currentPrefs, theme: isDark ? 'dark' : 'light' };
    savePreferences(nextPrefs);
    applyPreferences(nextPrefs);
    localStorage.setItem('sc-dark', isDark ? '1' : '0');
  }, [isDark]);

  useEffect(() => {
    if (selectedBook) {
      localStorage.setItem('sc-selected-book', JSON.stringify(selectedBook));
    } else {
      localStorage.removeItem('sc-selected-book');
    }
  }, [selectedBook]);

  useEffect(() => {
    localStorage.setItem('sc-current-chapter', String(currentChapter));
  }, [currentChapter]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSearchSelect = (item) => {
    setIsSearchOpen(false);
    if (item.type === 'book') {
      setSelectedBook(item.payload);
      setCurrentChapter(1);
      setCurrentTab('read');
    } else if (item.type === 'menu') {
      if (item.payload.id === 'profile') {
        if (!user) { setShowAuthModal(true); return; }
        localStorage.setItem('sc-about-tab', 'profile');
        setCurrentTab('about');
      } else if (item.payload.id === 'settings') {
        setCurrentTab('settings');
      } else if (item.payload.id === 'bookmarks') {
        setCurrentTab('bookmarks');
      } else if (item.payload.id === 'prayer') {
        setCurrentTab('pray');
      } else if (item.payload.id === 'day_by_day' || item.payload.id === 'reading_plans') {
        localStorage.setItem('sc-scholar-tab', 'devotionals');
        setCurrentTab('scholar');
      } else if (['donate', 'about', 'privacy', 'contact'].includes(item.payload.id)) {
        localStorage.setItem('sc-about-tab', item.payload.id);
        setCurrentTab('about');
      } else if (item.payload.id === 'audio_bible') {
        setCurrentTab('read');
      } else {
        setCurrentTab(item.payload.id);
      }
    } else if (item.type === 'daily') {
      localStorage.setItem('sc-scholar-query', `Explain the significance of ${item.payload.ref}: "${item.payload.text}"`);
      setCurrentTab('scholar');
    }
  };

  const renderTab = () => {
    switch (currentTab) {
      case 'home': return <Home setTab={setCurrentTab} user={user} onLogout={handleLogout} onLoginClick={() => setShowAuthModal(true)} setSelectedBook={setSelectedBook} setCurrentChapter={setCurrentChapter} />;
      case 'read': return <Read selectedBook={selectedBook} setSelectedBook={setSelectedBook} currentChapter={currentChapter} setCurrentChapter={setCurrentChapter} setTab={setCurrentTab} />;
      case 'scholar': return <Scholar selectedBook={selectedBook} currentChapter={currentChapter} />;
      case 'pray': return <Pray />;
      case 'quiz': return <Quiz />;
      case 'notes': return <Notes />;
      case 'bookmarks': return <Bookmarks setTab={setCurrentTab} setSelectedBook={setSelectedBook} setCurrentChapter={setCurrentChapter} />;
      case 'settings': return <Settings isDark={isDark} setIsDark={setIsDark} setTab={setCurrentTab} />;
      case 'about': return <About user={user} setTab={setCurrentTab} />;
      default: return <Home setTab={setCurrentTab} user={user} onLogout={handleLogout} onLoginClick={() => setShowAuthModal(true)} />;
    }
  };

  return (
    <div id="app">
      <header className="hdr">
        <button className="hico" onClick={() => setIsDrawerOpen(true)} title="Open Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="hdr-mid">
          <div className="hdr-logo">SCRIPTURA</div>
          <div className="hdr-sub">The Living Word</div>
        </div>
        <button className="hico" onClick={() => setIsSearchOpen(true)} title="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </header>

      <Suspense>
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          setTab={setCurrentTab}
          setSelectedBook={setSelectedBook}
          setCurrentChapter={setCurrentChapter}
          openAuth={() => setShowAuthModal(true)}
          user={user}
          isDark={isDark}
          toggleTheme={() => setIsDark(!isDark)}
        />
      </Suspense>

      <main className="cnt fade-in" id="cnt">
        <Suspense fallback={<div className="ldmsg">Loading...</div>}>
          {renderTab()}
        </Suspense>
      </main>

      <nav className="bnav">
        {[
          { id: 'home', label: 'Home', path: <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></> },
          { id: 'read', label: 'Read', path: <><path d="M12 6.5C10 4 6 4 4 6v13c2-2 6-2 8 0M12 6.5C14 4 18 4 20 6v13c-2-2-6-2-8 0" /></> },
          { id: 'scholar', label: 'Scholar', path: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></> },
          { id: 'notes', label: 'Notes', path: <><path d="M21 15V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10l4 4V15z" /></> }
        ].map((navItem) => (
          <button
            key={navItem.id}
            className={`nb ${currentTab === navItem.id ? 'on' : ''}`}
            onClick={() => setCurrentTab(navItem.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{navItem.path}</svg>
            {navItem.label}
          </button>
        ))}
      </nav>

      {showAuthModal && (
        <Suspense fallback={<div className="mbg open"><div className="modal">Loading...</div></div>}>
          <AuthModal onClose={() => setShowAuthModal(false)} />
        </Suspense>
      )}

      {isSearchOpen && (
        <Suspense fallback={<div className="ov"><div className="ldmsg">Loading search...</div></div>}>
          <Search onSelect={handleSearchSelect} onClose={() => setIsSearchOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}