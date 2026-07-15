import React, { useEffect, useState, useMemo } from 'react';
import { DAILY, QUICK_BOOKS, BOOKS, READING_PLANS } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { shareVerse } from '../components/ShareVerse.jsx';
import { useToast } from './Toast.jsx';

export default function Home({ selectedBook, currentChapter, setTab, user, onLoginClick, setSelectedBook, setCurrentChapter }) {
  usePageTitle('Home');
  const showToast = useToast();

  const [showOnboard, setShowOnboard] = useState(() => {
    try { return !localStorage.getItem('sc-seen-onboard'); } catch { return true; }
  });

  useEffect(() => {
    if (showOnboard) {
      try { localStorage.setItem('sc-seen-onboard', '1'); } catch {}
    }
  }, []);

  // Daily verse — rotates by day of year
  const verse = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return DAILY[dayOfYear % DAILY.length];
  }, []);

  const { streak, readingPlans } = useAppContext();

  // Active (not completed) reading plan — show the most recent one
  const activePlan = useMemo(() =>
    (readingPlans || []).find(p => !p.completedAt) || null,
    [readingPlans]
  );

  const activePlanPct = activePlan
    ? Math.round((activePlan.completedDays.length / activePlan.totalDays) * 100)
    : 0;

  const recentReading = selectedBook ? `${selectedBook.n} ${currentChapter}` : null;
  const readingPct = selectedBook
    ? Math.min(100, Math.round((currentChapter / selectedBook.ch) * 100))
    : 0;

  function goToOT() {
    localStorage.setItem('sc-pref-testament', 'OT');
    if (setSelectedBook) setSelectedBook(null);
    setTab('read');
  }

  function goToNT() {
    localStorage.setItem('sc-pref-testament', 'NT');
    if (setSelectedBook) setSelectedBook(null);
    setTab('read');
  }

  function goToBook(bookName) {
    const bookObj = BOOKS.find(x => x.n === bookName);
    if (bookObj && setSelectedBook) setSelectedBook(bookObj);
    if (setCurrentChapter) setCurrentChapter(1);
    setTab('read');
  }

  function explainVerse() {
    localStorage.setItem('sc-scholar-query', `Explain the significance of ${verse.ref}: "${verse.text}"`);
    setTab('scholar');
  }

  function prayVerse() {
    localStorage.setItem('sc-scholar-query', `Write a heartfelt prayer based on ${verse.ref}: "${verse.text}"`);
    setTab('scholar');
  }

  function handleShare() {
    shareVerse({ text: verse.text, ref: verse.ref, translation: 'KJV' }, showToast);
  }

  // Point 6 — rotating motivational sub-message
  const subMessages = [
    'Small steps matter',
    'Stay rooted today',
    'Keep going',
    'You\'re building something eternal',
    'Faith grows daily',
  ];
  const subMsg = subMessages[new Date().getDate() % subMessages.length];

  // Point 2 — time-aware greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 18 ? 'Good afternoon' :
    'Good evening';

  return (
    <div className="home-page">

      {/* ── ONBOARDING (first visit only) ──────────────────────── */}
      {showOnboard && (
        <div className="home-onboard">
          <div className="home-onboard-text">
            <strong>Welcome to Scripturai.</strong> Read Scripture, ask the AI Scholar,
            track prayers, and follow guided reading plans.
          </div>
          <button
            className="home-onboard-dismiss"
            onClick={() => setShowOnboard(false)}
            aria-label="Dismiss welcome message"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── GREETING ───────────────────────────────────────────── */}
      <div className="home-greeting">
        <div className="home-greeting-title">{greeting}</div>
        <div className="home-greeting-sub">{subMsg}</div>
      </div>

      {/* ── 1. VERSE OF THE DAY ────────────────────────────────── */}
      <div className="home-votd">
        <div className="home-votd-label">Verse of the Day</div>
        <blockquote className="home-votd-text">"{verse.text}"</blockquote>
        <div className="home-votd-ref">— {verse.ref}</div>
        <div className="home-votd-actions">
          <button className="home-votd-link" onClick={explainVerse}>Explain</button>
          <span className="home-votd-dot" aria-hidden="true">·</span>
          <button className="home-votd-link" onClick={prayVerse}>Pray It</button>
          <span className="home-votd-dot" aria-hidden="true">·</span>
          <button className="home-votd-link" onClick={() => { localStorage.setItem('sc-note-prefill', JSON.stringify({ title: `Reflection: ${verse.ref}`, passage: verse.ref, content: `"${verse.text}"\n\nReflection:\n` })); setTab('notes'); }}>Reflect</button>
          <span className="home-votd-dot" aria-hidden="true">·</span>
          <button className="home-votd-link" onClick={handleShare}>Share</button>
        </div>
      </div>

      {/* ── 2. CONTINUE READING (only if a book is active) ─────── */}
      {recentReading && (
        <button className="home-continue" onClick={() => setTab('read')} aria-label={`Continue reading ${recentReading}`}>
          <div className="home-continue-left">
            <div className="home-continue-lbl">Continue Reading</div>
            <div className="home-continue-ref">{recentReading}</div>
          </div>
          <div className="home-continue-right">
            <div className="home-continue-track">
              <div className="home-continue-fill" style={{ width: `${readingPct}%` }} />
            </div>
            <div className="home-continue-pct">{readingPct}%</div>
          </div>
        </button>
      )}

      {/* ── 3. ACTIVE PLAN PROGRESS (only if a plan is running) ── */}
      {activePlan && (
        <button className="home-plan-bar" onClick={() => setTab('plans')} aria-label={`${activePlan.title} reading plan`}>
          <span className="home-plan-icon">{activePlan.icon}</span>
          <div className="home-plan-mid">
            <div className="home-plan-name">{activePlan.title}</div>
            <div className="home-plan-track">
              <div className="home-plan-fill" style={{ width: `${activePlanPct}%` }} />
            </div>
          </div>
          <div className="home-plan-day">
            Day {activePlan.completedDays.length + 1}
            <span className="home-plan-total"> / {activePlan.totalDays}</span>
          </div>
        </button>
      )}

      {/* ── 4. OLD & NEW TESTAMENT ─────────────────────────────── */}
      <div className="home-testament-row">
        <button className="home-testament-card home-testament-ot" onClick={goToOT}>
          <div className="home-testament-eyebrow">Old Testament</div>
          <div className="home-testament-title">THE LAW,<br />PROPHETS<br />&amp; WRITINGS</div>
          <div className="home-testament-meta">39 Books · Genesis – Malachi</div>
        </button>
        <button className="home-testament-card home-testament-nt" onClick={goToNT}>
          <div className="home-testament-eyebrow">New Testament</div>
          <div className="home-testament-title">THE GOSPELS<br />&amp; EPISTLES</div>
          <div className="home-testament-meta">27 Books · Matthew – Revelation</div>
        </button>
      </div>

      {/* ── 5. QUICK BOOKS ─────────────────────────────────────── */}
      <div className="home-qbooks">
        {QUICK_BOOKS.map(b => (
          <button key={b} className="home-qbook-chip" onClick={() => goToBook(b)}>
            {b}
          </button>
        ))}
      </div>

      {/* ── 6. FEATURE CHIPS ───────────────────────────────────── */}
      <div className="home-chips">
        {[
          { id: 'scholar', label: '✨ Scholar' },
          { id: 'pray',    label: '🙏 Prayer' },
          { id: 'plans',   label: '📅 Plans' },
          { id: 'quiz',    label: '🎯 Quiz' },
        ].map(f => (
          <button key={f.id} className="home-chip" onClick={() => setTab(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── 7. STREAK ──────────────────────────────────────────── */}
      <button className="home-streak" onClick={() => setTab('pray')} aria-label={`${streak} day prayer streak`}>
        <span className={`home-streak-flame${streak > 0 ? ' home-streak-flame--pulse' : ''}`}>🔥</span>
        <span className="home-streak-count">{streak}</span>
        <span className="home-streak-label">day{streak !== 1 ? 's' : ''} streak</span>
        <span className="home-streak-cta">→ Prayer Journal</span>
      </button>

    </div>
  );
}
