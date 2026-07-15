import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from './lib/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const AppContext = createContext();

function loadSavedJSON(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function AppProvider({ children }) {
  // Initialize state directly from LocalStorage
  const [highlights, setHighlights] = useState(() => loadSavedJSON('sc-hl', {}));
  const [bookmarks, setBookmarks] = useState(() => loadSavedJSON('sc-bm', []));
  const [notes, setNotes] = useState(() => loadSavedJSON('sc-notes', []));
  const [prayers, setPrayers] = useState(() => loadSavedJSON('sc-prayers', []));
  const [devotionals, setDevotionals] = useState(() => loadSavedJSON('sc-devotions', []));
  const [readingPlans, setReadingPlans] = useState(() => loadSavedJSON('sc-plans', []));
  
  const [user, setUser] = useState(null);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  // Listen for Firebase Auth changes to load cloud data safely
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'data', 'appState');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Merge cloud data with local data, preventing accidental overwrites
            if (data.highlights) setHighlights(prev => ({ ...prev, ...data.highlights }));
            if (data.bookmarks) setBookmarks(prev => {
              const merged = [...prev];
              data.bookmarks.forEach(cb => { if (!merged.find(lb => lb.bk === cb.bk && lb.ch === cb.ch && lb.vn === cb.vn)) merged.push(cb); });
              return merged;
            });
            if (data.notes) setNotes(prev => {
              const merged = [...prev];
              data.notes.forEach(cn => { if (!merged.find(ln => ln.id === cn.id)) merged.push(cn); });
              return merged.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            });
            if (data.prayers) setPrayers(prev => {
              const merged = [...prev];
              data.prayers.forEach(cp => { if (!merged.find(lp => lp.id === cp.id)) merged.push(cp); });
              return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            });
            if (data.devotionals) setDevotionals(prev => {
              const merged = [...prev];
              data.devotionals.forEach(cd => { if (!merged.find(ld => ld.id === cd.id)) merged.push(cd); });
              return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            });
            if (data.readingPlans) setReadingPlans(prev => {
              const merged = [...prev];
              data.readingPlans.forEach(cp => { if (!merged.find(lp => lp.id === cp.id)) merged.push(cp); });
              return merged.sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));
            });
          }
        } catch (err) {
          console.error("Failed to sync from Firebase:", err);
        } finally {
          setIsCloudLoaded(true);
        }
      } else {
        setIsCloudLoaded(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-sync state changes back to LocalStorage AND Firebase
  useEffect(() => {
    try { localStorage.setItem('sc-hl', JSON.stringify(highlights)); } catch {}
    try { localStorage.setItem('sc-bm', JSON.stringify(bookmarks)); } catch {}
    try { localStorage.setItem('sc-notes', JSON.stringify(notes)); } catch {}
    try { localStorage.setItem('sc-prayers', JSON.stringify(prayers)); } catch {}
    try { localStorage.setItem('sc-devotions', JSON.stringify(devotionals)); } catch {}
    try { localStorage.setItem('sc-plans', JSON.stringify(readingPlans)); } catch {}

    if (user && isCloudLoaded) {
      const docRef = doc(db, 'users', user.uid, 'data', 'appState');
      setDoc(docRef, { highlights, bookmarks, notes, prayers, devotionals, readingPlans }, { merge: true })
        .catch(err => console.error("Failed to backup to Firebase:", err));
    }
  }, [highlights, bookmarks, notes, prayers, devotionals, readingPlans, user, isCloudLoaded]);

  const toggleHighlight = (key, color) => {
    setHighlights(prev => {
      const next = { ...prev };
      if (color) next[key] = color;
      else delete next[key];
      return next;
    });
  };

  const addBookmark = (bookmark) => {
    setBookmarks(prev => {
      // Prevent duplicate bookmarks
      if (prev.find(b => b.bk === bookmark.bk && b.ch === bookmark.ch && b.vn === bookmark.vn)) return prev;
      return [bookmark, ...prev];
    });
  };

  const deleteBookmark = (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const addDevotional = (devotional) => {
    setDevotionals(prev => [devotional, ...prev]);
  };

  const updateDevotionalDay = (id, newDay) => {
    setDevotionals(prev => prev.map(d => d.id === id ? { ...d, currentDay: newDay } : d));
  };

  const deleteDevotional = (id) => {
    setDevotionals(prev => prev.filter(d => d.id !== id));
  };

  // ── Reading Plan actions ──────────────────────────────────────────────────
  /** Start a plan. If already active, returns the existing one. */
  const startPlan = (planTemplate) => {
    setReadingPlans(prev => {
      if (prev.find(p => p.planId === planTemplate.id && !p.completedAt)) return prev;
      const newPlan = {
        id: 'plan-' + Date.now(),
        planId: planTemplate.id,
        title: planTemplate.title,
        icon: planTemplate.icon,
        totalDays: planTemplate.totalDays,
        completedDays: [],   // array of day indexes (0-based) that are done
        startedAt: new Date().toISOString(),
        completedAt: null,
      };
      return [newPlan, ...prev];
    });
  };

  /** Mark a day (0-based index) as complete for a given active plan. */
  const markDayComplete = (planInstanceId, dayIndex) => {
    setReadingPlans(prev => prev.map(p => {
      if (p.id !== planInstanceId) return p;
      const alreadyDone = p.completedDays.includes(dayIndex);
      const completedDays = alreadyDone
        ? p.completedDays.filter(d => d !== dayIndex)
        : [...p.completedDays, dayIndex].sort((a, b) => a - b);
      const completedAt = completedDays.length >= p.totalDays ? new Date().toISOString() : null;
      return { ...p, completedDays, completedAt };
    }));
  };

  const deletePlan = (planInstanceId) => {
    setReadingPlans(prev => prev.filter(p => p.id !== planInstanceId));
  };

  // Calculate streak
  const streak = useMemo(() => {
    if (!prayers || prayers.length === 0) return 0;
    
    // Sort descending by date
    const sortedDates = [...prayers]
      .filter(p => p.createdAt)
      .map(p => new Date(p.createdAt).setHours(0,0,0,0))
      .sort((a, b) => b - a);

    // Filter unique dates
    const uniqueDates = [...new Set(sortedDates)];

    const today = new Date().setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(new Date().getDate() - 1);

    if (uniqueDates.length === 0) return 0;

    // The streak must start with today or yesterday
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday.getTime()) return 0;

    let currentStreak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = uniqueDates[i];
      const next = uniqueDates[i+1];
      const diff = Math.round((current - next) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [prayers]);

  return (
    <AppContext.Provider value={{ 
      highlights, toggleHighlight, 
      bookmarks, addBookmark, deleteBookmark,
      notes, setNotes, 
      prayers, setPrayers, 
      devotionals, addDevotional, updateDevotionalDay, deleteDevotional,
      readingPlans, startPlan, markDayComplete, deletePlan,
      streak 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}