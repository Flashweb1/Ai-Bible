const state = {
  isMenuOpen: false,
  currentPage: 'home',
  user: null,
  showAuthModal: false,
  currentBook: null,
  currentChapter: 1,
};

export function setState(key, value) {
  state[key] = value;
}

export { state };
