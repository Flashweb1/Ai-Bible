import React, { useState, useEffect, useRef } from 'react';
import { askAIStream } from '../js/api.js';
import { SUGGESTIONS } from '../js/data.js';
import { useToast } from './Toast.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function Scholar({ selectedBook, currentChapter, user, onLoginClick }) {
  usePageTitle('Scholar');
  const showToast = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const abortRef = useRef(null);
  const isMountedRef = useRef(true);
  const accumulatedRef = useRef('');
  const handleSendRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const pendingQuery = localStorage.getItem('sc-scholar-query');
    if (pendingQuery && handleSendRef.current) {
      localStorage.removeItem('sc-scholar-query');
      handleSendRef.current(pendingQuery);
    }
  }, []);

  const flushTokens = (aiIndex) => {
    const content = accumulatedRef.current;
    if (!isMountedRef.current) return;
    setMessages(prev => {
      const updated = [...prev];
      if (updated[aiIndex]) {
        updated[aiIndex] = { role: 'assistant', content };
      }
      return updated;
    });
  };

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

    accumulatedRef.current = '';

    const ac = new AbortController();
    abortRef.current = ac;

    let rafId = null;
    const scheduleFlush = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        flushTokens(aiIndex);
      });
    };

    try {
      await askAIStream(newMessages, systemPrompt, (token) => {
        accumulatedRef.current += token;
        scheduleFlush();
      }, ac.signal);
      if (rafId) cancelAnimationFrame(rafId);
      flushTokens(aiIndex);
    } catch (error) {
      if (rafId) cancelAnimationFrame(rafId);
      if (ac.signal.aborted && isMountedRef.current) {
        setMessages(prev => {
          const updated = [...prev];
          updated[aiIndex] = { role: 'assistant', content: accumulatedRef.current || '⚠️ Response was cancelled.' };
          return updated;
        });
      } else if (isMountedRef.current) {
        const isOffline = !navigator.onLine;
        const isNetErr = !error.message || /failed|network|abort|timeout|fetch/i.test(error.message);
        const errorMsg = isOffline
          ? "You are offline. The Scholar requires an internet connection. Your reading, notes, bookmarks, and prayers are still available."
          : isNetErr
          ? "Could not reach the AI server. Please check your connection and try again."
          : error.message;
        setMessages(prev => {
          const updated = [...prev];
          updated[aiIndex] = { role: 'assistant', content: `⚠️ ${errorMsg}` };
          return updated;
        });
      }
    } finally {
      abortRef.current = null;
      if (isMountedRef.current) setLoading(false);
    }
  };
  handleSendRef.current = handleSend;

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

  const passageLabel = selectedBook ? `${selectedBook.n} ${currentChapter}` : null;

  return (
    <div className="aiwrap">
      <div className="ai-header">
        <span className="ai-header-title">✨ The Scholar</span>
        {passageLabel && <span className="ai-header-passage">{passageLabel}</span>}
      </div>

      <div className="chatsc" aria-live="polite" aria-relevant="additions">
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
            <div className="msg-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.content || (loading && i === messages.length - 1 ? '' : '')}</div>
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
        <div className="chatbar-actions">
          <button className="chip-btn" onClick={() => quickAction('explain')} title="Explain this passage">📖</button>
          <button className="chip-btn" onClick={() => quickAction('crossref')} title="Cross-references">🔗</button>
          <button className="chip-btn" onClick={() => quickAction('prayer')} title="Write a prayer">🙏</button>
          <button className="chip-btn" onClick={() => quickAction('devotion')} title="Create a devotional">📋</button>
        </div>
        <textarea
          className="chatinp"
          rows="1"
          placeholder="Ask about scripture..."
          aria-label="Ask about scripture"
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
    </div>
  );
}
