import { useState } from 'react';
import { supabase } from '../utils/supabase';
import './handdrawn.css';

export default function LoginScreen() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    if (!email.endsWith('@sciencespo.fr')) {
      setError('Only @sciencespo.fr email addresses are allowed.');
      return;
    }
    setLoading(true);
    const result = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    console.log('Supabase OTP result:', JSON.stringify(result, null, 2));
    const { error } = result;
    setLoading(false);
    if (error) {
      setError(error.message || error.error_description || JSON.stringify(error) || 'Something went wrong. Check your Supabase email settings.');
    } else {
      setSent(true);
    }
  }

  return (
    <div className="hd-root">
      <div className="hd-login-wrap">
        {/* Decorative tape */}
        <div className="hd-tape hd-tape-top" />

        <div className="hd-login-card">
          {/* Corner marks */}
          <span className="hd-corner hd-corner-tl" />
          <span className="hd-corner hd-corner-tr" />
          <span className="hd-corner hd-corner-bl" />
          <span className="hd-corner hd-corner-br" />

          <h1 className="hd-title">Course Planner<br /><span className="hd-title-sub">Sciences Po Reims</span></h1>
          <p className="hd-body-text" style={{ marginBottom: 24, textAlign: 'center', color: '#666' }}>
            Sign in with your <strong>@sciencespo.fr</strong> email.<br />
            We'll send you a magic link — no password needed.
          </p>

          {sent ? (
            <div className="hd-sent-box">
              <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
              <p className="hd-body-text" style={{ textAlign: 'center' }}>
                Magic link sent to <strong>{email}</strong>.<br />
                Check your inbox and click the link to log in.
              </p>
              <button className="hd-btn hd-btn-secondary" style={{ marginTop: 16 }} onClick={() => setSent(false)}>
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className="hd-label">Sciences Po email</label>
              <input
                className="hd-input"
                type="email"
                placeholder="yourname@sciencespo.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="hd-error">{error}</p>}
              <button className="hd-btn hd-btn-primary" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send magic link ✉️'}
              </button>
            </form>
          )}
        </div>

        <p className="hd-body-text" style={{ textAlign: 'center', marginTop: 20, color: '#999', fontSize: 13 }}>
          Made by James Liu · @jamerliu
        </p>
      </div>
    </div>
  );
}
