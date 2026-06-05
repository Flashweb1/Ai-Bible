import React from 'react'
import ReactDOM from 'react-dom/client'
import './css/main.css'
import './css/components.css'
import './css/home.css'
import './css/read.css'
import './css/scholar.css'
import './css/prayer.css'
import './css/quiz.css'
import './css/notes.css'
import App from './App.jsx'
import { AppProvider } from './AppContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast.jsx'

// ─── Register Service Worker for offline PWA support ───────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered, scope:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
