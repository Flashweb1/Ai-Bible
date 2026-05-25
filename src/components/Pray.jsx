import React, { useState } from 'react';
import { useAppContext } from '../AppContext.jsx';

export default function Pray() {
    const { prayers, setPrayers, streak } = useAppContext();
    const [prayerText, setPrayerText] = useState('');

    // Generate dynamic 30-day dots based on prayer history
    const dots = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i)); // i=0 is 29 days ago, i=29 is today
        const dateStr = date.toLocaleDateString();

        const hasPrayer = prayers.some(p => {
            if (!p.createdAt) return false;
            const pDate = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
            return pDate.toLocaleDateString() === dateStr;
        });

        return {
            label: date.getDate(),
            done: hasPrayer,
            isToday: i === 29
        };
    });

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
        return d.toLocaleDateString(undefined, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    return (
        <div className="fade-in">
            <div className="pray-hero">
                <div className="snum">{streak}🔥</div>
                <div className="slbl2">{streak === 1 ? "Day" : "Days"} Prayer Streak</div>
                <div className="ssub">
                    {streak === 0 ? "Begin your daily habit of reflection" : "Faithfulness in daily reflection!"}
                </div>
            </div>

            <span className="lbl">Last 30 Days</span>
            <div className="dotgrid">
                {dots.map((d, i) => (
                    <div key={i} className={`ddot ${d.done ? "done" : d.isToday ? "today" : ""}`}>
                        {d.done ? "✓" : d.label}
                    </div>
                ))}
            </div>

            <span className="lbl">Add a Prayer</span>
            <div className="pray-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <textarea 
                    className="pray-inp" 
                    rows="3" 
                    placeholder="Write your prayer…" 
                    value={prayerText}
                    onChange={(e) => setPrayerText(e.target.value)}
                    onKeyDown={(e) => { if(e.ctrlKey && e.key === 'Enter') handleAddPrayer(); }}
                />
                <button 
                    className="btn btn-prime" 
                    onClick={handleAddPrayer}
                    style={{ alignSelf: 'flex-end' }}
                >
                    🙏 Record
                </button>
            </div>

            <span className="lbl">Prayer Journal</span>
            <div className="p-list">
                {prayers.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', opacity: 0.6, padding: '20px' }}>
                        No prayers recorded yet. Start your journey today.
                    </div>
                ) : (
                    prayers.map(p => (
                        <div key={p.id} className="card" style={{ marginBottom: '15px', padding: '15px' }}>
                            <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}>
                                {formatDate(p.createdAt)}
                            </div>
                            <div style={{ fontStyle: 'italic', color: 'var(--text)', fontSize: '15px', lineHeight: '1.5' }}>
                                "{p.text}"
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}