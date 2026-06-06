import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <span className="install-prompt-icon">📖</span>
        <div>
          <div className="install-prompt-title">Install Scripturai</div>
          <div className="install-prompt-text">Add to your home screen for the best experience</div>
        </div>
        <button className="install-prompt-btn" onClick={handleInstall}>Install</button>
        <button className="install-prompt-close" onClick={() => setShow(false)}>✕</button>
      </div>
    </div>
  );
}
