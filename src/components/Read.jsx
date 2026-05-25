import React, { useState, useEffect } from 'react';
import { getChapter } from '../js/api.js';
import { BOOKS, TRANSLATIONS } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';
import VerseSheetModal from './VerseSheetModal.jsx';

const ArrowLeftIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
);

export default function Read({ setTab, selectedBook, setSelectedBook, currentChapter, setCurrentChapter }) {
  // State mapping from global scriptura.html variables
  const [step, setStep] = useState(selectedBook ? 'verses' : 'book'); // 'book', 'chapter', 'verses'
  const [testament, setTestament] = useState('OT');
  // book and chapter are now props
  const [translation, setTranslation] = useState('kjv');
  const [fontSize, setFontSize] = useState(18);

  // Data loading states
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { highlights, toggleHighlight, addBookmark } = useAppContext();
  const [sheetVerse, setSheetVerse] = useState(null); // Tracks the verse currently opened in the modal

  // TTS State
  const [showAudioDeck, setShowAudioDeck] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVerseIndex, setActiveVerseIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');

  // Load voices on mount
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

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Cancel speech if we switch chapter, book, or translation
  useEffect(() => {
    handleStopSpeech();
  }, [selectedBook, currentChapter, translation]);

  // Fetch verses whenever chapter, book, or translation changes
  useEffect(() => {
    const abortController = new AbortController();
    
    if (step === 'verses' && selectedBook) {
      async function fetchVerses() {
        setLoading(true);
        setError(null);
        try {
          const data = await getChapter(selectedBook.num, currentChapter, translation);
          if (!abortController.signal.aborted) {
            setVerses(data);
          }
        } catch (err) {
          if (!abortController.signal.aborted) {
            setError(err.message);
          }
        } finally {
          if (!abortController.signal.aborted) {
            setLoading(false);
          }
        }
      }
      fetchVerses();
    }
    
    return () => abortController.abort();
  }, [step, selectedBook, currentChapter, translation]);

  const speakVerse = (index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (index < 0 || index >= verses.length) {
      handleStopSpeech();
      return;
    }

    window.speechSynthesis.cancel();

    const verse = verses[index];
    const cleanedText = verse.text.replace(/\[|\]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    utterance.rate = playbackSpeed;

    if (selectedVoice) {
      const voiceObj = voices.find(v => v.name === selectedVoice);
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setActiveVerseIndex(index);
      const verseEl = document.querySelector(`[data-vi="${verse.verse}"]`);
      if (verseEl) {
        verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    utterance.onend = () => {
      if (index + 1 < verses.length) {
        speakVerse(index + 1);
      } else {
        handleStopSpeech();
      }
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis utterance error:', e);
      handleStopSpeech();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlaySpeech = () => {
    if (isPlaying && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      const startIndex = activeVerseIndex >= 0 ? activeVerseIndex : 0;
      speakVerse(startIndex);
    }
  };

  const handlePauseSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setActiveVerseIndex(-1);
  };

  const handlePrevVerse = () => {
    const nextIdx = Math.max(0, activeVerseIndex - 1);
    speakVerse(nextIdx);
  };

  const handleNextVerse = () => {
    const nextIdx = Math.min(verses.length - 1, activeVerseIndex + 1);
    speakVerse(nextIdx);
  };

  const handleVoiceChange = (e) => {
    const vName = e.target.value;
    setSelectedVoice(vName);
    if (isPlaying && activeVerseIndex >= 0) {
      setTimeout(() => speakVerse(activeVerseIndex), 50);
    }
  };

  const handleSpeedChange = (e) => {
    const sp = parseFloat(e.target.value);
    setPlaybackSpeed(sp);
    if (isPlaying && activeVerseIndex >= 0) {
      setTimeout(() => speakVerse(activeVerseIndex), 50);
    }
  };

  // ═══════════════════════════════════════
  // RENDER: BOOK SELECTION
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
          {list.map((b) => (
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
  // RENDER: CHAPTER SELECTION
  // ═══════════════════════════════════════
  if (step === 'chapter') {
    return (
      <>
        <button className="back-btn" onClick={() => setStep('book')}><ArrowLeftIcon /> All Books</button>
        <div className="rhdr">
          <div className="rbook">{selectedBook.n}</div>
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
  // RENDER: VERSES VIEW
  // ═══════════════════════════════════════
  return (
    <>
      <button className="back-btn" onClick={() => { setStep('chapter'); handleStopSpeech(); }}><ArrowLeftIcon /> Chapters</button>
      <div className="rhdr">
        <div className="rbook">{selectedBook.n}</div>
        <div className="rch">Chapter {currentChapter} · {TRANSLATIONS[translation] || 'KJV'}</div>
      </div>
      
      <div className="rtbar">
        <select className="tsel" value={translation} onChange={(e) => setTranslation(e.target.value)}>
          {Object.entries(TRANSLATIONS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        
        <button 
          className={`audibtn ${showAudioDeck ? 'playing' : ''}`} 
          onClick={() => {
            setShowAudioDeck(!showAudioDeck);
            if (showAudioDeck) handleStopSpeech();
          }}
        >
          <span className={`adot ${isPlaying && !isPaused ? 'pulse' : ''}`}></span>
          🔊 Audio
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
          <button className="fsbtn" onClick={() => setFontSize(f => Math.max(14, f - 2))}>A−</button>
          <span className="fsval">{fontSize}</span>
          <button className="fsbtn" onClick={() => setFontSize(f => Math.min(26, f + 2))}>A+</button>
        </div>
      </div>

      <div className="chnav">
        <button className="cnbtn" onClick={() => { setCurrentChapter(c => c - 1); handleStopSpeech(); }} disabled={currentChapter <= 1}>
          <ArrowLeftIcon /> Prev
        </button>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", color: "var(--muted)", letterSpacing: "1px" }}>
          {currentChapter} / {selectedBook.ch}
        </span>
        <button className="cnbtn" onClick={() => { setCurrentChapter(c => c + 1); handleStopSpeech(); }} disabled={currentChapter >= selectedBook.ch}>
          Next <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      {loading && <div className="ldmsg">✦ Loading scripture…</div>}
      {error && <div className="errmsg">{error}</div>}
      
      {!loading && !error && verses.length > 0 && (
        <>
          <div className="vwrap">
            {verses.map((v, idx) => {
              const vKey = `${selectedBook.ab}:${currentChapter}:${v.verse}`;
              const hlColor = highlights[vKey];
              const hlClass = hlColor ? (hlColor === 'y' ? 'hy' : hlColor === 'r' ? 'hr' : hlColor === 'g' ? 'hg' : 'hb') : '';
              const isSpeaking = activeVerseIndex === idx;
              return (
                <div key={v.verse} className={`vrow ${hlClass} ${isSpeaking ? 'speaking' : ''}`} data-vi={v.verse} onClick={() => setSheetVerse(v)}>
                  <span className="vnum">{v.verse}</span>
                  <span className="vtxt" style={{ fontSize: `${fontSize}px` }}>{v.text}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* FLOATING AUDIO DECK OVERLAY */}
      {showAudioDeck && (
        <div className="audiodeck">
          <div className="aud-header">
            <span className="aud-title">
              {selectedBook.n} {currentChapter} — Audio Reader
            </span>
            <button className="aud-btn" onClick={() => { setShowAudioDeck(false); handleStopSpeech(); }} style={{ fontSize: '14px' }}>✕</button>
          </div>
          
          <div className="aud-controls">
            <button className="aud-btn" onClick={handlePrevVerse} disabled={activeVerseIndex <= 0} title="Previous Verse">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="4" x2="5" y2="20"/>
              </svg>
            </button>

            {isPlaying && !isPaused ? (
              <button className="aud-btn play-pause" onClick={handlePauseSpeech} title="Pause">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              </button>
            ) : (
              <button className="aud-btn play-pause" onClick={handlePlaySpeech} title="Play">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            )}

            <button className="aud-btn" onClick={handleNextVerse} disabled={activeVerseIndex >= verses.length - 1} title="Next Verse">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="4" x2="19" y2="20"/>
              </svg>
            </button>
          </div>

          <div className="aud-settings">
            <select className="aud-select" value={selectedVoice} onChange={handleVoiceChange} title="Select Voice">
              {voices.map((v, i) => (
                <option key={i} value={v.name}>{v.name} ({v.lang})</option>
              ))}
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

      {/* VERSE SHEET MODAL */}
      {sheetVerse && (
        <VerseSheetModal 
          sheetVerse={sheetVerse}
          setSheetVerse={setSheetVerse}
          selectedBook={selectedBook}
          currentChapter={currentChapter}
          translation={translation}
          setTab={setTab}
        />
      )}
    </>
  );
}