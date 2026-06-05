import React, { useState, useEffect } from 'react';
import { MEMORY_VERSES } from '../js/data.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function Quiz() {
    usePageTitle('Memory Quiz');
    const [view, setView] = useState('menu'); // menu, active, done
    const [index, setIndex] = useState(0);
    const [knownCount, setKnownCount] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [deck, setDeck] = useState([...MEMORY_VERSES].sort(() => Math.random() - 0.5));
    const [confetti, setConfetti] = useState([]);

    const startQuiz = () => {
        setDeck([...MEMORY_VERSES].sort(() => Math.random() - 0.5));
        setIndex(0);
        setKnownCount(0);
        setIsFlipped(false);
        setView('active');
    };

    const handleAnswer = (isKnown) => {
        if (isKnown) setKnownCount(prev => prev + 1);
        
        if (index + 1 < deck.length) {
            setIndex(prev => prev + 1);
            setIsFlipped(false);
        } else {
            setView('done');
        }
    };

    // Spawn falling confetti particles on excellent score
    useEffect(() => {
        if (view === 'done') {
            const pct = (knownCount / deck.length) * 100;
            if (pct >= 70) {
                const colors = ['#C5A059', '#D4AF37', '#800000', '#A30000', '#2E8B57', '#1E90FF'];
                const list = Array.from({ length: 45 }, (_, i) => ({
                    id: i,
                    left: `${Math.random() * 100}%`,
                    delay: `${Math.random() * 3}s`,
                    duration: `${Math.random() * 1.5 + 2}s`,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    width: `${Math.random() * 6 + 4}px`,
                    height: `${Math.random() * 10 + 6}px`
                }));
                setConfetti(list);
            }
        } else {
            setConfetti([]);
        }
    }, [view, knownCount, deck.length]);

    if (view === 'menu') {
        return (
            <div className="fade-in">
                <div className="qhero">
                    <div style={{ fontSize: '42px', marginBottom: '9px' }}>🎯</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '23px', color: '#FFFFFF', marginBottom: '5px' }}>Memory Verse Quiz</div>
                    <div style={{ fontSize: '15px', color: 'rgba(255,255,255,.6)', fontStyle: 'italic' }}>{MEMORY_VERSES.length} key Bible verses</div>
                </div>
                <div className="card" style={{ marginBottom: '15px', padding: '20px' }}>
                    <span className="lbl" style={{ marginBottom: '7px' }}>How it works</span>
                    <div style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: '1.6' }}>
                        See a verse reference, try to recall it, then flip the card to check. Mark each as "Known" or keep studying.
                    </div>
                </div>
                <button 
                    className="btn btn-gold" 
                    style={{ width: '100%', fontSize: '17px', padding: '13px' }} 
                    onClick={startQuiz}
                >
                    ✦ Begin Quiz ✦
                </button>
            </div>
        );
    }

    if (view === 'done') {
        const p = Math.round((knownCount / deck.length) * 100);
        return (
            <div className="fade-in" style={{ position: 'relative' }}>
                {confetti.length > 0 && (
                    <div className="celebration-overlay">
                        {confetti.map(c => (
                            <div 
                                key={c.id} 
                                className="confetti-particle" 
                                style={{
                                    left: c.left,
                                    animationDelay: c.delay,
                                    animationDuration: c.duration,
                                    backgroundColor: c.color,
                                    width: c.width,
                                    height: c.height
                                }}
                            />
                        ))}
                    </div>
                )}
                
                <div className="qhero">
                    <div className="qscore">{knownCount}/{deck.length}</div>
                    <div className="qslbl">Verses Known</div>
                    <div className="pbar"><div className="pfill" style={{ width: `${p}%` }}></div></div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.8)', fontStyle: 'italic' }}>
                        {p === 100 ? "Perfect Faith! 🏆" : p >= 80 ? "Excellent work! ✨" : p >= 50 ? "Good progress! Keep it up." : "Keep studying, seeker."}
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <button className="btn btn-gold" style={{ padding: '13px', fontSize: '16px' }} onClick={startQuiz}>🔄 Try Again</button>
                    <button className="btn btn-ghost" style={{ padding: '11px' }} onClick={() => setView('menu')}>← Back</button>
                </div>
            </div>
        );
    }

    const currentCard = deck[index];
    const prog = ((index) / deck.length) * 100;

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '11px' }}>
                <span className="lbl" style={{ margin: 0 }}>Verse {index + 1} of {deck.length}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', color: 'var(--gold)' }}>{knownCount} known</span>
            </div>
            
            <div className="pbar" style={{ marginBottom: '25px', height: '4px' }}>
                <div className="pfill" style={{ width: `${prog}%`, height: '100%' }}></div>
            </div>

            <div className="cscene" onClick={() => setIsFlipped(!isFlipped)} style={{ height: '240px' }}>
                <div className={`c3d ${isFlipped ? 'flipped' : ''}`} style={{ height: '100%' }}>
                    {/* Front */}
                    <div className="cface" style={{ height: '100%' }}>
                        <div className="cref">{currentCard.ref}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '20px', letterSpacing: '1px' }}>TAP CARD TO FLIP</div>
                    </div>
                    {/* Back */}
                    <div className="cface cback" style={{ height: '100%' }}>
                        <div className="cverse">"{currentCard.text}"</div>
                        <div className="ctag" style={{ marginTop: '12px' }}>{currentCard.ref}</div>
                    </div>
                </div>
            </div>

            <div className="fhint" style={{ marginTop: '8px' }}>
                {isFlipped ? "Did you remember this correctly?" : "Recite the verse in your mind before flipping"}
            </div>

            {isFlipped && (
                <div className="qacts" style={{ marginTop: '20px' }}>
                    <button 
                        className="btn btn-ghost" 
                        style={{ borderColor: 'rgba(255,107,107,0.4)', color: '#ff6b6b' }} 
                        onClick={() => handleAnswer(false)}
                    >
                        Keep Studying
                    </button>
                    <button 
                        className="btn btn-prime" 
                        onClick={() => handleAnswer(true)}
                    >
                        I Know This! ✦
                    </button>
                </div>
            )}
        </div>
    );
}