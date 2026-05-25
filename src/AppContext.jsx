import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from './lib/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const AppContext = createContext();

export function AppProvider({ children }) {
  // Initialize state directly from LocalStorage
  const [highlights, setHighlights] = useState(() => JSON.parse(localStorage.getItem('sc-hl') || '{}'));
  const [bookmarks, setBookmarks] = useState(() => JSON.parse(localStorage.getItem('sc-bm') || '[]'));
  const [notes, setNotes] = useState(() => JSON.parse(localStorage.getItem('sc-notes') || '[]'));
  const [prayers, setPrayers] = useState(() => JSON.parse(localStorage.getItem('sc-prayers') || '[]'));
  const [devotionals, setDevotionals] = useState(() => JSON.parse(localStorage.getItem('sc-devotions') || '[]'));
  
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
    localStorage.setItem('sc-hl', JSON.stringify(highlights));
    localStorage.setItem('sc-bm', JSON.stringify(bookmarks));
    localStorage.setItem('sc-notes', JSON.stringify(notes));
    localStorage.setItem('sc-prayers', JSON.stringify(prayers));
    localStorage.setItem('sc-devotions', JSON.stringify(devotionals));

    if (user && isCloudLoaded) {
      const docRef = doc(db, 'users', user.uid, 'data', 'appState');
      setDoc(docRef, { highlights, bookmarks, notes, prayers, devotionals }, { merge: true })
        .catch(err => console.error("Failed to backup to Firebase:", err));
    }
  }, [highlights, bookmarks, notes, prayers, devotionals, user, isCloudLoaded]);

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
      streak 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}