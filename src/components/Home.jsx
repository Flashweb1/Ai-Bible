import React from 'react';
import { DAILY, QUICK_BOOKS, MEMORY_VERSES } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

import { BOOKS } from '../js/data.js';

export default function Home({ setTab, user, onLogout, onLoginClick, setSelectedBook, setCurrentChapter }) {
  usePageTitle('Home');
  const verse = DAILY[new Date().getDay() % DAILY.length];
  const { notes, prayers, streak } = useAppContext();
  const prayersLength = prayers ? prayers.length : 0;
  const notesLength = notes ? notes.length : 0;

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
          <button className="hbtn" onClick={() => { localStorage.setItem('sc-scholar-query', `Explain the significance of ${verse.ref}: "${verse.text}"`); setTab('scholar'); }}>Explain</button>
          <button className="hbtn" onClick={() => { localStorage.setItem('sc-scholar-query', `Write a heartfelt prayer based on ${verse.ref}: "${verse.text}"`); setTab('scholar'); }}>Pray It</button>
        </div>
      </div>

      <div className="sbadge" onClick={() => setTab('pray')}>
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
      </div>

      <span className="lbl">Quick Access</span>
      <div className="qgrid">
        {QUICK_BOOKS.map((b) => {
          const bookObj = BOOKS.find(x => x.n === b) || BOOKS.find(x => x.ab.toLowerCase() === b.toLowerCase());
          return (
            <div key={b} className="qitem" onClick={() => {
              if (bookObj && setSelectedBook) setSelectedBook(bookObj);
              if (setCurrentChapter) setCurrentChapter(1);
              setTab('read');
            }}>
              <div className="qitem-ico">📖</div>
              <div className="qitem-lbl">{b}</div>
            </div>
          );
        })}
      </div>

      <div className="divider">
        <div className="dl"></div>
        <div className="dg">✦ ✦ ✦</div>
        <div className="dl"></div>
      </div>

      <span className="lbl">Explore</span>

      <div className="feat" onClick={() => setTab('read')}>
        <span className="feat-ico">📖</span>
        <div>
          <div className="feat-tit">Read Scripture</div>
          <div className="feat-sub">66 books · 4 translations · audio · highlights</div>
        </div>
      </div>
      <div className="feat" onClick={() => setTab('scholar')}>
        <span className="feat-ico">✨</span>
        <div>
          <div className="feat-tit">The Scholar</div>
          <div className="feat-sub">AI explanations, cross-refs, prayers & devotions</div>
        </div>
      </div>
      <div className="feat" onClick={() => setTab('pray')}>
        <span className="feat-ico">🙏</span>
        <div>
          <div className="feat-tit">Prayer Journal</div>
          <div className="feat-sub">{prayersLength} prayer{prayersLength !== 1 ? 's' : ''} · {streak}-day streak</div>
        </div>
      </div>
      <div className="feat" onClick={() => setTab('quiz')}>
        <span className="feat-ico">🎯</span>
        <div>
          <div className="feat-tit">Memory Verse Quiz</div>
          <div className="feat-sub">Flashcards · {MEMORY_VERSES.length} key verses</div>
        </div>
      </div>
      <div className="feat" onClick={() => setTab('notes')}>
        <span className="feat-ico">📝</span>
        <div>
          <div className="feat-tit">My Notes</div>
          <div className="feat-sub">{notesLength} note{notesLength !== 1 ? 's' : ''} saved</div>
        </div>
      </div>
    </>
  );
}
