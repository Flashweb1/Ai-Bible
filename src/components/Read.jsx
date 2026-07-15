import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getChapter } from '../js/api.js';
import { BOOKS, TRANSLATIONS } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';
import { loadPreferences, savePreferences } from '../js/preferences.js';
import { ChapterSkeleton } from './Skeleton.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { shareVerse } from '../lib/shareImage.js';

export default function Read({ setTab, selectedBook, setSelectedBook, currentChapter, setCurrentChapter }) {
  usePageTitle(selectedBook ? `${selectedBook.n} ${currentChapter}` : 'Read');

  const [step, setStep] = useState(selectedBook ? 'verses' : 'book');
  const [testament, setTestament] = useState(() => {
    const saved = localStorage.getItem('sc-pref-testament');
    localStorage.removeItem('sc-pref-testament');
    return saved === 'NT' ? 'NT' : 'OT';
  });
  const [translation, setTranslation] = useState(() => {
    const prefs = loadPreferences();
    const saved = prefs?.defaultTranslation;
    return saved && TRANSLATIONS[saved] ? saved : 'kjv';
  });
  const [fontSize, setFontSize] = useState(18);

  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const { highlights, toggleHighlight, addBookmark } = useAppContext();

  const [selectedVerses, setSelectedVerses] = useState([]);
  const [focusMode, setFocusMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const verseRefs = useRef({});
  const cntRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // TTS
  const [showAudioDeck, setShowAudioDeck] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVerseIndex, setActiveVerseIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackSpeedRef = useRef(1);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const selectedVoiceRef = useRef('');

  const selCount = selectedVerses.length;
  const isSelecting = selCount > 0;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      const enVoice = allVoices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                      allVoices.find(v => v.lang.startsWith('en')) ||
                      allVoices[0];
      if (enVoice) setSelectedVoice(enVoice.name);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    const prefs = loadPreferences() || {};
    savePreferences({ ...prefs, defaultTranslation: translation });
  }, [translation]);

  useEffect(() => {
    const prefs = loadPreferences();
    const visible = prefs?.visibleTranslations;
    if (Array.isArray(visible) && !visible.includes(translation)) {
      const first = visible.find(k => TRANSLATIONS[k]) || 'kjv';
      setTranslation(first);
    }
  }, []);

  useEffect(() => { handleStopSpeech(); }, [selectedBook, currentChapter, translation]);

  useEffect(() => {
    const abortController = new AbortController();
    if (step === 'verses' && selectedBook) {
      const fetchVerses = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await getChapter(selectedBook.num, currentChapter, translation);
          if (!abortController.signal.aborted) {
            setVerses(data.verses);
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            let errorMsg = err.message || "Failed to load chapter";
            if (errorMsg.startsWith('offline:')) errorMsg = errorMsg.slice('offline:'.length);
            else if (errorMsg.includes("Could not load chapter")) errorMsg = "Unable to reach Bible data. Check your internet connection or try again in a moment.";
            else if (errorMsg.includes("Book not found")) errorMsg = "This book is not available in the current translation.";
            else if (errorMsg.includes("Failed to fetch")) errorMsg = "Network error: cannot reach the Bible API. Check your connection.";
            setError(errorMsg);
          }
        } finally {
          if (!abortController.signal.aborted) setLoading(false);
        }
      };
      fetchVerses();
    }
    return () => abortController.abort();
  }, [step, selectedBook, currentChapter, translation]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onOnline = () => setIsOffline(false);
      const onOffline = () => setIsOffline(true);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
    }
  }, []);

  // Scroll progress via IntersectionObserver
  useEffect(() => {
    if (!verses.length) return;
    const observer = new IntersectionObserver((entries) => {
      let maxVisible = 0;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const vn = parseInt(entry.target.dataset.vi, 10);
          if (vn > maxVisible) maxVisible = vn;
        }
      });
      if (maxVisible > 0) setScrollProgress(Math.round((maxVisible / verses.length) * 100));
    }, { threshold: 0.3 });

    const refs = verseRefs.current;
    Object.values(refs).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [verses]);

  // Escape key clears selection
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedVerses([]); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Keyboard chapter nav
  useEffect(() => {
    if (step !== 'verses') return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' && currentChapter > 1) { e.preventDefault(); setCurrentChapter(c => c - 1); handleStopSpeech(); }
      if (e.key === 'ArrowRight' && currentChapter < (selectedBook?.ch || 0)) { e.preventDefault(); setCurrentChapter(c => c + 1); handleStopSpeech(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, currentChapter, selectedBook?.ch]);

  // Close audio deck when selecting
  useEffect(() => {
    if (isSelecting && showAudioDeck) {
      handleStopSpeech();
      setShowAudioDeck(false);
    }
  }, [isSelecting]);

  // ─── Verse interaction ─────────────────────────────

  const handleVerseClick = (v) => {
    if (focusMode) {
      setFocusMode(false);
      return;
    }
    if (isSelecting) {
      setSelectedVerses(prev => {
        const exists = prev.find(s => s.verse === v.verse);
        return exists ? prev.filter(s => s.verse !== v.verse) : [...prev, v];
      });
    } else {
      setSelectedVerses([v]);
    }
  };

  // ─── Selection actions ─────────────────────────────

  const getSorted = useCallback(() => [...selectedVerses].sort((a, b) => a.verse - b.verse), [selectedVerses]);

  const getRangeStr = (arr) => {
    if (arr.length <= 1) return `${arr[0]?.verse}`;
    const nums = arr.map(v => v.verse);
    const isConsecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
    if (isConsecutive) return `${nums[0]}-${nums[nums.length - 1]}`;
    return nums.join(', ');
  };

  const getCopyText = () => {
    const sorted = getSorted();
    const text = sorted.map(v => v.text).join(' ');
    const range = getRangeStr(sorted);
    return `"${text}" — ${selectedBook.n} ${currentChapter}:${range} (${TRANSLATIONS[translation] || 'KJV'})`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCopyText());
    } catch { /* ignore */ }
    setSelectedVerses([]);
  };

  const handleShare = async () => {
    const sorted = getSorted();
    const text = sorted.map(v => v.text).join(' ');
    const range = getRangeStr(sorted);
    await shareVerse({ text, ref: `${selectedBook.n} ${currentChapter}:${range}` });
    setSelectedVerses([]);
  };

  const handleHighlight = (color) => {
    const sorted = getSorted();
    sorted.forEach(v => {
      const vKey = `${selectedBook.ab}:${currentChapter}:${v.verse}`;
      toggleHighlight(vKey, color);
    });
    setSelectedVerses([]);
  };

  const handleBookmark = () => {
    const sorted = getSorted();
    sorted.forEach(v => {
      addBookmark({
        id: 'bm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        bk: selectedBook?.ab || '',
        bn: selectedBook?.n || '',
        ch: currentChapter,
        vn: v.verse,
        text: v.text.slice(0, 120),
        date: new Date().toLocaleDateString()
      });
    });
    setSelectedVerses([]);
  };

  const handleNote = () => {
    const sorted = getSorted();
    const text = sorted.map(v => v.text).join(' ');
    const range = getRangeStr(sorted);
    const passage = `${selectedBook.n} ${currentChapter}:${range}`;
    localStorage.setItem('sc-note-prefill', JSON.stringify({
      title: `Reflection: ${passage}`,
      passage,
      content: `"${text}"\n\n`
    }));
    setTab('notes');
    setSelectedVerses([]);
  };

  const handleScholar = () => {
    const sorted = getSorted();
    const text = sorted.map(v => v.text).join(' ');
    const range = getRangeStr(sorted);
    localStorage.setItem('sc-scholar-query', `Explain ${selectedBook.n} ${currentChapter}:${range}: "${text}"`);
    setTab('scholar');
    setSelectedVerses([]);
  };

  const clearSelection = () => setSelectedVerses([]);

  // ─── TTS ───────────────────────────────────────────

  const speakVerse = (index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (index < 0 || index >= verses.length) { handleStopSpeech(); return; }
    window.speechSynthesis.cancel();
    const verse = verses[index];
    const cleanedText = (verse.text || '').replace(/\[|\]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = playbackSpeedRef.current;
    const voiceName = selectedVoiceRef.current;
    if (voiceName) { const voiceObj = voices.find(v => v.name === voiceName); if (voiceObj) utterance.voice = voiceObj; }
    utterance.onstart = () => {
      setIsPlaying(true); setIsPaused(false); setActiveVerseIndex(index);
      const el = document.querySelector(`[data-vi="${verse.verse}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    utterance.onend = () => { if (index + 1 < verses.length) speakVerse(index + 1); else handleStopSpeech(); };
    utterance.onerror = () => handleStopSpeech();
    window.speechSynthesis.speak(utterance);
  };

  const handlePlaySpeech = () => {
    if (isPlaying && isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else { const startIndex = activeVerseIndex >= 0 ? activeVerseIndex : 0; speakVerse(startIndex); }
  };
  const handlePauseSpeech = () => { if (window.speechSynthesis) { window.speechSynthesis.pause(); setIsPaused(true); } };
  const handleStopSpeech = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); setIsPlaying(false); setIsPaused(false); setActiveVerseIndex(-1); };
  const handlePrevVerse = () => { const nextIdx = Math.max(0, activeVerseIndex - 1); speakVerse(nextIdx); };
  const handleNextVerse = () => { const nextIdx = Math.min(verses.length - 1, activeVerseIndex + 1); speakVerse(nextIdx); };
  const handleVoiceChange = (e) => { const vName = e.target.value; selectedVoiceRef.current = vName; setSelectedVoice(vName); if (isPlaying && activeVerseIndex >= 0) speakVerse(activeVerseIndex); };
  const handleSpeedChange = (e) => { const sp = parseFloat(e.target.value); playbackSpeedRef.current = sp; setPlaybackSpeed(sp); if (isPlaying && activeVerseIndex >= 0) speakVerse(activeVerseIndex); };

  // ─── Touch swipe for chapter nav ───────────────────

  const handleTouchStart = (e) => { if (isSelecting) return; touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; isSwiping.current = false; };
  const handleTouchEnd = (e) => {
    if (isSelecting) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 50 && dy < Math.abs(dx) * 0.6) {
      if (dx > 0 && currentChapter > 1) { setCurrentChapter(c => c - 1); handleStopSpeech(); }
      else if (dx < 0 && currentChapter < selectedBook.ch) { setCurrentChapter(c => c + 1); handleStopSpeech(); }
    }
  };

  // ─── Red letter rendering ──────────────────────────

  const renderText = (text) => {
    const parts = text.split(/(\[.*?\])/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      part.startsWith('[') && part.endsWith(']')
        ? <span key={i} className="rl">{part}</span>
        : part
    );
  };

  // ═══════════════════════════════════════
  // BOOK SELECTION
  // ═══════════════════════════════════════
  if (step === 'book') {
    const list = BOOKS.filter(b => b.t === testament);
    return (
      <>
        <div className="ttog">
          <button className={`tbtn ${testament === 'OT' ? 'on' : ''}`} onClick={() => setTestament('OT')}>Old Testament</button>
          <button className={`tbtn ${testament === 'NT' ? 'on' : ''}`} onClick={() => setTestament('NT')}>New Testament</button>
        </div>
        <div className="bkgrid">
          {list.map(b => (
            <button key={b.num} className="bkbtn" onClick={() => { setSelectedBook(b); setStep('chapter'); }}>
              <span>{b.n}</span>
              <span className="bkchs">{b.ch}ch</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════
  // CHAPTER SELECTION
  // ═══════════════════════════════════════
  if (step === 'chapter') {
    return (
      <>
        <button className="back-btn" onClick={() => setStep('book')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> All Books</button>
        <div className="rhdr">
          <button className="rbook-link" onClick={() => { setStep('book'); handleStopSpeech(); }}>{selectedBook.n}</button>
          <div className="rch">Select a Chapter</div>
        </div>
        <div className="chgrid">
          {Array.from({ length: selectedBook.ch }, (_, i) => i + 1).map(n => (
            <button key={n} className="chbtn" onClick={() => { setCurrentChapter(n); setStep('verses'); }}>{n}</button>
          ))}
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════
  // VERSES VIEW
  // ═══════════════════════════════════════
  return (
    <div ref={cntRef} className={`read-wrap ${focusMode ? 'focus' : ''}`}>
      <button className="back-btn" onClick={() => { setStep('chapter'); handleStopSpeech(); }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Chapters
      </button>

      <div className="rhdr">
        <div className="rbook">{selectedBook.n}</div>
        <div className="rch">Chapter {currentChapter} · {TRANSLATIONS[translation] || 'KJV'}</div>
      </div>

      <div className="chapter-meta">
        {isOffline && <span className="status-pill">Offline mode</span>}
      </div>

      <div className="rtbar">
        <select className="tsel" value={translation} onChange={e => setTranslation(e.target.value)}>
          {Object.entries(TRANSLATIONS).filter(([k]) => {
            const prefs = loadPreferences();
            const visible = prefs?.visibleTranslations;
            return !visible || visible.includes(k);
          }).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <button className="audibtn" onClick={() => { setShowAudioDeck(!showAudioDeck); if (showAudioDeck) handleStopSpeech(); }}>
          <span className={`adot ${isPlaying && !isPaused ? 'pulse' : ''}`}></span> 🔊 Audio
        </button>

        <button className={`focusbtn ${focusMode ? 'on' : ''}`} onClick={() => setFocusMode(!focusMode)} title="Focus mode">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
          </svg> Focus
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
          <button className="fsbtn" onClick={() => setFontSize(f => Math.max(14, f - 2))}>A−</button>
          <span className="fsval">{fontSize}</span>
          <button className="fsbtn" onClick={() => setFontSize(f => Math.min(26, f + 2))}>A+</button>
        </div>
      </div>

      <div className="chnav">
        <button className="cnbtn" onClick={() => { setCurrentChapter(c => c - 1); handleStopSpeech(); }} disabled={currentChapter <= 1}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Prev
        </button>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", color: "var(--muted)", letterSpacing: "1px" }}>
          {currentChapter} / {selectedBook.ch}
        </span>
        <button className="cnbtn" onClick={() => { setCurrentChapter(c => c + 1); handleStopSpeech(); }} disabled={currentChapter >= selectedBook.ch}>
          Next <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <div className="prog-bar"><div className="prog-fill" style={{ width: `${scrollProgress}%` }}></div></div>

      {loading && <ChapterSkeleton />}
      {error && <div className="errmsg">{error}</div>}

      {!loading && !error && verses.length > 0 && (
        <div
          className="vwrap"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {verses.map((v, idx) => {
            const vKey = `${selectedBook.ab}:${currentChapter}:${v.verse}`;
            const hlColor = highlights[vKey];
            const hlClass = hlColor ? (hlColor === 'y' ? 'hy' : hlColor === 'r' ? 'hr' : hlColor === 'g' ? 'hg' : 'hb') : '';
            const isSpeaking = activeVerseIndex === idx;
            const isSelected = selectedVerses.some(s => s.verse === v.verse);

            return (
              <div
                key={v.verse}
                ref={el => verseRefs.current[v.verse] = el}
                className={`vrow ${hlClass} ${isSpeaking ? 'speaking' : ''} ${isSelected ? 'selected' : ''}`}
                data-vi={v.verse}
                onClick={() => handleVerseClick(v)}
              >
                <span className={`vnum ${isSelected ? 'sel' : ''}`}>{v.verse}</span>
                <span className="vtxt" style={{ fontSize: `${fontSize}px` }}>{renderText(v.text)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING SELECTION ACTION BAR */}
      {isSelecting && (
        <div className="selbar">
          <div className="selbar-top">
            {selCount === 1 ? (
              <span className="selbar-text">"{selectedVerses[0].text.slice(0, 90)}{selectedVerses[0].text.length > 90 ? '…' : ''}"</span>
            ) : (
              <span className="selbar-count">{selCount} verses selected</span>
            )}
            <button className="selbar-close" onClick={clearSelection} aria-label="Clear selection">✕</button>
          </div>

          {selCount === 1 && (
            <div className="selbar-actions">
              <button className="sel-btn" onClick={handleCopy} title="Copy">📋 Copy</button>
              <button className="sel-btn" onClick={handleShare} title="Share">📤 Share</button>
              <div className="sel-hl-picker">
                <span className="sel-hl-lbl">▣</span>
                <span className="sel-hl-dot hi-y" onClick={() => handleHighlight('y')}></span>
                <span className="sel-hl-dot hi-r" onClick={() => handleHighlight('r')}></span>
                <span className="sel-hl-dot hi-g" onClick={() => handleHighlight('g')}></span>
                <span className="sel-hl-dot hi-b" onClick={() => handleHighlight('b')}></span>
              </div>
              <button className="sel-btn" onClick={handleBookmark} title="Bookmark">🔖 Bmk</button>
              <button className="sel-btn" onClick={handleNote} title="Note">📝 Note</button>
              <button className="sel-btn" onClick={handleScholar} title="Scholar">✨ AI</button>
            </div>
          )}

          {selCount > 1 && (
            <div className="selbar-actions">
              <button className="sel-btn" onClick={handleCopy} title="Copy all">📋 Copy All</button>
              <button className="sel-btn" onClick={handleShare} title="Share all">📤 Share All</button>
              <div className="sel-hl-picker">
                <span className="sel-hl-lbl">▣</span>
                <span className="sel-hl-dot hi-y" onClick={() => handleHighlight('y')}></span>
                <span className="sel-hl-dot hi-r" onClick={() => handleHighlight('r')}></span>
                <span className="sel-hl-dot hi-g" onClick={() => handleHighlight('g')}></span>
                <span className="sel-hl-dot hi-b" onClick={() => handleHighlight('b')}></span>
              </div>
              <button className="sel-btn sel-btn-done" onClick={clearSelection}>Done</button>
            </div>
          )}
        </div>
      )}

      {isSelecting && <div className="sel-overlay" onClick={clearSelection}></div>}

      {/* FLOATING AUDIO DECK */}
      {showAudioDeck && (
        <div className="audiodeck">
          <div className="aud-header">
            <span className="aud-title">{selectedBook.n} {currentChapter} — Audio Reader</span>
            <button className="aud-btn" onClick={() => { setShowAudioDeck(false); handleStopSpeech(); }} style={{ fontSize: '14px' }}>✕</button>
          </div>
          <div className="aud-controls">
            <button className="aud-btn" onClick={handlePrevVerse} disabled={activeVerseIndex <= 0} title="Previous Verse">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="4" x2="5" y2="20"/></svg>
            </button>
            {isPlaying && !isPaused ? (
              <button className="aud-btn play-pause" onClick={handlePauseSpeech} title="Pause">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </button>
            ) : (
              <button className="aud-btn play-pause" onClick={handlePlaySpeech} title="Play">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            )}
            <button className="aud-btn" onClick={handleNextVerse} disabled={activeVerseIndex >= verses.length - 1} title="Next Verse">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="4" x2="19" y2="20"/></svg>
            </button>
          </div>
          <div className="aud-settings">
            <select className="aud-select" value={selectedVoice} onChange={handleVoiceChange} title="Select Voice">
              {voices.map((v, i) => <option key={i} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
            <div className="aud-speed">
              <span>Speed:</span>
              <select className="aud-speed-select" value={playbackSpeed} onChange={handleSpeedChange}>
                <option value="0.75">0.75x</option>
                <option value="1">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
