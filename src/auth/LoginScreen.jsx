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

async function handleGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
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
      <button type="button" className="hd-btn hd-btn-google" onClick={handleGoogle}>
        <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink:0 }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Sign in with Google
      </button>

      <div className="hd-import-divider">— or sign in with email —</div>

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

      <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8, flexWrap:'wrap', gap:6 }}>
        <button type="button" className="hd-text-btn" onClick={onForgot}>
          Forgot password? · Previously logged in with a magic link? Click here to set your password.
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
