import { state, setState } from './state.js';
import { MENU_LINKS, BOOKS } from './data.js';

export const navService = {
  /**
   * Toggles the visibility of the navigation drawer.
   */
  toggleMenu() {
    setState('isMenuOpen', !state.isMenuOpen);
  },

  /**
   * Closes the navigation drawer.
   */
  closeMenu() {
    setState('isMenuOpen', false);
  },

  /**
   * Returns the menu links for rendering.
   * @returns {Array<Object>} An array of menu link objects.
   */
  getMenuLinks() {
    return MENU_LINKS;
  },

  /**
   * Navigates to a specific page and re-renders the app.
   * @param {string} pageId - The ID of the page to navigate to (e.g., 'settings', 'about').
   */
  go(pageId) {
    // If the user tries to access a feature that requires auth
    if (this.requiresAuth(pageId) && !state.user) {
      this.openAuth();
      return;
    }

    if (pageId === 'auth') {
      this.openAuth();
      return;
    }

    // Toggle menu state off when navigating
    if (state.isMenuOpen) {
      setState('isMenuOpen', false);
    }

    setState('currentPage', pageId);
    if (window.App && typeof window.App.render === 'function') window.App.render();
  },

  /**
   * Navigates directly to a specific Bible book in the reader.
   * @param {string} bookName - The name of the book (e.g., 'John').
   */
  goToBook(bookName) {
    const book = BOOKS.find(b => b.n === bookName);
    if (book) {
      if (state.isMenuOpen) {
        setState('isMenuOpen', false);
      }
      setState('currentBook', book.num);
      setState('currentChapter', 1);
      this.go('read');
    }
  },

  /**
   * Triggers the Auth Modal.
   */
  openAuth() {
    setState('showAuthModal', true);
    this.closeMenu();
    window.App.render();
  },

  /**
   * Checks if a page requires authentication.
   * @param {string} pageId 
   */
  requiresAuth(pageId) {
    const protectedPages = ['notes', 'prayer', 'bookmarks'];
    return protectedPages.includes(pageId);
  }
};