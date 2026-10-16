import React, { useState } from 'react';
import { auth } from '../lib/firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const FRIENDLY_ERRORS = {
  'auth/unauthorized-domain': "This website's address isn't authorized for Google sign-in yet. Please use email sign-in, or add this domain in the Firebase console (Authentication → Settings → Authorized domains).",
  'auth/invalid-email': "That email address doesn't look valid.",
  'auth/weak-password': "Your password should be at least 6 characters.",
  'auth/email-already-in-use': "An account with this email already exists. Try signing in instead.",
  'auth/invalid-credential': "Incorrect email or password.",
  'auth/wrong-password': "Incorrect email or password.",
  'auth/user-not-found': "No account was found with that email.",
  'auth/too-many-requests': "Too many attempts. Please wait a moment and try again.",
  'auth/operation-not-allowed': "This sign-in method is currently disabled.",
  'auth/network-request-failed': "Network error. Please check your connection and try again.",
  'auth/popup-closed-by-user': "The sign-in window was closed before finishing.",
  'auth/cancelled-popup-request': "Sign-in was cancelled. Please try again.",
  'auth/popup-blocked': "Your browser blocked the sign-in popup. Please allow popups for this site and try again.",
  'auth/account-exists-with-different-credential': "An account already exists with this email using a different sign-in method.",
};

function friendlyError(err) {
  return FRIENDLY_ERRORS[err?.code] || (err?.message || 'Something went wrong. Please try again.').replace('Firebase: ', '');
}

export default function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose(); // Close modal on success
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mbg open" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ position: 'relative' }}>
        <button className="hico" style={{ position: 'absolute', top: '10px', right: '10px' }} onClick={onClose}>✕</button>
        
        <div className="mtit">{isLogin ? 'Sign In' : 'Create Account'}</div>
        
        {error && <div style={{ color: '#C03030', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <input 
            type="email" placeholder="Email" className="ned-t" required disabled={loading}
            style={{ fontFamily: "'EB Garamond', serif", fontSize: '17px' }}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" className="ned-t" required minLength="6" disabled={loading}
            style={{ fontFamily: "'EB Garamond', serif", fontSize: '17px' }}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-prime" disabled={loading}>
            {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '15px', color: 'var(--muted)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }} style={{ color: 'var(--prime)', textDecoration: 'none', fontWeight: 'bold' }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </a>
        </div>
        
        <div className="divider"><div className="dl"></div><div className="dg" style={{ fontSize: '9px' }}>OR</div><div className="dl"></div></div>
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleGoogleSignIn} disabled={loading}>Sign in with Google</button>
      </div>
    </div>
  );
}