import { useState } from 'react';
import { supabase } from '../utils/supabase';
import './handdrawn.css';

// Three views: 'signin' | 'register' | 'forgot'
export default function LoginScreen() {
  const [view, setView] = useState('signin');

  return (
    <div className="hd-root">
      <div className="hd-login-wrap">
        <div className="hd-tape hd-tape-top" />
        <div className="hd-login-card">
          <span className="hd-corner hd-corner-tl" /><span className="hd-corner hd-corner-tr" />
          <span className="hd-corner hd-corner-bl" /><span className="hd-corner hd-corner-br" />
          <h1 className="hd-title" style={{ fontSize: 28, textAlign: 'center', marginBottom: 4 }}>
            Sciences Po Reims
          </h1>
          <p className="hd-body-text" style={{ textAlign: 'center', color: '#888', marginBottom: 24, fontSize: 13 }}>
            Course Planner · @sciencespo.fr only
          </p>

          {view === 'signin'   && <SignIn   onRegister={() => setView('register')} onForgot={() => setView('forgot')} />}
          {view === 'register' && <Register onBack={() => setView('signin')} />}
          {view === 'forgot'   && <ForgotPassword onBack={() => setView('signin')} />}
        </div>
        <p className="hd-body-text" style={{ textAlign:'center', marginTop:18, color:'#bbb', fontSize:12 }}>
          Made by James Liu · @jamerliu
        </p>
      </div>
    </div>
  );
}

/* ── Sign In ─────────────────────────────────────────────────── */
function SignIn({ onRegister, onForgot }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@sciencespo.fr')) {
      setError('Only @sciencespo.fr email addresses are allowed.'); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <label className="hd-label">Email</label>
      <input className="hd-input" type="email" placeholder="yourname@sciencespo.fr"
        value={email} onChange={e => setEmail(e.target.value)} required />

      <label className="hd-label">Password</label>
      <input className="hd-input" type="password" placeholder="••••••••"
        value={password} onChange={e => setPassword(e.target.value)} required />

      {error && <p className="hd-error">{error}</p>}

      <button className="hd-btn hd-btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? 'Signing in…' : 'Sign in →'}
      </button>

      <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8 }}>
        <button type="button" className="hd-text-btn" onClick={onForgot}>
          Forgot password?
        </button>
        <button type="button" className="hd-text-btn" onClick={onRegister}>
          No account? Register →
        </button>
      </div>
    </form>
  );
}

/* ── Register ────────────────────────────────────────────────── */
function Register({ onBack }) {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [sent,      setSent]      = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@sciencespo.fr')) {
      setError('Only @sciencespo.fr email addresses are allowed.'); return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }
    if (password !== password2) {
      setError('Passwords don\'t match.'); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) return (
    <div className="hd-sent-box">
      <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
      <p className="hd-body-text" style={{ textAlign:'center' }}>
        Verification email sent to <strong>{email}</strong>.<br />
        Click the link to confirm your account — you'll never need to do this again.
      </p>
      <button className="hd-btn hd-btn-secondary" style={{ marginTop:14 }} onClick={onBack}>
        ← Back to sign in
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <label className="hd-label">Sciences Po email</label>
      <input className="hd-input" type="email" placeholder="yourname@sciencespo.fr"
        value={email} onChange={e => setEmail(e.target.value)} required />

      <label className="hd-label">Password <span style={{ color:'#aaa', fontSize:12 }}>(min. 8 characters)</span></label>
      <input className="hd-input" type="password" placeholder="Create a password"
        value={password} onChange={e => setPassword(e.target.value)} required />

      <label className="hd-label">Confirm password</label>
      <input className="hd-input" type="password" placeholder="Repeat password"
        value={password2} onChange={e => setPassword2(e.target.value)} required />

      {error && <p className="hd-error">{error}</p>}

      <button className="hd-btn hd-btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? 'Creating account…' : 'Create account →'}
      </button>

      <button type="button" className="hd-text-btn" style={{ marginTop:6 }} onClick={onBack}>
        ← Already have an account
      </button>
    </form>
  );
}

/* ── Forgot Password ─────────────────────────────────────────── */
function ForgotPassword({ onBack }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@sciencespo.fr')) {
      setError('Only @sciencespo.fr email addresses are allowed.'); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=true`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) return (
    <div className="hd-sent-box">
      <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
      <p className="hd-body-text" style={{ textAlign:'center' }}>
        Password reset email sent to <strong>{email}</strong>.<br />
        Click the link in the email to set a new password.
      </p>
      <button className="hd-btn hd-btn-secondary" style={{ marginTop:14 }} onClick={onBack}>
        ← Back to sign in
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <p className="hd-body-text" style={{ color:'#666', marginBottom:4 }}>
        Enter your email and we'll send a reset link.
      </p>
      <label className="hd-label">Sciences Po email</label>
      <input className="hd-input" type="email" placeholder="yourname@sciencespo.fr"
        value={email} onChange={e => setEmail(e.target.value)} required />

      {error && <p className="hd-error">{error}</p>}

      <button className="hd-btn hd-btn-primary" type="submit" disabled={loading} style={{ marginTop:4 }}>
        {loading ? 'Sending…' : 'Send reset link ✉️'}
      </button>
      <button type="button" className="hd-text-btn" style={{ marginTop:6 }} onClick={onBack}>
        ← Back to sign in
      </button>
    </form>
  );
}
