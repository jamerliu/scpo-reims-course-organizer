import { useState } from 'react';
import { useAuth } from './AuthContext';
import { GRADE_PROGRAMS } from '../data/programMap';
import { MAJEURE_OPTIONS, MINEURE_OPTIONS } from '../data/requirements';
import './handdrawn.css';

const PROGRAM_LABELS = {
  '1A_NA':        'North America Minor',
  '1A_AFRICA_EN': 'Africa Minor — English Track',
  '1A_AFRICA_FR': 'Africa Minor — French Track (METIS)',
  '2A_NA':        'North America Minor',
  '2A_AFRICA_EN': 'Africa Minor — English Track',
  '2A_AFRICA_FR': 'Africa Minor — French Track (METIS)',
};

export default function ProfileOnboarding() {
  const { updateProfile, userEmail } = useAuth();
  const [step, setStep]       = useState(1); // 1 = basic, 2 = program, 3 = contact
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    full_name:    '',
    grade:        '',
    program_key:  '',
    program_label: '',
    majeure:      '',
    mineure:      '',
    whatsapp:     '',
    instagram:    '',
  });

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })); }

  const programs = form.grade ? GRADE_PROGRAMS[form.grade] || [] : [];
  const is2A = form.grade === '2A';
  const majeureOptions = is2A && form.program_key ? MAJEURE_OPTIONS[form.program_key] || [] : [];
  const mineureOptions = is2A && form.program_key ? MINEURE_OPTIONS[form.program_key] || [] : [];

  const step1Valid = form.full_name.trim().length > 1;
  const step2Valid = form.grade && form.program_key && (!is2A || (form.majeure && form.mineure));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error } = await updateProfile({
      full_name:     form.full_name.trim(),
      email:         userEmail,
      grade:         form.grade,
      program_key:   form.program_key,
      program_label: form.program_label,
      majeure:       form.majeure || null,
      mineure:       form.mineure || null,
      whatsapp:      form.whatsapp.trim() || null,
      instagram:     form.instagram.trim() || null,
    });
    setSaving(false);
    if (error) setError(error.message);
  }

  return (
    <div className="hd-root">
      <div className="hd-login-wrap">
        <div className="hd-tape hd-tape-top" />
        <div className="hd-login-card" style={{ maxWidth: 520 }}>
          <span className="hd-corner hd-corner-tl" /><span className="hd-corner hd-corner-tr" />
          <span className="hd-corner hd-corner-bl" /><span className="hd-corner hd-corner-br" />

          <h1 className="hd-title" style={{ fontSize: 28, marginBottom: 4 }}>Set up your profile</h1>
          <p className="hd-body-text" style={{ color: '#888', marginBottom: 24, textAlign:'center' }}>
            This is shown on your marketplace postings.
          </p>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {[1,2,3].map((n) => (
              <div key={n} className={`hd-step-dot ${step === n ? 'active' : step > n ? 'done' : ''}`}>
                {step > n ? '✓' : n}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {step === 1 && (
              <>
                <label className="hd-label">Full name</label>
                <input className="hd-input" placeholder="Jean Dupont" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
                <label className="hd-label">Email (confirmed)</label>
                <input className="hd-input" value={userEmail} disabled style={{ opacity: 0.6 }} />
                <button type="button" className="hd-btn hd-btn-primary" disabled={!step1Valid} onClick={() => setStep(2)}>
                  Next →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <label className="hd-label">Year</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['1A','2A'].map((g) => (
                    <button key={g} type="button"
                      className={`hd-btn ${form.grade === g ? 'hd-btn-primary' : 'hd-btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => { set('grade', g); set('program_key',''); set('program_label',''); set('majeure',''); set('mineure',''); }}>
                      {g}
                    </button>
                  ))}
                </div>

                {form.grade && (
                  <>
                    <label className="hd-label">Program / Minor</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {programs.map((p) => (
                        <button key={p.key} type="button"
                          className={`hd-btn ${form.program_key === p.key ? 'hd-btn-primary' : 'hd-btn-secondary'}`}
                          style={{ textAlign: 'left' }}
                          onClick={() => { set('program_key', p.key); set('program_label', p.label); set('majeure',''); set('mineure',''); }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {is2A && form.program_key && (
                  <>
                    <label className="hd-label">Majeure</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {majeureOptions.map((o) => (
                        <button key={o.label} type="button"
                          className={`hd-btn ${form.majeure === o.label ? 'hd-btn-primary' : 'hd-btn-secondary'}`}
                          style={{ textAlign: 'left', fontSize: 13 }}
                          onClick={() => set('majeure', o.label)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <label className="hd-label">Mineure</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {mineureOptions.map((o) => (
                        <button key={o.label} type="button"
                          className={`hd-btn ${form.mineure === o.label ? 'hd-btn-primary' : 'hd-btn-secondary'}`}
                          style={{ textAlign: 'left', fontSize: 13 }}
                          onClick={() => set('mineure', o.label)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="hd-btn hd-btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
                  <button type="button" className="hd-btn hd-btn-primary" style={{ flex: 2 }} disabled={!step2Valid} onClick={() => setStep(3)}>Next →</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="hd-body-text" style={{ color: '#666', fontSize: 13 }}>
                  Optional — shown to trading partners only after they click Trade.
                </p>
                <label className="hd-label">WhatsApp number (optional)</label>
                <input className="hd-input" placeholder="+33 6 00 00 00 00" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
                <label className="hd-label">Instagram handle (optional)</label>
                <input className="hd-input" placeholder="@yourhandle" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} />
                {error && <p className="hd-error">{error}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="hd-btn hd-btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
                  <button type="submit" className="hd-btn hd-btn-primary" style={{ flex: 2 }} disabled={saving}>
                    {saving ? 'Saving…' : 'Finish ✓'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
