import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Read from './components/Read';
import Scholar from './components/Scholar';
import Pray from './components/Pray';
import Quiz from './components/Quiz';
import Notes from './components/Notes';
import Bookmarks from './components/Bookmarks';
import AuthModal from './components/AuthModal';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isDark, setIsDark] = useState(localStorage.getItem('sc-dark') === '1');
  const [user, setUser] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-dark', isDark);
    localStorage.setItem('sc-dark', isDark ? '1' : '0');
  }, [isDark]);

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

  const renderTab = () => {
    switch (currentTab) {
      case 'home': return <Home setTab={setCurrentTab} user={user} onLogout={handleLogout} onLoginClick={() => setShowAuthModal(true)} />;
      case 'read': return <Read selectedBook={selectedBook} setSelectedBook={setSelectedBook} currentChapter={currentChapter} setCurrentChapter={setCurrentChapter} setTab={setCurrentTab} />;
      case 'scholar': return <Scholar selectedBook={selectedBook} currentChapter={currentChapter} />;
      case 'pray': return <Pray />;
      case 'quiz': return <Quiz />;
      case 'notes': return <Notes />;
      case 'bookmarks': return <Bookmarks setTab={setCurrentTab} setSelectedBook={setSelectedBook} setCurrentChapter={setCurrentChapter} />;
      default: return <Home setTab={setCurrentTab} user={user} onLogout={handleLogout} onLoginClick={() => setShowAuthModal(true)} />;
    }
  };

  return (
    <div id="app">
      <header className="hdr">
        <button className="hico" onClick={() => setIsDark(!isDark)} id="thmbtn" title="Toggle Theme">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {isDark 
              ? <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              : <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>
            }
          </svg>
        </button>
        <div className="hdr-mid">
          <div className="hdr-logo">SCRIPTURA</div>
          <div className="hdr-sub">The Living Word</div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="hico" onClick={() => setCurrentTab('bookmarks')} title="Bookmarks">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button className="hico" onClick={() => setCurrentTab('notes')} title="Notes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
        </div>
      </header>

      <main className="cnt fade-in" id="cnt">
        {renderTab()}
      </main>

      <nav className="bnav">
        {[
          { id: 'home', label: 'Home', path: <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" /></> },
          { id: 'read', label: 'Read', path: <><path d="M12 6.5C10 4 6 4 4 6v13c2-2 6-2 8 0M12 6.5C14 4 18 4 20 6v13c-2-2-6-2-8 0" /></> },
          { id: 'scholar', label: 'Scholar', path: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></> },
          { id: 'pray', label: 'Pray', path: <><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" /></> },
          { id: 'quiz', label: 'Quiz', path: <><path d="M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></> }
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

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}