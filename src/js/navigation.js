export function navigateTo(itemId, { user, setTab, setSelectedBook, setCurrentChapter, openAuth, onClose }) {
  if (itemId === 'profile') {
    if (!user) { openAuth?.(); onClose?.(); return; }
    localStorage.setItem('sc-about-tab', 'profile');
    setTab('about');
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

export const ITEM_TO_TAB = {
  home: 'home',
  read: 'read',
  scholar: 'scholar',
  plans: 'plans',
  pray: 'pray',
  bookmarks: 'bookmarks',
  notes: 'notes',
  profile: 'about',
  settings: 'settings',
  about: 'about',
};
