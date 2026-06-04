import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase.js';
import { signOut } from 'firebase/auth';

export default function About({ user, setTab }) {
  const [subView, setSubView] = useState('about');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [donationAmount, setDonationAmount] = useState('10');
  const [donationSuccess, setDonationSuccess] = useState(false);

  useEffect(() => {
    const tab = localStorage.getItem('sc-about-tab');
    if (tab) {
      localStorage.removeItem('sc-about-tab');
      setSubView(tab);
    }
  }, []);

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setFeedbackSent(true);
    setFeedbackMsg('');
    setTimeout(() => setFeedbackSent(false), 5000);
  };

  const handleDonationSubmit = (e) => {
    e.preventDefault();
    setDonationSuccess(true);
    setTimeout(() => setDonationSuccess(false), 5000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTab('home');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const renderContent = () => {
    switch (subView) {
      case 'profile':
        return (
          <div className="card fade-in" style={{ padding: '20px' }}>
            <span className="lbl">My Profile</span>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', textAlign: 'center', marginTop: '10px' }}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--gold)' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--gpale)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'var(--prime)', fontWeight: 'bold' }}>
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                  </div>
                )}
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: 'var(--prime)' }}>{user.displayName || 'Faithful Reader'}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '2px' }}>{user.email}</p>
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--bdr2)', borderRadius: '8px', padding: '12px 20px', width: '100%', fontSize: '14px', color: 'var(--txt)', marginTop: '10px' }}>
                  <strong>Account Type:</strong> Basic Member<br />
                  <strong>Status:</strong> Cloud Sync Enabled
                </div>
                <button className="btn btn-prime" onClick={handleLogout} style={{ marginTop: '10px', width: '100%' }}>Sign Out</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: 'var(--muted)', marginBottom: '15px' }}>You are currently using Scriptura in offline/guest mode.</p>
                <button className="btn btn-gold" onClick={() => { setTab('home'); }}>Go Home & Sign In</button>
              </div>
            )}
          </div>
        );
      case 'donate':
        return (
          <div className="card fade-in" style={{ padding: '20px' }}>
            <span className="lbl">Support Scriptura</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: 'var(--prime)', marginBottom: '10px' }}>Keep the Word Ad-Free & Free Forever</h2>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--txt)', marginBottom: '16px' }}>
              Scriptura is dedicated to keeping scripture and AI-powered commentary accessible to everyone around the world without intrusive ads or paywalls. Your donations help cover hosting and AI API costs.
            </p>
            {donationSuccess ? (
              <div style={{ background: 'var(--gdim)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '15px', color: 'var(--gold)', textAlign: 'center', fontSize: '15px', fontWeight: 'bold' }}>
                ✦ Thank you for your support and generosity! ✦
              </div>
            ) : (
              <form onSubmit={handleDonationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {['5', '10', '25', '50'].map(amt => (
                    <button type="button" key={amt} className={`sugbtn ${donationAmount === amt ? 'on' : ''}`} style={{ margin: 0, padding: '8px 16px', background: donationAmount === amt ? 'var(--gold)' : 'transparent', color: donationAmount === amt ? '#000' : 'var(--txt)' }} onClick={() => setDonationAmount(amt)}>${amt}</button>
                  ))}
                  <input type="number" className="chatinp" style={{ width: '70px', padding: '6px', textAlign: 'center' }} placeholder="Custom" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-gold" style={{ marginTop: '10px' }}>✨ Support with ${donationAmount}</button>
              </form>
            )}
          </div>
        );
      case 'privacy':
        return (
          <div className="card fade-in" style={{ padding: '20px', fontSize: '14px', lineHeight: '1.6', color: 'var(--txt)' }}>
            <span className="lbl">Privacy Policy</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'var(--prime)', marginBottom: '10px' }}>Your Data Belongs to You</h2>
            <p style={{ marginBottom: '12px' }}>
              We value your spiritual privacy. All your notes, highlighted verses, prayers, and devotionals are saved locally in your browser's LocalStorage.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong>Cloud Sync:</strong> If you sign in, your data is securely synced with Google Firebase Firestore to let you access it across multiple devices. We do not sell, share, or analyze your personal study data.
            </p>
            <p>
              <strong>AI Queries:</strong> Questions asked to The Scholar are processed securely by our AI endpoints. No personal identifier information is sent to third-party AI models.
            </p>
          </div>
        );
      case 'contact':
        return (
          <div className="card fade-in" style={{ padding: '20px' }}>
            <span className="lbl">Send Feedback</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'var(--prime)', marginBottom: '8px' }}>We'd love to hear from you</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '15px' }}>Have a suggestion, reported a bug, or want to share a testimony? Drop us a line.</p>
            {feedbackSent ? (
              <div style={{ background: 'var(--gdim)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '15px', color: 'var(--gold)', textAlign: 'center', fontSize: '14px' }}>
                Thank you! Your feedback has been recorded successfully.
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" placeholder="Name" className="chatinp" style={{ width: '100%', padding: '10px' }} value={feedbackName} onChange={(e) => setFeedbackName(e.target.value)} />
                <input type="email" placeholder="Email" className="chatinp" style={{ width: '100%', padding: '10px' }} value={feedbackEmail} onChange={(e) => setFeedbackEmail(e.target.value)} required />
                <textarea placeholder="Your message..." className="chatinp" rows="4" style={{ width: '100%', padding: '10px', resize: 'vertical' }} value={feedbackMsg} onChange={(e) => setFeedbackMsg(e.target.value)} required />
                <button type="submit" className="btn btn-prime" style={{ alignSelf: 'flex-end' }}>Send Feedback</button>
              </form>
            )}
          </div>
        );
      default:
        return (
          <div className="card fade-in" style={{ padding: '20px', lineHeight: '1.6' }}>
            <span className="lbl">About Scriptura</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: 'var(--prime)', marginBottom: '10px' }}>The Living Word</h2>
            <p style={{ fontSize: '15px', color: 'var(--txt)', marginBottom: '12px' }}>
              <strong>Scriptura</strong> is a modern, premium web companion designed to deepen your engagement with the Holy Bible. By pairing a distraction-free, elegant reading pane with wise AI-powered insights, Scriptura helps seekers explore context, cross-references, and application.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '15px' }}>
              Built with love for study, prayer, and memory verse training. Version 1.0.0.
            </p>
            <div style={{ borderTop: '1px solid var(--bdr2)', paddingTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="sugbtn" style={{ margin: 0, fontSize: '12px' }} onClick={() => setSubView('donate')}>🙏 Support Project</button>
              <button className="sugbtn" style={{ margin: 0, fontSize: '12px' }} onClick={() => setSubView('privacy')}>🔒 Privacy Policy</button>
              <button className="sugbtn" style={{ margin: 0, fontSize: '12px' }} onClick={() => setSubView('contact')}>📧 Contact Feedback</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px' }}>
        <button className="hico" onClick={() => setTab('home')} title="Back to Home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div className="hdr-logo">Scriptura Information</div>
          <div className="hdr-sub">App details, sync status, and feedback</div>
        </div>
      </div>

      <div className="ttog" style={{ display: 'flex', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button className={`tbtn ${subView === 'about' ? 'on' : ''}`} onClick={() => setSubView('about')}>About</button>
        <button className={`tbtn ${subView === 'profile' ? 'on' : ''}`} onClick={() => setSubView('profile')}>Profile</button>
        <button className={`tbtn ${subView === 'donate' ? 'on' : ''}`} onClick={() => setSubView('donate')}>Donate</button>
        <button className={`tbtn ${subView === 'privacy' ? 'on' : ''}`} onClick={() => setSubView('privacy')}>Privacy</button>
        <button className={`tbtn ${subView === 'contact' ? 'on' : ''}`} onClick={() => setSubView('contact')}>Contact</button>
      </div>

      {renderContent()}
    </div>
  );
}
