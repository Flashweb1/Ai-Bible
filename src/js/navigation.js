export function navigateTo(itemId, { user, setTab, setSelectedBook, setCurrentChapter, openAuth, onClose }) {
  if (itemId === 'profile') {
    if (!user) { openAuth?.(); onClose?.(); return; }
    localStorage.setItem('sc-about-tab', 'profile');
    setTab('about');
  } else if (itemId === 'prayer') {
    setTab('pray');
  } else if (itemId === 'day_by_day' || itemId === 'reading_plans') {
    localStorage.setItem('sc-scholar-tab', 'devotionals');
    setTab('scholar');
  } else if (['donate', 'about', 'privacy', 'contact'].includes(itemId)) {
    localStorage.setItem('sc-about-tab', itemId);
    setTab('about');
  } else if (itemId === 'audio_bible') {
    setTab('read');
  } else {
    setTab(itemId);
  }
  onClose?.();
}

export function handleSearchSelect(item, { user, setTab, setSelectedBook, setCurrentChapter, onClose }) {
  if (item.type === 'book') {
    setSelectedBook(item.payload);
    setCurrentChapter(item.chapter || 1);
    setTab('read');
    onClose?.();
  } else if (item.type === 'menu') {
    navigateTo(item.payload.id, { user, setTab, setSelectedBook, setCurrentChapter, onClose: () => onClose?.() });
  } else if (item.type === 'daily') {
    localStorage.setItem('sc-scholar-query', `Explain the significance of ${item.payload.ref}: "${item.payload.text}"`);
    setTab('scholar');
    onClose?.();
  }
}

// Map drawer item IDs to tab names for active highlighting
export const ITEM_TO_TAB = {
  home: 'home',
  read: 'read',
  scholar: 'scholar',
  audio_bible: 'read',
  prayer: 'pray',
  bookmarks: 'bookmarks',
  notes: 'notes',
  day_by_day: 'scholar',
  reading_plans: 'scholar',
  profile: 'about',
  settings: 'settings',
  about: 'about',
  donate: 'about',
  privacy: 'about',
  contact: 'about',
};
