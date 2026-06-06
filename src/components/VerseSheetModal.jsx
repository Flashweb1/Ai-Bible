import React from 'react';
import { TRANSLATIONS } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';

let bookmarkCounter = Date.now();

export default function VerseSheetModal({ sheetVerse, setSheetVerse, selectedBook, currentChapter, translation, setTab }) {
  const { highlights = {}, toggleHighlight, addBookmark } = useAppContext();
  const vKey = `${selectedBook?.ab || ''}:${currentChapter}:${sheetVerse?.verse}`;
  const curHl = highlights[vKey];

  const handleCopy = async (text, ref) => {
    try {
      await navigator.clipboard.writeText(`"${text}" — ${ref}`);
    } catch {}
    setSheetVerse(null);
  };

  if (!sheetVerse) return null;

  return (
    <>
      <div className="ov" style={{ display: 'block' }} onClick={() => setSheetVerse(null)} role="presentation"></div>
      <div className="vs open" style={{ display: 'block', transform: 'translateX(-50%) translateY(0)' }} role="dialog" aria-modal="true" aria-label={`Verse ${currentChapter}:${sheetVerse.verse}`}>
        <div className="handle"></div>
        <div className="sh-ref">
          {selectedBook?.n || ''} {currentChapter}:{sheetVerse.verse} · {TRANSLATIONS[translation] || 'KJV'}
        </div>
        <div className="sh-txt">{sheetVerse.text}</div>
        <div className="hlrow">
          <span className="hllbl">Highlight</span>
          <div className={`hlsw ${curHl === 'y' ? 'pk' : ''}`} style={{ background: 'rgba(255,215,0,.55)' }} onClick={() => toggleHighlight(vKey, 'y')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleHighlight(vKey, 'y')}></div>
          <div className={`hlsw ${curHl === 'r' ? 'pk' : ''}`} style={{ background: 'rgba(255,80,80,.55)' }} onClick={() => toggleHighlight(vKey, 'r')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleHighlight(vKey, 'r')}></div>
          <div className={`hlsw ${curHl === 'g' ? 'pk' : ''}`} style={{ background: 'rgba(50,200,80,.55)' }} onClick={() => toggleHighlight(vKey, 'g')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleHighlight(vKey, 'g')}></div>
          <div className={`hlsw ${curHl === 'b' ? 'pk' : ''}`} style={{ background: 'rgba(40,140,255,.55)' }} onClick={() => toggleHighlight(vKey, 'b')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleHighlight(vKey, 'b')}></div>
          <div className="hlclr" onClick={() => toggleHighlight(vKey, null)}>✕</div>
        </div>
        <div className="shacts">
          <button className="sact" onClick={() => { bookmarkCounter++; addBookmark({ id: 'bm-' + bookmarkCounter + '-' + Math.random().toString(36).substr(2, 9), bk: selectedBook?.ab || '', bn: selectedBook?.n || '', ch: currentChapter, vn: sheetVerse.verse, text: sheetVerse.text.slice(0, 120), date: new Date().toLocaleDateString() }); setSheetVerse(null); }}>
            <span className="sico">🔖</span>Bookmark
          </button>
          <button className="sact" onClick={() => { localStorage.setItem('sc-scholar-query', `Explain ${selectedBook?.n || ''} ${currentChapter}:${sheetVerse.verse}: "${sheetVerse.text}"`); setTab('scholar'); setSheetVerse(null); }}>
            <span className="sico">✨</span>Scholar
          </button>
          <button className="sact" onClick={() => { localStorage.setItem('sc-note-prefill', JSON.stringify({ title: `Reflection: ${selectedBook?.n || ''} ${currentChapter}:${sheetVerse.verse}`, passage: `${selectedBook?.n || ''} ${currentChapter}:${sheetVerse.verse}`, content: `"${sheetVerse.text}"\n\n` })); setTab('notes'); setSheetVerse(null); }}>
            <span className="sico">📝</span>Note
          </button>
          <button className="sact" onClick={() => handleCopy(sheetVerse.text, `${selectedBook?.n || ''} ${currentChapter}:${sheetVerse.verse}`)}>
            <span className="sico">📋</span>Copy
          </button>
        </div>
      </div>
    </>
  );
}