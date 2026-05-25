import React, { useState, useEffect, useRef } from 'react';
import { askAIStream } from '../js/api.js';
import { SUGGESTIONS } from '../js/data.js';
import { useAppContext } from '../AppContext.jsx';

function renderMsg(text) {
  return text
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// Custom Regex parser for structure: DAY X: title, VERSE: x, REFLECTION: x, PRAYER: x
function parseDevotional(text) {
  const days = [];
  const dayBlocks = text.split(/DAY\s+(\d+)[:\s]*/i);
  for (let i = 1; i < dayBlocks.length; i += 2) {
    const dayNum = parseInt(dayBlocks[i]);
    const dayContent = dayBlocks[i + 1] || '';
    
    const lines = dayContent.split('\n').map(l => l.trim()).filter(Boolean);
    let title = `Day ${dayNum}`;
    let remainingContent = dayContent;
    
    if (lines.length > 0) {
      const firstLine = lines[0];
      const flUpper = firstLine.toUpperCase();
      if (!flUpper.startsWith('VERSE:') && !flUpper.startsWith('REFLECTION:') && !flUpper.startsWith('PRAYER:')) {
        title = firstLine.replace(/^[:\-–\s]+/, '').trim();
        remainingContent = lines.slice(1).join('\n');
      }
    }

    const verseMatch = remainingContent.match(/VERSE:\s*([^\n]+(?:\n(?!\w+:)[^\n]+)*)/i);
    const verse = verseMatch ? verseMatch[1].trim() : '';

    const reflectionMatch = remainingContent.match(/REFLECTION:\s*([\s\S]*?)(?=PRAYER:|$)/i);
    const reflection = reflectionMatch ? reflectionMatch[1].trim() : '';

    const prayerMatch = remainingContent.match(/PRAYER:\s*([\s\S]*?)(?=$)/i);
    const prayer = prayerMatch ? prayerMatch[1].trim() : '';

    days.push({ dayNum, title, verse, reflection, prayer });
  }
  return days;
}

const FOLLOWUPS = [
  "Tell me more about this",
  "How can I apply this today?",
  "What verse supports this?",
];

const DEVOTIONAL_TOPICS = [
  "Overcoming Anxiety",
  "Finding Purpose",
  "Strength in Trials",
  "Patience & Timing",
  "Forgiveness & Healing",
];

export default function Scholar({ selectedBook, currentChapter }) {
  const { devotionals, addDevotional, updateDevotionalDay, deleteDevotional } = useAppContext();
  
  // Tabs: 'chat' (AI Guide) or 'devotionals'
  const [subView, setSubView] = useState('chat');
  
  // Chat States
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Devotional states
  const [activePlanId, setActivePlanId] = useState(null);
  const [creatingDevotional, setCreatingDevotional] = useState(false);
  const [devotionalTopic, setDevotionalTopic] = useState('');
  const [devotionalDays, setDevotionalDays] = useState(3);
  const [devotionalStyle, setDevotionalStyle] = useState('Warm & Encouraging');
  const [streamedDevotionalText, setStreamedDevotionalText] = useState('');

  const activePlan = devotionals?.find(d => d.id === activePlanId);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Deep-linked queries from bookmarks/modal
  useEffect(() => {
    const pendingQuery = localStorage.getItem('sc-scholar-query');
    if (pendingQuery) {
      localStorage.removeItem('sc-scholar-query');
      setSubView('chat');
      handleSend(pendingQuery);
    }
  }, []);

  const handleSend = async (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    const context = selectedBook
      ? ` The user is reading ${selectedBook.n} chapter ${currentChapter}.`
      : '';

    const systemPrompt = `You are "The Scholar", a warm, professional, and wise Bible expert.${context}
Answer in clear, structured paragraphs.
Use **bold** for key terms and Bible references.
Use > for direct Bible quotes.
Keep answers focused and conversational—3-4 paragraphs unless asked for depth.
End with a short question to continue the discussion.`;

    const newMessages = [...messages, { role: 'user', content: msg }];
    const aiIndex = newMessages.length;
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    try {
      let accumulated = '';
      await askAIStream(newMessages, systemPrompt, (token) => {
        accumulated += token;
        setMessages(prev => {
          const updated = [...prev];
          updated[aiIndex] = { role: 'assistant', content: accumulated };
          return updated;
        });
      });
    } catch (error) {
      const isNetErr = !error.message || /failed|network|abort|timeout|fetch/i.test(error.message);
      const errorMsg = isNetErr
        ? "AI server not reachable. Open a NEW terminal, cd backend, then run: npm run dev"
        : error.message;
      setMessages(prev => {
        const updated = [...prev];
        updated[aiIndex] = { role: 'assistant', content: `⚠️ ${errorMsg}` };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDevotionalPlan = async () => {
    const topic = devotionalTopic.trim() || 'Faith & Guidance';
    setCreatingDevotional(true);
    setStreamedDevotionalText('');
    setLoading(true);

    const promptMsg = [{
      role: 'user',
      content: `Create a plan on: "${topic}"`
    }];

    const systemPrompt = `You are an expert biblical counselor.
Generate a ${devotionalDays}-day devotional plan on the topic of "${topic}" in a ${devotionalStyle} style.
Format your response EXACTLY as follows for each day. Do not add markdown bold formatting to field keywords:

DAY 1: [Day Title]
VERSE: [Scripture Reference and full verse text]
REFLECTION: [Write a thoughtful reflection, 2 paragraphs]
PRAYER: [Write a closing heartfelt prayer]

DAY 2: ... (repeat for each day)
`;

    try {
      let accumulated = '';
      await askAIStream(promptMsg, systemPrompt, (token) => {
        accumulated += token;
        setStreamedDevotionalText(accumulated);
      });

      // Stream complete, parse
      const parsedDays = parseDevotional(accumulated);
      if (parsedDays.length > 0) {
        const newPlan = {
          id: 'dev-' + Date.now(),
          topic: topic,
          duration: devotionalDays,
          currentDay: 1,
          days: parsedDays,
          createdAt: new Date().toISOString()
        };
        addDevotional(newPlan);
        setActivePlanId(newPlan.id);
        setCreatingDevotional(false);
      } else {
        alert("Failed to parse the devotional. Please try again with a different topic.");
      }
    } catch (error) {
      console.error(error);
      alert("Error generating devotional plan. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const quickAction = (type) => {
    const context = selectedBook ? `${selectedBook.n} ${currentChapter}` : "this passage";
    const prompts = {
      explain: `Explain ${context} — its context, themes, and application today.`,
      crossref: `What are the key cross-references for ${context}?`,
      prayer: `Write a heartfelt prayer based on ${context}.`,
      devotion: `Create a short devotional from ${context} with a key verse, reflection, and application.`
    };
    handleSend(prompts[type]);
  };

  return (
    <div className="aiwrap">
      {/* Premium Tab Toggle */}
      <div className="ttog" style={{ marginBottom: '14px' }}>
        <button className={`tbtn ${subView === 'chat' ? 'on' : ''}`} onClick={() => setSubView('chat')}>AI Guide</button>
        <button className={`tbtn ${subView === 'devotionals' ? 'on' : ''}`} onClick={() => setSubView('devotionals')}>Devotionals</button>
      </div>

      {subView === 'chat' ? (
        <>
          <div className="aitools-container">
            <span className="lbl">Quick Assistant Actions</span>
            <div className="aitools">
              <button className="aitool" onClick={() => quickAction('explain')}>📖 Explain</button>
              <button className="aitool" onClick={() => quickAction('crossref')}>🔗 Cross-Refs</button>
              <button className="aitool" onClick={() => quickAction('prayer')}>🙏 Pray It</button>
              <button className="aitool" onClick={() => quickAction('devotion')}>📋 Devotion</button>
            </div>
          </div>

          <div id="chat-sc" className="chatsc">
            {messages.length === 0 && (
              <div className="card empty-chat" style={{ textAlign: 'center', padding: '30px' }}>
                <div className="eico">✦</div>
                <div className="feat-tit" style={{ fontFamily: "'Playfair Display', serif" }}>Welcome, Seeker</div>
                <p className="feat-sub" style={{ fontStyle: 'italic', margin: '8px 0 16px' }}>Ask anything about scripture — passages, history, or theology.</p>
                <div className="suggrid">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} className="sugbtn" onClick={() => handleSend(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`bub ${m.role === 'user' ? 'bu' : 'bai'}`}>
                {m.role === 'assistant' && <div className="blbl">✦ The Scholar</div>}
                <div className="msg-content" dangerouslySetInnerHTML={{__html: renderMsg(m.content)}} />
                {m.role === 'assistant' && !loading && m.content && i === messages.length - 1 && (
                  <div className="suggrid" style={{marginTop: '10px'}}>
                    {FOLLOWUPS.map((s, si) => (
                      <button key={si} className="sugbtn" onClick={() => handleSend(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1].content === '' && (
              <div className="bub bai">
                <div className="blbl">✦ The Scholar</div>
                <div className="typing-dots"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chatbar">
            <textarea
              className="chatinp"
              rows="1"
              placeholder="Ask about scripture..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button className="sndbtn" onClick={() => handleSend()} disabled={loading || !input.trim()}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </>
      ) : (
        /* DEVOTIONALS VIEW */
        <div className="chatsc" style={{ overflowY: 'auto' }}>
          {creatingDevotional ? (
            <div className="card" style={{ padding: '20px' }}>
              <span className="lbl">Generating Devotional Plan</span>
              <div className="typing-dots" style={{ margin: '15px 0' }}><span></span><span></span><span></span></div>
              <div 
                style={{ 
                  maxHeight: '220px', 
                  overflowY: 'auto', 
                  fontSize: '13px', 
                  fontFamily: 'monospace', 
                  background: 'var(--bg)', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--bdr2)'
                }}
              >
                {streamedDevotionalText || "Formulating scripture passages..."}
              </div>
            </div>
          ) : activePlan ? (
            /* Selected Active Devotional Detailed Slides */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="back-btn" style={{ margin: 0 }} onClick={() => setActivePlanId(null)}>← Back to plans</button>
                <button 
                  className="btn-logout" 
                  style={{ color: '#ff6b6b' }} 
                  onClick={() => { if(window.confirm("Delete this plan?")) { deleteDevotional(activePlan.id); setActivePlanId(null); } }}
                >
                  Delete
                </button>
              </div>

              <div className="card" style={{ borderTop: '4px solid var(--gold)' }}>
                <span className="lbl" style={{ color: 'var(--gold)', margin: 0 }}>
                  Topic: {activePlan.topic} (Day {activePlan.currentDay} of {activePlan.duration})
                </span>
                
                {/* Progress bar */}
                <div style={{ background: 'var(--bdr2)', height: '5px', borderRadius: '3px', margin: '12px 0 20px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--gold)', height: '100%', width: `${((activePlan.currentDay - 1) / activePlan.duration) * 100}%`, transition: 'width 0.3s' }}></div>
                </div>

                {activePlan.days[activePlan.currentDay - 1] ? (
                  <div className="fade-in" key={activePlan.currentDay}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: 'var(--prime)', marginBottom: '10px' }}>
                      {activePlan.days[activePlan.currentDay - 1].title}
                    </h2>
                    
                    <span className="lbl" style={{ marginBottom: '5px' }}>Scripture</span>
                    <div style={{ fontStyle: 'italic', fontSize: '15px', padding: '10px 14px', background: 'var(--gpale)', borderLeft: '3px solid var(--gold)', borderRadius: '4px', marginBottom: '18px', color: 'var(--txt)' }}>
                      {activePlan.days[activePlan.currentDay - 1].verse}
                    </div>

                    <span className="lbl" style={{ marginBottom: '5px' }}>Reflection</span>
                    <div 
                      style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--txt)', marginBottom: '18px' }}
                      dangerouslySetInnerHTML={{ __html: renderMsg(activePlan.days[activePlan.currentDay - 1].reflection) }}
                    />

                    <span className="lbl" style={{ marginBottom: '5px' }}>Closing Prayer</span>
                    <div style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--muted)', background: 'var(--bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--bdr2)', lineHeight: '1.5' }}>
                      "{activePlan.days[activePlan.currentDay - 1].prayer}"
                    </div>
                  </div>
                ) : (
                  <div style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Day data not found.</div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
                  {activePlan.currentDay < activePlan.duration ? (
                    <button 
                      className="btn btn-gold" 
                      style={{ flex: 1, padding: '12px' }}
                      onClick={() => updateDevotionalDay(activePlan.id, activePlan.currentDay + 1)}
                    >
                      Complete Day {activePlan.currentDay} & Continue
                    </button>
                  ) : (
                    <div className="card" style={{ width: '100%', textAlign: 'center', background: 'var(--gdim)', borderColor: 'var(--gold)', padding: '15px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '6px' }}>🏆</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'var(--prime)', fontWeight: 'bold' }}>Journey Complete!</div>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>You have completed this devotional plan. Stay faithful!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* List of existing devotionals or create new button */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="card">
                <span className="lbl">Create A New Devotional Journey</span>
                <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 16px', lineHeight: '1.5' }}>
                  Select a topic below or enter your own custom spiritual focus area. The AI Scholar will construct a structured multi-day guided devotional course.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="lbl" style={{ marginBottom: '6px' }}>Spiritual Topic</label>
                    <input 
                      type="text" 
                      className="chatinp" 
                      placeholder="e.g. Overcoming Fear, Leadership, Trust" 
                      value={devotionalTopic}
                      onChange={(e) => setDevotionalTopic(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {DEVOTIONAL_TOPICS.map(t => (
                        <button 
                          key={t} 
                          className="sugbtn" 
                          style={{ fontSize: '11px', padding: '4px 10px', margin: 0 }}
                          onClick={() => setDevotionalTopic(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label className="lbl" style={{ marginBottom: '6px' }}>Duration</label>
                      <select 
                        className="tsel" 
                        value={devotionalDays} 
                        onChange={(e) => setDevotionalDays(parseInt(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }}
                      >
                        <option value="3">3 Days</option>
                        <option value="5">5 Days</option>
                      </select>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label className="lbl" style={{ marginBottom: '6px' }}>Voice / Style</label>
                      <select 
                        className="tsel" 
                        value={devotionalStyle} 
                        onChange={(e) => setDevotionalStyle(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }}
                      >
                        <option value="Warm & Encouraging">Warm & Encouraging</option>
                        <option value="Theological & Deep">Theological & Academic</option>
                        <option value="Practical & Direct">Practical & Active</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    className="btn btn-gold" 
                    style={{ marginTop: '10px', padding: '12px' }}
                    onClick={generateDevotionalPlan}
                    disabled={loading}
                  >
                    ✨ Begin Devotional Journey
                  </button>
                </div>
              </div>

              {devotionals && devotionals.length > 0 && (
                <>
                  <span className="lbl" style={{ marginTop: '10px' }}>Your Active Devotionals</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    {devotionals.map(d => {
                      const completedPct = Math.round(((d.currentDay - 1) / d.duration) * 100);
                      return (
                        <div 
                          key={d.id} 
                          className="card" 
                          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => setActivePlanId(d.id)}
                        >
                          <div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: 'var(--prime)', fontWeight: 'bold' }}>
                              {d.topic}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                              Progress: Day {d.currentDay} of {d.duration} ({completedPct}% complete)
                            </div>
                          </div>
                          <div style={{ fontSize: '18px', color: 'var(--gold)' }}>→</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
