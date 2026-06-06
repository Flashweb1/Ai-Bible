import React from 'react';
import { DAILY, QUICK_BOOKS, MEMORY_VERSES } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

import { BOOKS } from '../js/data.js';

export default function Home({ selectedBook, currentChapter, setTab, user, onLogout, onLoginClick, setSelectedBook, setCurrentChapter }) {
  usePageTitle('Home');
  
  // Get day of the year to ensure variety if DAILY array > 7
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const verse = DAILY[dayOfYear % DAILY.length];

  const { notes, prayers, streak } = useAppContext();
  const prayersLength = prayers ? prayers.length : 0;
  const notesLength = notes ? notes.length : 0;
  const recentReading = selectedBook ? `${selectedBook.n} ${currentChapter}` : null;
  const continueLabel = recentReading ? `Continue reading ${recentReading}` : 'Start your first reading';

  return (
    <>
      <div className="home-profile-bar">
        {user ? (
          <div className="user-badge">
            {user.photoURL ? (
              <img src={user.photoURL} className="user-avatar" alt="User" />
            ) : (
              <div className="user-avatar-placeholder">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
            )}
            <span className="user-name">{user.displayName || user.email}</span>
            <button className="btn btn-logout" onClick={onLogout}>Logout</button>
          </div>
        ) : (
          <div>
            <button className="btn btn-login-nav" onClick={onLoginClick}>Sign in</button>
          </div>
        )}
      </div>

      <div className="hero">
        <div className="hero-lbl">✦ Verse of the Day ✦</div>
        <div className="hero-txt">"{verse.text}"</div>
        <div className="hero-ref">— {verse.ref}</div>
        <div className="hero-acts">
          <button className="hbtn" type="button" onClick={() => { localStorage.setItem('sc-scholar-query', `Explain the significance of ${verse.ref}: "${verse.text}"`); setTab('scholar'); }}>Explain</button>
          <button className="hbtn" type="button" onClick={() => { localStorage.setItem('sc-scholar-query', `Write a heartfelt prayer based on ${verse.ref}: "${verse.text}"`); setTab('scholar'); }}>Pray It</button>
        </div>
      </div>

      <div className="onboard-card">
        <div className="onboard-head">How to use Scripturai</div>
        <div className="onboard-copy">Read Scripture with audio, ask the Scholar for Bible insights, save notes and prayers, and create AI-guided devotionals.</div>
        <div className="onboard-actions">
          <button type="button" className="hbtn" onClick={() => setTab('read')}>Read Scripture</button>
          <button type="button" className="hbtn" onClick={() => setTab('scholar')}>Ask the Scholar</button>
        </div>
      </div>

      <div className="continue-card">
        <div className="continue-copy">{recentReading ? `Continue where you left off:` : 'Continue your study journey'}</div>
        <button type="button" className="hbtn" onClick={() => setTab('read')}>{continueLabel}</button>
      </div>

      <button className="sbadge" type="button" onClick={() => setTab('pray')} aria-label="Open the prayer journal">
        <div className="sbl">
          <div className="sb-fl">🔥</div>
          <div>
            <div className="sb-num">{streak}</div>
            <div className="sb-lbl">{streak === 1 ? "Day" : "Days"} Streak</div>
          </div>
        </div>
        <div className="sb-cta">
          {streak === 0 ? "Start today →" : streak < 7 ? "Keep it up! →" : "Faithful! →"}
        </div>
      </button>

      <span className="lbl">Quick Access</span>
      <div className="qgrid">
        {QUICK_BOOKS.map((b) => {
          const bookObj = BOOKS.find(x => x.n === b) || BOOKS.find(x => x.ab.toLowerCase() === b.toLowerCase());
          return (
            <button key={b} type="button" className="qitem" onClick={() => {
              if (bookObj && setSelectedBook) setSelectedBook(bookObj);
              if (setCurrentChapter) setCurrentChapter(1);
              setTab('read');
            }} aria-label={`Read ${b}`}>
              <div className="qitem-ico">📖</div>
              <div className="qitem-lbl">{b}</div>
            </button>
          );
        })}
      </div>

      <div className="divider">
        <div className="dl"></div>
        <div className="dg">✦ ✦ ✦</div>
        <div className="dl"></div>
      </div>

      <span className="lbl">Explore</span>

      <button className="feat" type="button" onClick={() => setTab('read')} aria-label="Open Scripture reader">
        <span className="feat-ico">📖</span>
        <div>
          <div className="feat-tit">Read Scripture</div>
          <div className="feat-sub">66 books · 4 translations · audio · highlights</div>
        </div>
      </button>
      <button className="feat" type="button" onClick={() => setTab('scholar')} aria-label="Open the Scholar AI">
        <span className="feat-ico">✨</span>
        <div>
          <div className="feat-tit">The Scholar</div>
          <div className="feat-sub">AI explanations, cross-refs, prayers & devotions</div>
        </div>
      </button>
      <button className="feat" type="button" onClick={() => setTab('pray')} aria-label="Open the prayer journal">
        <span className="feat-ico">🙏</span>
        <div>
          <div className="feat-tit">Prayer Journal</div>
          <div className="feat-sub">{prayersLength} prayer{prayersLength !== 1 ? 's' : ''} · {streak}-day streak</div>
        </div>
      </button>
      <button className="feat" type="button" onClick={() => setTab('quiz')} aria-label="Open the memory verse quiz">
        <span className="feat-ico">🎯</span>
        <div>
          <div className="feat-tit">Memory Verse Quiz</div>
          <div className="feat-sub">Flashcards · {MEMORY_VERSES.length} key verses</div>
        </div>
      </button>
      <button className="feat" type="button" onClick={() => setTab('notes')} aria-label="Open the notes page">
        <span className="feat-ico">📝</span>
        <div>
          <div className="feat-tit">My Notes</div>
          <div className="feat-sub">{notesLength} note{notesLength !== 1 ? 's' : ''} saved</div>
        </div>
      </button>
    </>
  );
}
