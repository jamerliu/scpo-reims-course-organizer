import { useAuth } from './AuthContext';
import './handdrawn.css';

export default function HomeScreen({ onPlanner, onMarketplace }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="hd-root hd-home">
      {/* Header bar */}
      <div className="hd-home-header">
        <div className="hd-home-header-left">
          <h1 className="hd-title" style={{ fontSize: 22, margin: 0 }}>
            Sciences Po Reims
          </h1>
          <span className="hd-body-text" style={{ color: '#888', fontSize: 13 }}>
            Course Planner
          </span>
        </div>
        <div className="hd-home-header-right">
          <span className="hd-body-text" style={{ color: '#666', fontSize: 13 }}>
            👤 {profile?.full_name} · {profile?.grade}
            {profile?.majeure ? ` · ${profile.majeure.replace('Majeure ', '')}` : ''}
          </span>
          <button className="hd-btn hd-btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="hd-home-hero">
        <h2 className="hd-title" style={{ fontSize: 42, textAlign: 'center', marginBottom: 8 }}>
          What are you working on?
        </h2>
        <p className="hd-body-text" style={{ textAlign: 'center', color: '#888', fontSize: 16 }}>
          Pick a tool below to get started.
        </p>
      </div>

      {/* Cards */}
      <div className="hd-home-cards">

        {/* Planner card */}
        <button className="hd-home-card hd-home-card-planner" onClick={onPlanner}>
          <div className="hd-tape" style={{ top: -14, left: 40, transform: 'rotate(-2deg)' }} />
          <span className="hd-corner hd-corner-tl" />
          <span className="hd-corner hd-corner-tr" />
          <span className="hd-corner hd-corner-bl" />
          <span className="hd-corner hd-corner-br" />

          <div className="hd-home-card-icon">📅</div>
          <h3 className="hd-title" style={{ fontSize: 26, marginBottom: 8 }}>Course Planner</h3>
          <p className="hd-body-text" style={{ color: '#555', marginBottom: 20, lineHeight: 1.5 }}>
            Build your semester schedule. Browse courses by requirement, drag to calendar, 
            track fulfillment, compare options, and export a PDF report.
          </p>
          <div className="hd-home-card-features">
            <span>✓ Drag-and-drop calendar</span>
            <span>✓ Requirement tracker</span>
            <span>✓ Schedule comparison</span>
            <span>✓ Registration mode</span>
            <span>✓ PDF export</span>
            <span>✓ Save &amp; load</span>
          </div>
          <div className="hd-home-card-cta">
            Open Planner →
          </div>
        </button>

        {/* Marketplace card */}
        <button className="hd-home-card hd-home-card-market" onClick={onMarketplace}>
          <div className="hd-tape" style={{ top: -14, right: 40, transform: 'rotate(1.5deg)', background: 'rgba(255,200,0,0.4)' }} />
          <span className="hd-corner hd-corner-tl" />
          <span className="hd-corner hd-corner-tr" />
          <span className="hd-corner hd-corner-bl" />
          <span className="hd-corner hd-corner-br" />

          <div className="hd-home-card-icon">🛒</div>
          <h3 className="hd-title" style={{ fontSize: 26, marginBottom: 8 }}>Course Marketplace</h3>
          <p className="hd-body-text" style={{ color: '#555', marginBottom: 20, lineHeight: 1.5 }}>
            Trade course slots with other students in your cohort.
            Post what you're offering and what you want in return.
          </p>
          <div className="hd-home-card-features">
            <span>✓ Trade with your cohort</span>
            <span>✓ Smart trade matching</span>
            <span>✓ Calendar preview</span>
            <span>✓ Contact after match</span>
            <span>✓ Auto-expires 1–3 days</span>
            <span>✓ Search &amp; filter</span>
          </div>
          <div className="hd-home-card-cta hd-home-card-cta-market">
            Open Marketplace →
          </div>
        </button>

      </div>

      {/* Footer */}
      <p className="hd-body-text" style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 40, paddingBottom: 40 }}>
        Made by James Liu ·{' '}
        <a href="https://www.instagram.com/jamerliu/" target="_blank" rel="noopener noreferrer"
          style={{ color: '#bbb', textDecoration: 'none' }}>@jamerliu</a>
      </p>
    </div>
  );
}
