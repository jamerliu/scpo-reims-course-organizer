import { useState } from 'react';
import { supabase } from '../utils/supabase';
import './handdrawn.css';

export default function ResetPasswordScreen() {
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [done,      setDone]      = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== password2) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  return (
    <div className="hd-root">
      <div className="hd-login-wrap">
        <div className="hd-tape hd-tape-top" />
        <div className="hd-login-card">
          <span className="hd-corner hd-corner-tl" /><span className="hd-corner hd-corner-tr" />
          <span className="hd-corner hd-corner-bl" /><span className="hd-corner hd-corner-br" />

          <h1 className="hd-title" style={{ fontSize: 26, textAlign:'center', marginBottom: 20 }}>
            Set new password
          </h1>

          {done ? (
            <div className="hd-sent-box">
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <p className="hd-body-text" style={{ textAlign:'center' }}>
                Password updated! Redirecting you to the app…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <label className="hd-label">New password <span style={{ color:'#aaa', fontSize:12 }}>(min. 8 characters)</span></label>
              <input className="hd-input" type="password" placeholder="New password"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <label className="hd-label">Confirm new password</label>
              <input className="hd-input" type="password" placeholder="Repeat password"
                value={password2} onChange={e => setPassword2(e.target.value)} required />
              {error && <p className="hd-error">{error}</p>}
              <button className="hd-btn hd-btn-primary" type="submit" disabled={loading} style={{ marginTop:6 }}>
                {loading ? 'Updating…' : 'Update password →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
