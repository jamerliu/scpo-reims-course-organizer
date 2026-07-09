import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../auth/AuthContext';
import { parseSaveFile } from '../utils/saveLoad';
import coursesData from '../data/courses.json';
import '../auth/handdrawn.css';

const byId = new Map(coursesData.map((c) => [c.id, c]));

const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
const DAY_LABELS = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday' };
const GRID_START = 8 * 60, GRID_END = 21 * 60, GRID_SPAN = GRID_END - GRID_START;

function toMin(hhmm) { const [h,m] = hhmm.split(':').map(Number); return h*60+m; }
function fmtSchedule(schedule) {
  if (!schedule?.length) return '—';
  return schedule.map(s => `${DAY_LABELS[s.day]||s.day} ${s.start}–${s.end}`).join(' · ');
}

// ── Mini calendar for trade preview ─────────────────────────────────────────

function TradeCalendarPreview({ baseIds, removeId, addId }) {
  const hours = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) hours.push(m);

  const courses = baseIds
    .filter(id => id !== removeId)
    .map(id => byId.get(id)).filter(Boolean);
  if (addId) { const c = byId.get(addId); if (c) courses.push({ ...c, _added: true }); }

  const PALETTE = ['#6C63FF','#38B2AC','#E07A5F','#81B29A','#F2CC8F','#9B5DE5'];
  function colorFor(id, added) {
    if (added) return '#22c55e';
    let h = 0; for (const ch of id) h = (h*31+ch.charCodeAt(0)) % PALETTE.length;
    return PALETTE[h];
  }

  return (
    <div className="hd-preview-cal">
      <div className="hd-preview-header">
        {DAYS.map(d => <div key={d} className="hd-preview-day-head">{d}</div>)}
      </div>
      <div className="hd-preview-grid">
        <div className="hd-preview-time">
          {hours.map(m => (
            <div key={m} className="hd-preview-hour" style={{ top: `${((m-GRID_START)/GRID_SPAN)*100}%` }}>
              {String(Math.floor(m/60)).padStart(2,'0')}
            </div>
          ))}
        </div>
        {DAYS.map(day => (
          <div key={day} className="hd-preview-col">
            {hours.map(m => <div key={m} className="hd-preview-hline" style={{ top:`${((m-GRID_START)/GRID_SPAN)*100}%` }} />)}
            {courses.flatMap(c =>
              (c.schedule||[]).filter(s=>s.day===day).map((s,i) => {
                const top = ((Math.max(toMin(s.start),GRID_START)-GRID_START)/GRID_SPAN)*100;
                const ht  = Math.max(((Math.min(toMin(s.end),GRID_END)-Math.max(toMin(s.start),GRID_START))/GRID_SPAN)*100, 1.5);
                return (
                  <div key={`${c.id}-${i}`} className={`hd-preview-block ${c._added ? 'added' : ''}`}
                    style={{ top:`${top}%`, height:`${ht}%`, background: colorFor(c.id, c._added) }}
                    title={c.title}>
                    <span>{c.title}</span>
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── New Posting Form ─────────────────────────────────────────────────────────

function NewPostingForm({ profile, scheduleIds, onDone, onClose }) {
  const [offeredId,    setOfferedId]    = useState('');
  const [requestedIds, setRequestedIds] = useState([]);
  const [requestSearch, setRequestSearch] = useState('');
  const [note,         setNote]         = useState('');
  const [expiryDays,   setExpiryDays]   = useState(2);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  // Courses in the user's schedule (non-lecture) = things they can offer
  const offerableCourses = useMemo(() =>
    scheduleIds.map(id => byId.get(id)).filter(Boolean),
    [scheduleIds]
  );

  // All courses for requesting (search)
  const requestPool = useMemo(() => {
    const q = requestSearch.toLowerCase();
    if (!q) return [];
    return coursesData.filter(c =>
      !scheduleIds.includes(c.id) &&
      c.schedule?.length > 0 &&
      (c.title?.toLowerCase().includes(q) || c.codeMatiere?.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [requestSearch, scheduleIds]);

  async function submit() {
    if (!offeredId || requestedIds.length === 0) {
      setError('Please select an offered course and at least one requested course.');
      return;
    }
    const offered = byId.get(offeredId);
    if (!offered) return;
    setSaving(true);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('postings').insert({
      user_id:          profile.id,
      offered_id:       offered.id,
      offered_title:    offered.title,
      offered_code:     offered.codeMatiere || '',
      offered_schedule: offered.schedule || [],
      requested_ids:    requestedIds,
      requested_titles: requestedIds.map(id => byId.get(id)?.title || id),
      requested_codes:  requestedIds.map(id => byId.get(id)?.codeMatiere || ''),
      note:             note.trim() || null,
      expires_at:       expiresAt,
      poster_grade:     profile.grade,
      poster_program:   profile.program_key,
    });
    setSaving(false);
    if (error) setError(error.message);
    else onDone();
  }

  return (
    <div className="hd-modal-backdrop" onClick={onClose}>
      <div className="hd-modal-card" onClick={e => e.stopPropagation()}>
        <div className="hd-tape hd-tape-top" />
        <span className="hd-corner hd-corner-tl"/><span className="hd-corner hd-corner-tr"/>
        <span className="hd-corner hd-corner-bl"/><span className="hd-corner hd-corner-br"/>
        <button className="hd-modal-close" onClick={onClose}>✕</button>

        <h2 className="hd-title" style={{ fontSize: 24, marginBottom: 20 }}>📌 New posting</h2>

        <label className="hd-label">Course I'm offering (from my schedule)</label>
        <div className="hd-course-pick-list">
          {offerableCourses.length === 0 && (
            <p className="hd-body-text" style={{color:'#999'}}>No courses in your schedule yet. Upload your schedule JSON first.</p>
          )}
          {offerableCourses.map(c => (
            <button key={c.id} type="button"
              className={`hd-course-pick-item ${offeredId === c.id ? 'selected' : ''}`}
              onClick={() => setOfferedId(c.id === offeredId ? '' : c.id)}>
              <span className="hd-cpick-title">{c.title}</span>
              <span className="hd-cpick-meta">{fmtSchedule(c.schedule)} · {c.codeMatiere}</span>
            </button>
          ))}
        </div>

        <label className="hd-label" style={{marginTop:16}}>Courses I'd accept in return (search)</label>
        <input className="hd-input" placeholder="Search by title or code…"
          value={requestSearch} onChange={e => setRequestSearch(e.target.value)} />

        {requestedIds.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, margin:'8px 0' }}>
            {requestedIds.map(id => {
              const c = byId.get(id);
              return (
                <span key={id} className="hd-req-chip">
                  {c?.title || id}
                  <button onClick={() => setRequestedIds(p => p.filter(x=>x!==id))}>✕</button>
                </span>
              );
            })}
          </div>
        )}

        {requestPool.length > 0 && (
          <div className="hd-course-pick-list" style={{ maxHeight: 180 }}>
            {requestPool.map(c => {
              const already = requestedIds.includes(c.id);
              return (
                <button key={c.id} type="button"
                  className={`hd-course-pick-item ${already ? 'selected' : ''}`}
                  onClick={() => setRequestedIds(p => already ? p.filter(x=>x!==c.id) : [...p, c.id])}>
                  <span className="hd-cpick-title">{c.title}</span>
                  <span className="hd-cpick-meta">{fmtSchedule(c.schedule)} · {c.codeMatiere}</span>
                </button>
              );
            })}
          </div>
        )}

        <label className="hd-label" style={{marginTop:16}}>Note (optional)</label>
        <textarea className="hd-input" rows={2} placeholder="Any context for the trade…"
          value={note} onChange={e => setNote(e.target.value)} style={{resize:'vertical'}} />

        <label className="hd-label" style={{marginTop:12}}>Post expires in</label>
        <div style={{ display:'flex', gap:8 }}>
          {[1,2,3].map(d => (
            <button key={d} type="button"
              className={`hd-btn ${expiryDays===d ? 'hd-btn-primary' : 'hd-btn-secondary'}`}
              style={{ flex:1 }}
              onClick={() => setExpiryDays(d)}>
              {d} day{d>1?'s':''}
            </button>
          ))}
        </div>

        {error && <p className="hd-error" style={{marginTop:10}}>{error}</p>}
        <button className="hd-btn hd-btn-primary" style={{marginTop:16, width:'100%'}}
          disabled={saving} onClick={submit}>
          {saving ? 'Posting…' : '📌 Post to marketplace'}
        </button>
      </div>
    </div>
  );
}

// ── Posting Card ─────────────────────────────────────────────────────────────

function PostingCard({ posting, myScheduleIds, onTradeClick }) {
  const [hover, setHover] = useState(false);

  // Eligibility: does offered course match something I want?
  const iWantOffered = myScheduleIds && posting.requested_ids?.some(id => myScheduleIds.includes(id)) === false
    ? false : false; // simplified: green if both sides match

  // Green: they offer what I might want AND request what I have
  const myIds = new Set(myScheduleIds || []);
  const theyOfferWhatIHave = myIds.has(posting.offered_id);           // they want to give what I currently have
  // actually: green = I have what they want AND they offer what I might want
  const iHaveWhatTheyWant  = posting.requested_ids?.some(id => myIds.has(id));
  const theyOfferCourseILiked = true; // simplify — could be any course

  let eligibility = 'none';
  if (iHaveWhatTheyWant) eligibility = 'yellow'; // I have something they want
  // Full green would require knowing what courses I want — use schedule as proxy

  const cardClass = `hd-posting-card ${eligibility === 'green' ? 'eligible' : eligibility === 'yellow' ? 'partial' : ''}`;
  const expiresIn = Math.ceil((new Date(posting.expires_at) - Date.now()) / (1000*60*60));
  const expiresStr = expiresIn < 24 ? `${expiresIn}h` : `${Math.ceil(expiresIn/24)}d`;

  return (
    <div className={cardClass} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {iHaveWhatTheyWant && <div className="hd-card-badge">🟡 You have what they want</div>}
      <div className="hd-card-header">
        <span className="hd-card-poster">{posting.profiles?.full_name || 'Student'}</span>
        <span className="hd-card-expiry">⏱ {expiresStr}</span>
      </div>

      <div className="hd-card-exchange">
        <div className="hd-card-offering">
          <span className="hd-exchange-label">Offering</span>
          <span className="hd-exchange-title">{posting.offered_title}</span>
          <span className="hd-exchange-meta">{fmtSchedule(posting.offered_schedule)}</span>
          <span className="hd-exchange-code">{posting.offered_code}</span>
        </div>
        <div className="hd-exchange-arrow">⇄</div>
        <div className="hd-card-requesting">
          <span className="hd-exchange-label">Wants</span>
          {posting.requested_titles?.map((title, i) => (
            <span key={i} className="hd-exchange-req-item">{title}</span>
          ))}
        </div>
      </div>

      {posting.note && <p className="hd-card-note">"{posting.note}"</p>}

      <button className="hd-btn hd-btn-primary hd-card-trade-btn" onClick={() => onTradeClick(posting)}>
        Trade →
      </button>
    </div>
  );
}

// ── Trade Detail Modal ────────────────────────────────────────────────────────

function TradeModal({ posting, myScheduleIds, onClose }) {
  const [showContact, setShowContact] = useState(false);
  const [poster, setPoster] = useState(null);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', posting.user_id).single()
      .then(({ data }) => setPoster(data));
  }, [posting.user_id]);

  return (
    <div className="hd-modal-backdrop" onClick={onClose}>
      <div className="hd-modal-card hd-trade-modal" onClick={e => e.stopPropagation()}>
        <div className="hd-tape hd-tape-top" style={{ background: 'rgba(255,200,0,0.35)' }} />
        <span className="hd-corner hd-corner-tl"/><span className="hd-corner hd-corner-tr"/>
        <span className="hd-corner hd-corner-bl"/><span className="hd-corner hd-corner-br"/>
        <button className="hd-modal-close" onClick={onClose}>✕</button>

        <h2 className="hd-title" style={{ fontSize: 22, marginBottom: 4 }}>Trade details</h2>
        <p className="hd-body-text" style={{ color:'#888', marginBottom: 18 }}>
          Posted by <strong>{poster?.full_name || '…'}</strong> · {poster?.grade} · {poster?.program_label}
          {poster?.majeure && ` · ${poster.majeure}`}
        </p>

        <div className="hd-trade-split">
          <div className="hd-trade-side">
            <h3 className="hd-label">They offer</h3>
            <div className="hd-trade-course-box">
              <strong>{posting.offered_title}</strong>
              <span>{posting.offered_code}</span>
              <span>{fmtSchedule(posting.offered_schedule)}</span>
            </div>
          </div>
          <div className="hd-exchange-arrow" style={{ fontSize: 28 }}>⇄</div>
          <div className="hd-trade-side">
            <h3 className="hd-label">They want (any of)</h3>
            {posting.requested_titles?.map((t, i) => (
              <div key={i} className="hd-trade-course-box" style={{ marginBottom: 6 }}>
                <strong>{t}</strong>
                <span>{posting.requested_codes?.[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {posting.note && (
          <div className="hd-trade-note-box">
            <span style={{ fontSize: 18 }}>💬</span>
            <p className="hd-body-text">"{posting.note}"</p>
          </div>
        )}

        <h3 className="hd-label" style={{ marginTop: 18 }}>Calendar preview after trade</h3>
        <p className="hd-body-text" style={{ color:'#888', fontSize:13, marginBottom:8 }}>
          Your schedule with their course added (green) and the traded course removed.
        </p>
        <TradeCalendarPreview
          baseIds={myScheduleIds}
          removeId={posting.requested_ids?.find(id => myScheduleIds.includes(id)) || null}
          addId={posting.offered_id}
        />

        {!showContact ? (
          <button className="hd-btn hd-btn-primary" style={{ marginTop: 20, width: '100%' }}
            onClick={() => setShowContact(true)}>
            ✉️ I want to trade — show contact info
          </button>
        ) : (
          <div className="hd-contact-box">
            <h3 className="hd-label">Contact {poster?.full_name}</h3>
            <div className="hd-contact-row">
              <span>📧</span>
              <a href={`mailto:${poster?.email}`}>{poster?.email}</a>
            </div>
            {poster?.whatsapp && (
              <div className="hd-contact-row">
                <span>📱</span>
                <span>{poster.whatsapp}</span>
              </div>
            )}
            {poster?.instagram && (
              <div className="hd-contact-row">
                <span>📷</span>
                <a href={`https://instagram.com/${poster.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer">
                  {poster.instagram}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Marketplace Page ─────────────────────────────────────────────────────

export default function MarketplacePage({ onBack }) {
  const { profile, updateProfile, signOut } = useAuth();
  const [postings,    setPostings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterCode,  setFilterCode]  = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [tradePosting,setTradePosting]= useState(null);
  const [myScheduleIds, setMyScheduleIds] = useState(profile?.schedule_json?.addedCourseIds || []);
  const fileRef = useRef(null);

  useEffect(() => { fetchPostings(); }, [profile?.grade]);

  async function fetchPostings() {
    if (!profile?.grade) return;
    setLoading(true);
    const { data } = await supabase
      .from('postings')
      .select('*, profiles(full_name, grade, program_label, majeure)')
      .eq('poster_grade', profile.grade)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    setPostings(data || []);
    setLoading(false);
  }

  function handleScheduleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = parseSaveFile(ev.target.result);
      if (!raw) return;
      const ids = raw.addedCourseIds || [];
      setMyScheduleIds(ids);
      // Sync to profile
      await updateProfile({ schedule_json: raw });
    };
    reader.readAsText(file);
  }

  // Sort: yellow cards (partial match) first, then others
  const sortedPostings = useMemo(() => {
    const myIds = new Set(myScheduleIds);
    return [...postings]
      .filter(p => {
        if (search) {
          const q = search.toLowerCase();
          if (!p.offered_title?.toLowerCase().includes(q) &&
              !p.requested_titles?.some(t => t.toLowerCase().includes(q))) return false;
        }
        if (filterCode && p.offered_code !== filterCode &&
            !p.requested_codes?.includes(filterCode)) return false;
        return true;
      })
      .map(p => ({
        ...p,
        _iHaveWhatTheyWant: p.requested_ids?.some(id => myIds.has(id)),
      }))
      .sort((a, b) => {
        if (a._iHaveWhatTheyWant && !b._iHaveWhatTheyWant) return -1;
        if (!a._iHaveWhatTheyWant && b._iHaveWhatTheyWant) return 1;
        return 0;
      });
  }, [postings, search, filterCode, myScheduleIds, profile?.id]);

  const myPostings = postings.filter(p => p.user_id === profile?.id);

  // Unique codes for filter dropdown
  const allCodes = useMemo(() => [...new Set(postings.flatMap(p => [p.offered_code, ...(p.requested_codes||[])]).filter(Boolean))].sort(), [postings]);

  return (
    <div className="hd-root hd-marketplace">
      {/* Header */}
      <div className="hd-market-header">
        <button className="hd-btn hd-btn-secondary hd-back-btn" onClick={onBack}>← Planner</button>
        <h1 className="hd-title hd-market-title">📋 Course Marketplace</h1>
        <div className="hd-market-header-right">
          <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={handleScheduleUpload} />
          <button className="hd-btn hd-btn-secondary" onClick={() => fileRef.current?.click()}>
            📂 {myScheduleIds.length > 0 ? `Schedule loaded (${myScheduleIds.length})` : 'Load my schedule'}
          </button>
          <button className="hd-btn hd-btn-secondary" onClick={signOut} style={{ fontSize: 13 }}>
            ↩ Sign out
          </button>
          <button className="hd-btn hd-btn-primary" onClick={() => setShowNewForm(true)}>
            + New posting
          </button>
        </div>
      </div>

      {/* My postings strip */}
      {myPostings.length > 0 && (
        <div className="hd-my-postings">
          <span className="hd-label" style={{marginRight:12}}>My active postings:</span>
          {myPostings.map(p => (
            <div key={p.id} className="hd-my-posting-chip">
              <span>{p.offered_title}</span>
              <button onClick={async () => {
                await supabase.from('postings').delete().eq('id', p.id);
                fetchPostings();
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="hd-market-filters">
        <input className="hd-input hd-filter-search" placeholder="🔍 Search courses…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="hd-input hd-filter-select" value={filterCode} onChange={e => setFilterCode(e.target.value)}>
          <option value="">All course codes</option>
          {allCodes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="hd-body-text" style={{ color:'#888', whiteSpace:'nowrap' }}>
          {sortedPostings.length} posting{sortedPostings.length !== 1 ? 's' : ''}
          {profile?.grade && ` · ${profile.grade} students`}
        </span>
      </div>

      {/* Legend */}
      <div className="hd-legend">
        <span className="hd-legend-dot yellow" /> You have a course they want
        <span className="hd-legend-dot none" style={{marginLeft:16}} /> Other postings
      </div>

      {/* Grid */}
      {loading ? (
        <div className="hd-loading">Loading postings…</div>
      ) : sortedPostings.length === 0 ? (
        <div className="hd-empty-state">
          <div style={{fontSize:48, marginBottom:12}}>📭</div>
          <h2 className="hd-title" style={{fontSize:22}}>No postings yet</h2>
          <p className="hd-body-text" style={{color:'#888'}}>Be the first to post a trade for your {profile?.grade} cohort.</p>
        </div>
      ) : (
        <div className="hd-postings-grid">
          {sortedPostings.map(p => (
            <PostingCard
              key={p.id}
              posting={p}
              myScheduleIds={myScheduleIds}
              onTradeClick={setTradePosting}
            />
          ))}
        </div>
      )}

      {showNewForm && (
        <NewPostingForm
          profile={profile}
          scheduleIds={myScheduleIds}
          onDone={() => { setShowNewForm(false); fetchPostings(); }}
          onClose={() => setShowNewForm(false)}
        />
      )}

      {tradePosting && (
        <TradeModal
          posting={tradePosting}
          myScheduleIds={myScheduleIds}
          onClose={() => setTradePosting(null)}
        />
      )}
    </div>
  );
}
