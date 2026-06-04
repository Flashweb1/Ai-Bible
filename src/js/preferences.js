export const PREF_KEY = 'userPreferences_v1';

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

export function applyPreferences(prefs) {
  if (!prefs) return;
  if (prefs.fontFamily) document.documentElement.style.setProperty('--font-family-base', prefs.fontFamily);
  if (prefs.fontScale) document.documentElement.style.setProperty('--font-size-scale', prefs.fontScale);
  
  if (prefs.accent) {
    const isDefaultLightAccent = prefs.accent === 'hsl(348 70% 45%)';
    if ((prefs.theme === 'dark' || prefs.theme === 'sepia') && isDefaultLightAccent) {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-compl');
    } else {
      document.documentElement.style.setProperty('--accent', prefs.accent);
      if (prefs.accentCompl) document.documentElement.style.setProperty('--accent-compl', prefs.accentCompl);
    }
  }
  
  if (prefs.theme) document.documentElement.setAttribute('data-theme', prefs.theme);
}
