import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext.jsx';
import { useToast } from './Toast.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

function generateId() {
  try { return crypto.randomUUID(); } catch { return 'nt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); }
}

export default function Notes({ user, onLoginClick }) {
    usePageTitle('Notes');
    const showToast = useToast();
    const { notes = [], setNotes } = useAppContext();
    const [editingNote, setEditingNote] = useState(null);
    const [title, setTitle] = useState('');
    const [passage, setPassage] = useState('');
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);

    useEffect(() => {
        const prefill = localStorage.getItem('sc-note-prefill');
        if (prefill) {
            try {
                const data = JSON.parse(prefill);
                setEditingNote({
                    title: data.title || '',
                    passage: data.passage || '',
                    content: data.content || '',
                    tags: ['Study']
                });
                setTitle(data.title || '');
                setPassage(data.passage || '');
                setContent(data.content || '');
                setSelectedTags(['Study']);
            } catch (e) {
                console.error("Failed to parse note prefill data", e);
            }
            localStorage.removeItem('sc-note-prefill');
        }
    }, []);

    const tags = ['Study', 'Prayer', 'Personal', 'Sermon', 'Reflections'];

    const handleSave = () => {
        if (!content.trim() && !title.trim()) {
            showToast("Note cannot be empty.");
            return;
        }

        const noteData = {
            title: title || 'Untitled Note',
            passage,
            content,
            tags: selectedTags,
            updatedAt: new Date().toISOString(),
        };

        if (editingNote?.id) {
            // Update existing note
            setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...noteData } : n));
        } else {
            // Create new note
            const newNoteObj = {
                id: generateId(),
                ...noteData,
                createdAt: new Date().toISOString()
            };
            setNotes(prev => [newNoteObj, ...prev]);
        }
        backToNotes();
    };

    const openNote = (note) => {
        setEditingNote(note);
        setTitle(note.title);
        setPassage(note.passage || '');
        setContent(note.content);
        setSelectedTags(note.tags || []);
    };

    const newNote = () => {
        setEditingNote({});
        setTitle('');
        setPassage('');
        setContent('');
        setSelectedTags([]);
    };

    const backToNotes = () => {
        setEditingNote(null);
    };

    const deleteNote = (id) => {
        if (!window.confirm('Delete this note?')) return;
        setNotes(prev => prev.filter(n => n.id !== id));
        backToNotes();
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const formatDate = (dateVal) => {
        if (!dateVal) return '';
        const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return d.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    if (editingNote) {
        return (
            <div className="fade-in">
                <button className="btn btn-ghost" onClick={backToNotes} style={{ marginBottom: '15px' }}>
                    ← Back to Notes
                </button>
                <div className="nedwrap card" style={{ padding: '20px' }}>
                    <input 
                        className="ned-t" 
                        placeholder="Note title…" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ background: 'transparent', border: 'none', fontSize: '24px', fontFamily: "'Playfair Display', serif", color: 'var(--gold)', width: '100%', marginBottom: '10px' }}
                    />
                    <input 
                        className="ned-p" 
                        placeholder="Linked passage (e.g. John 3:16)" 
                        value={passage}
                        onChange={(e) => setPassage(e.target.value)}
                        style={{ background: 'transparent', border: 'none', fontSize: '14px', opacity: 0.6, width: '100%', marginBottom: '20px' }}
                    />
                    
                    <span className="lbl" style={{ marginBottom: '7px', display: 'block' }}>Tags</span>
                    <div className="tagsrow" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {tags.map(t => (
                            <button 
                                key={t} 
                                className={`tagbtn ${selectedTags.includes(t) ? 'on' : ''}`}
                                onClick={() => toggleTag(t)}
                                style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)', background: selectedTags.includes(t) ? 'var(--gold)' : 'transparent', color: selectedTags.includes(t) ? '#000' : 'inherit' }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <textarea 
                        className="ned-b" 
                        placeholder="Write your reflections…" 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{ width: '100%', minHeight: '300px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '16px', lineHeight: '1.6' }}
                    />

                    <div className="nedacts" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button className="btn btn-prime" onClick={handleSave}>Save</button>
                        <button className="btn btn-ghost" onClick={backToNotes}>Cancel</button>
                        {editingNote.id && (
                            <button className="btn btn-danger" onClick={() => deleteNote(editingNote.id)}>Delete</button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {!user && !localStorage.getItem('sc-auth-dismiss-notes') && (
              <div className="auth-prompt">
                <span>🔒 Sign in to sync your notes across devices</span>
                <button className="auth-prompt-btn" onClick={onLoginClick}>Sign In</button>
                <button className="auth-prompt-close" onClick={() => localStorage.setItem('sc-auth-dismiss-notes', '1')}>✕</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '13px' }}>
                <span className="lbl" style={{ margin: 0 }}>My Notes ({notes.length})</span>
            </div>
            <button className="newnbtn btn btn-prime" onClick={newNote} style={{ width: '100%', marginBottom: '20px' }}>
                + New Note
            </button>

            {notes.length === 0 ? (
                <div className="empty" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                    <div style={{ fontSize: '48px' }}>📜</div>
                    <div style={{ marginTop: '10px' }}>Your reflections will appear here</div>
                </div>
            ) : (
                <div className="n-list">
                    {notes.map(n => (
                        <div key={n.id} className="ncard card" onClick={() => openNote(n)} style={{ marginBottom: '15px', padding: '15px', cursor: 'pointer' }}>
                            <div className="ntit" style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'var(--gold)', marginBottom: '5px' }}>{n.title}</div>
                            <div className="nmeta" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                {n.passage && <span className="npass" style={{ fontSize: '12px', opacity: 0.7 }}>{n.passage}</span>}
                                {(n.tags || []).map(t => (
                                    <span key={t} className="ntag" style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(212,175,55,0.1)', color: 'var(--gold)' }}>{t}</span>
                                ))}
                            </div>
                            <div className="nprev" style={{ fontSize: '14px', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {n.content || 'No content...'}
                            </div>
                            <div className="ndate" style={{ fontSize: '10px', opacity: 0.4, marginTop: '8px' }}>
                                {formatDate(n.updatedAt)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}