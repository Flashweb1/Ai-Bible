import React, { useState } from 'react';
import { useAppContext } from '../AppContext.jsx';
import { useToast } from './Toast.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function Pray() {
  usePageTitle('Prayer Journal');
  const showToast = useToast();
  const { prayers = [], setPrayers, streak } = useAppContext();
  const [prayerText, setPrayerText] = useState('');
  const [search, setSearch] = useState('');

  const dots = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toLocaleDateString();
    const hasPrayer = prayers.some(p => {
      if (!p.createdAt) return false;
      const pDate = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      return pDate.toLocaleDateString() === dateStr;
    });
    return { label: date.getDate(), done: hasPrayer, isToday: i === 29 };
  });

  const handleDeletePrayer = (id) => {
    if (!window.confirm('Delete this prayer?')) return;
    setPrayers(prev => prev.filter(p => p.id !== id));
    showToast('Prayer removed');
  };

  const handleAddPrayer = () => {
    if (!prayerText.trim()) return;
    const newPrayer = {
      id: 'pr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      text: prayerText,
      createdAt: new Date().toISOString()
    };
    setPrayers(prev => [newPrayer, ...prev]);
    setPrayerText('');
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return '';
    const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const sharePrayer = (text) => {
    const shareText = `🙏 "${text}"\n\n— from my Bible Prayer Journal`;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => showToast('Copied to clipboard'));
    }
  };

  const filtered = prayers.filter(p =>
    !search || (p.text || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="pray-hero">
        <div className="snum">{streak}🔥</div>
        <div className="slbl2">{streak === 1 ? "Day" : "Days"} Prayer Streak</div>
        <div className="ssub">
          {streak === 0 ? "Begin your daily habit of reflection" : "Faithfulness in daily reflection!"}
        </div>
      </div>

      <div className="pray-form">
        <textarea
          className="pray-inp"
          rows="3"
          placeholder="Write your prayer…"
          value={prayerText}
          onChange={(e) => setPrayerText(e.target.value)}
          onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleAddPrayer(); }}
        />
        <button className="btn btn-prime" onClick={handleAddPrayer} style={{ alignSelf: 'flex-end' }}>
          🙏 Record
        </button>
      </div>

      <div className="p-list">
        <div className="p-list-head">
          <span className="lbl">Prayer Journal</span>
          {prayers.length > 5 && (
            <input
              className="pray-search"
              placeholder="Filter prayers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', opacity: 0.6, padding: '20px', marginBottom: '22px' }}>
            {search ? 'No matching prayers.' : 'No prayers yet. Start your journey above.'}
          </div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="pcard">
              <div className="pctop">
                <span className="pcico">🙏</span>
                <div style={{ flex: 1 }}>
                  <div className="pctxt">"{p.text}"</div>
                  <div className="pcdate">{formatDate(p.createdAt)}</div>
                </div>
              </div>
              <div className="pcacts">
                <button className="pcbtn" onClick={() => sharePrayer(p.text)}>Share</button>
                <button className="pcbtn" onClick={() => handleDeletePrayer(p.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <span className="lbl">Last 30 Days</span>
      <div className="dotgrid">
        {dots.map((d, i) => (
          <div key={i} className={`ddot ${d.done ? 'done' : d.isToday ? 'today' : ''}`}>
            {d.done ? '✓' : d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
