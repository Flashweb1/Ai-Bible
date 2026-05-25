import React, { useState } from 'react';
import { auth } from '../lib/firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose(); // Close modal on success
    } catch (err) {
      // Clean up the error message string
      setError(err.message.replace('Firebase: ', '')); 
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
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
            type="email" placeholder="Email" className="ned-t" required 
            style={{ fontFamily: "'EB Garamond', serif", fontSize: '17px' }}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" className="ned-t" required minLength="6" 
            style={{ fontFamily: "'EB Garamond', serif", fontSize: '17px' }}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-prime">{isLogin ? 'Sign In' : 'Sign Up'}</button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '15px', color: 'var(--muted)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }} style={{ color: 'var(--prime)', textDecoration: 'none', fontWeight: 'bold' }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </a>
        </div>
        
        <div className="divider"><div className="dl"></div><div className="dg" style={{ fontSize: '9px' }}>OR</div><div className="dl"></div></div>
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleGoogleSignIn}>Sign in with Google</button>
      </div>
    </div>
  );
}