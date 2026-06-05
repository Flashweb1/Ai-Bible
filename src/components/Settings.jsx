import React, { useEffect, useState } from 'react';
import { loadPreferences, savePreferences, applyPreferences } from '../js/preferences.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const FONT_FAMILIES = [
  { id: 'system', label: 'System', value: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' },
  { id: 'inter', label: 'Inter', value: 'Inter, system-ui, -apple-system, Roboto, Arial' },
  { id: 'serif', label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
  { id: 'noto', label: 'Noto Serif', value: 'Noto Serif, Georgia, serif' }
];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const y = Math.min(k(n) - 3, 9 - k(n));
    return l - a * Math.max(-1, Math.min(y, 1));
  };
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export default function Settings({ isDark, setIsDark, setTab }) {
  usePageTitle('Settings');
  const [prefs, setPrefs] = useState(() => loadPreferences() || { theme: isDark ? 'dark' : 'light', fontFamily: FONT_FAMILIES[0].value, fontScale: 1, accent: 'hsl(348 70% 45%)', accentCompl: 'hsl(168 70% 45%)' });

  useEffect(() => {
    applyPreferences(prefs);
  }, []);

  function setTheme(theme) {
    const next = { ...prefs, theme };
    setPrefs(next);
    savePreferences(next);
    setIsDark(theme === 'dark');
    applyPreferences(next);
  }

  function setFontFamily(fn) {
    const next = { ...prefs, fontFamily: fn };
    setPrefs(next);
    savePreferences(next);
    applyPreferences(next);
  }

  function setFontScale(scale) {
    const next = { ...prefs, fontScale: scale };
    setPrefs(next);
    savePreferences(next);
    applyPreferences(next);
  }

  function setAccent(h) {
    let accent = h;
    let accentCompl = prefs.accentCompl;
    const m = h.match(/hsl\((\d+)\s*(\d+)%\s*(\d+)%\)/);
    if (m) {
      const hh = (parseInt(m[1], 10) + 180) % 360;
      accentCompl = `hsl(${hh} ${m[2]}% ${m[3]}%)`;
    } else if (h.startsWith('#')) {
      const rgb = hexToRgb(h);
      if (rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const hh = (hsl.h + 180) % 360;
        accentCompl = hslToHex(hh, hsl.s, hsl.l);
      }
    }
    const next = { ...prefs, accent, accentCompl };
    setPrefs(next);
    savePreferences(next);
    applyPreferences(next);
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <button className="hico" onClick={() => setTab('home')} title="Back to Home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div className="hdr-logo">Settings</div>
          <div className="hdr-sub">App preferences and display options</div>
        </div>
      </div>

      <div className="setting-group">
        <div className="section-title">Color Mode</div>
        <div className="opt-group">
          <button className={`opt-btn ${prefs.theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>Light</button>
          <button className={`opt-btn ${prefs.theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
          <button className={`opt-btn ${prefs.theme === 'sepia' ? 'active' : ''}`} onClick={() => setTheme('sepia')}>Sepia</button>
        </div>
      </div>

      <div className="setting-group">
        <div className="section-title">Accent Color</div>
        <div className="color-row">
          <input type="color" value={prefs.accent?.startsWith('#') ? prefs.accent : '#b71c1c'} onChange={(e) => setAccent(e.target.value)} />
          <div className="color-swatch" style={{ background: prefs.accent }} />
          <div className="color-swatch" style={{ background: prefs.accentCompl }} />
        </div>
      </div>

      <div className="setting-group">
        <div className="section-title">Font Family</div>
        <div className="opt-group">
          {FONT_FAMILIES.map((f) => (
            <button key={f.id} className={`opt-btn ${prefs.fontFamily === f.value ? 'active' : ''}`} onClick={() => setFontFamily(f.value)}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <div className="section-title">Font Size</div>
        <div className="opt-group">
          <button className={`opt-btn ${prefs.fontScale === 0.9 ? 'active' : ''}`} onClick={() => setFontScale(0.9)}>A-</button>
          <button className={`opt-btn ${prefs.fontScale === 1 ? 'active' : ''}`} onClick={() => setFontScale(1)}>A</button>
          <button className={`opt-btn ${prefs.fontScale === 1.2 ? 'active' : ''}`} onClick={() => setFontScale(1.2)}>A+</button>
          <button className={`opt-btn ${prefs.fontScale === 1.4 ? 'active' : ''}`} onClick={() => setFontScale(1.4)}>A++</button>
        </div>
      </div>

      <div className="setting-group">
        <div className="section-title">Preferences</div>
        <p>Preferences are saved locally and applied immediately.</p>
      </div>
    </div>
  );
}
