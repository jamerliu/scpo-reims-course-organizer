import { useState, useMemo, useCallback } from 'react';
import { useLang } from '../i18n/LangContext';
import { generateSchedules } from '../utils/optimizerEngine';
import { isLecture } from '../utils/lectureGuard';
import { formatSchedule } from '../utils/schedule';
import { ConfoscopeTag } from './Modal';
import coursesData from '../data/courses.json';
import { REQUIREMENTS } from '../data/requirements';
import { PROGRAM_COURSE_GROUPS } from '../data/programMap';

const byId = new Map(coursesData.map((c) => [c.id, c]));

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABEL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };

const TIME_PRESETS = [
  { label: 'Before 10:00',          labelFr: 'Avant 10h00',           start: '08:00', end: '10:00' },
  { label: '10:00–12:20',           labelFr: '10h00–12h20',           start: '10:00', end: '12:20' },
  { label: 'Lunch (12:00–14:00)',   labelFr: 'Déjeuner (12h–14h)',    start: '12:00', end: '14:00' },
  { label: '14:00–17:00',           labelFr: '14h00–17h00',           start: '14:00', end: '17:00' },
  { label: '17:00–19:00',           labelFr: '17h00–19h00',           start: '17:00', end: '19:00' },
  { label: 'Evening (after 19:00)', labelFr: 'Soir (après 19h00)',    start: '19:00', end: '21:00' },
];

const GRID_START = 8 * 60, GRID_END = 21 * 60, GRID_SPAN = GRID_END - GRID_START;
const DAYS = ['Mon','Tue','Wed','Thu','Fri'];

function toMin(hhmm) { const [h,m] = hhmm.split(':').map(Number); return h*60+m; }

const PALETTE = ['#6C63FF','#38B2AC','#E07A5F','#81B29A','#F2CC8F','#9B5DE5','#00BBF9','#F15BB5'];
function colorFor(id) { let h=0; for (const ch of id) h=(h*31+ch.charCodeAt(0))%PALETTE.length; return PALETTE[h]; }

// ── Mini calendar preview ─────────────────────────────────────────────────────
function MiniCalPreview({ courseIds, avoidDays, avoidSlots }) {
  const courses = courseIds.map((id) => byId.get(id)).filter(Boolean);
  const hours = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) hours.push(m);

  return (
    <div className="opt-mini-cal">
      <div className="opt-mini-header">
        <div style={{ width: 22 }} />
        {DAYS.map((d) => <div key={d} className={`opt-mini-day-head ${avoidDays?.has(d) ? 'avoided' : ''}`}>{d}</div>)}
      </div>
      <div className="opt-mini-grid">
        <div className="opt-mini-time-col">
          {hours.map((m) => (
            <div key={m} className="opt-mini-hour-label" style={{ top: `${((m-GRID_START)/GRID_SPAN)*100}%` }}>
              {String(Math.floor(m/60)).padStart(2,'0')}
            </div>
          ))}
        </div>
        {DAYS.map((day) => (
          <div key={day} className={`opt-mini-day-col ${avoidDays?.has(day) ? 'avoided-col' : ''}`}>
            {hours.map((m) => <div key={m} className="opt-mini-hour-line" style={{ top:`${((m-GRID_START)/GRID_SPAN)*100}%` }} />)}
            {/* Avoid slot shading */}
            {avoidSlots?.map((av, i) => {
              const top = ((Math.max(toMin(av.start),GRID_START)-GRID_START)/GRID_SPAN)*100;
              const height = ((Math.min(toMin(av.end),GRID_END)-Math.max(toMin(av.start),GRID_START))/GRID_SPAN)*100;
              return <div key={i} className="opt-avoid-shade" style={{ top:`${top}%`, height:`${height}%` }} />;
            })}
            {courses.flatMap((c) =>
              (c.schedule||[]).filter((s)=>s.day===day).map((s,idx) => {
                const top = ((Math.max(toMin(s.start),GRID_START)-GRID_START)/GRID_SPAN)*100;
                const ht  = Math.max(((Math.min(toMin(s.end),GRID_END)-Math.max(toMin(s.start),GRID_START))/GRID_SPAN)*100, 1.5);
                return (
                  <div key={`${c.id}-${idx}`} className={isLecture(c)?'opt-mini-block lecture-block':'opt-mini-block'}
                    style={{ top:`${top}%`, height:`${ht}%`, background: isLecture(c)?'#9CA3AF':colorFor(c.id) }}
                    title={`${c.title} ${s.start}–${s.end}`}>
                    <div className="opt-block-text">{c.title}</div>
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

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, rank, avoidDays, avoidSlots, onLoadPlanner, onLoadRegistration, onLoadCompare, collapsed, onToggleCollapse, lang }) {
  const [expanded, setExpanded] = useState(false);
  const s = (en, fr) => lang === 'fr' ? fr : en;

  const courses = result.courseIds.map((id) => byId.get(id)).filter(Boolean);
  const nonLectureCourses = courses.filter((c) => !isLecture(c));
  const avoidCount = courses.flatMap((c) => c.schedule||[]).filter((slot) => avoidDays?.has(slot.day)).length;

  const rankLabel = ['🥇','🥈','🥉'][rank] || `#${rank+1}`;
  const rankClass = ['gold','silver','bronze'][rank] || '';

  return (
    <div className={`opt-result-card ${rankClass} ${collapsed ? 'collapsed' : ''}`}>
      <div className="opt-result-header">
        <button className="opt-collapse-btn" onClick={onToggleCollapse} title={collapsed ? s('Expand','Développer') : s('Collapse','Réduire')}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="opt-rank">{rankLabel}</span>
        <div className="opt-result-meta">
          <span className="opt-score-badge">Score: {Math.round(result.score)}</span>
          {avoidCount > 0 && <span className="opt-avoid-badge">⚠ {avoidCount} avoided slot{avoidCount!==1?'s':''}</span>}
          {avoidCount === 0 && <span className="opt-clean-badge">✓ No avoided slots</span>}
          {result.quadGroup && <span className="opt-quad-badge">Quadruplette Gr{result.quadGroup}</span>}
          <span className="opt-course-count">{nonLectureCourses.length} choices + {courses.length - nonLectureCourses.length} lectures</span>
        </div>
        <div className="opt-result-actions">
          <button className="opt-load-planner-btn" onClick={() => onLoadPlanner(result)}>
            📅 {s('Load into Planner','Charger dans le Planificateur')}
          </button>
          <button className="opt-load-reg-btn" onClick={() => onLoadRegistration(result)}>
            📝 {s('Load into Registration','Charger dans l\'Inscription')}
          </button>
          <button className="opt-load-compare-btn" onClick={() => onLoadCompare(result)}>
            ⚖ {s('Load into Compare','Charger dans Comparer')}
          </button>
          {!collapsed && (
            <button className="opt-expand-btn" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '▲' : '▼'} {s('Details','Détails')}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <MiniCalPreview courseIds={result.courseIds} avoidDays={avoidDays} avoidSlots={avoidSlots} />
          {expanded && (
            <div className="opt-slot-list">
              <div className="opt-slot-list-title">{s('Selected groups + backups','Groupes sélectionnés + sauvegardes')}</div>
              {result.slotSummary.map((p, i) => {
                const primary = byId.get(p.courseId);
                const backup  = p.backupId ? byId.get(p.backupId) : null;
                return (
                  <div key={i} className="opt-slot-row">
                    <div className="opt-slot-label">{p.label}</div>
                    <div className="opt-slot-primary">
                      <span className="opt-slot-badge primary-badge">1°</span>
                      <span>{p.pickedTitle}</span>
                      {primary && <span className="opt-slot-sched">{formatSchedule(primary)}</span>}
                      {primary?.confoscope1 != null && <ConfoscopeTag score={primary.confoscope1} />}
                    </div>
                    {backup && (
                      <div className="opt-slot-backup">
                        <span className="opt-slot-badge backup-badge">2°</span>
                        <span>{p.backupTitle}</span>
                        <span className="opt-slot-sched">{formatSchedule(backup)}</span>
                        {backup?.confoscope1 != null && <ConfoscopeTag score={backup.confoscope1} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Optimizer Page ───────────────────────────────────────────────────────
export default function OptimizerPage({
  programKey, majeureMineure, addedCourses, languageProfile,
  enFrPreference, setEnFrPreference,
  onBack, onLoadPlanner, onLoadRegistration, onLoadCompare, lang,
}) {
  const s = (en, fr) => lang === 'fr' ? fr : en;

  const profile = REQUIREMENTS[programKey];

  // Avoid settings
  const [avoidDays,  setAvoidDays]  = useState(new Set());
  const [avoidSlots, setAvoidSlots] = useState([]);

  // Lock settings: Set of course IDs user has manually locked
  const [lockedIds, setLockedIds] = useState(() => {
    // Auto-lock lectures
    return new Set(addedCourses.filter((c) => isLecture(c)).map((c) => c.id));
  });

  const [results, setResults]       = useState([]);
  const [running, setRunning]       = useState(false);
  const [hasRun,  setHasRun]        = useState(false);
  const [collapsedCards, setCollapsedCards] = useState(new Set());

  // Fixed IDs (lectures) — always in schedule
  const fixedIds = useMemo(() => addedCourses.filter((c) => isLecture(c)).map((c) => c.id), [addedCourses]);

  // Non-lecture added courses available to lock
  const lockableCourses = useMemo(() => addedCourses.filter((c) => !isLecture(c)), [addedCourses]);

  function toggleDay(d) { setAvoidDays((p) => { const n = new Set(p); n.has(d) ? n.delete(d) : n.add(d); return n; }); }
  function toggleSlot(preset) {
    setAvoidSlots((p) => {
      const exists = p.find((a) => a.start === preset.start && a.end === preset.end);
      return exists ? p.filter((a) => a.start !== preset.start || a.end !== preset.end) : [...p, preset];
    });
  }
  function toggleLock(id) { setLockedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function run() {
    if (!profile) return;
    setRunning(true);
    setTimeout(() => {
      const res = generateSchedules({
        profile, programKey, fixedIds,
        lockedIds, majeureMineure,
        avoidDays, avoidSlots, enFrPreference, languageProfile,
      });
      setResults(res);
      setRunning(false);
      setHasRun(true);
    }, 50);
  }

  // 2A programs: check if Digital Culture / Capstone filter applies
  const is2A = programKey?.startsWith('2A');

  return (
    <div className="opt-page">
      <div className="opt-header">
        <button className="compare-back-btn" onClick={onBack}>← {s('Back to planner','Retour au planificateur')}</button>
        <h1 className="opt-title">⚡ {s('Schedule Optimizer','Optimiseur de cours')}</h1>
      </div>

      <div className="opt-body">
        {/* Left settings panel */}
        <div className="opt-settings">

          {/* EN/FR preference (2A only) */}
          {is2A && (
            <div className="opt-setting-group">
              <div className="opt-setting-title">{s('Language preference','Préférence de langue')}</div>
              <p className="opt-setting-desc">{s('Applies to Digital Culture & Capstone groups, in both the optimizer and the course browser.','Appliqué aux groupes Culture du Numérique et Grand Écrit, dans l\'optimiseur et le navigateur de cours.')}</p>
              <div className="opt-enfr-row">
                {[['EN', '🇬🇧 English only (ANG groups)'], ['FR', '🇫🇷 French only (FR groups)'], [null, 'Both']].map(([pref, label]) => (
                  <button key={String(pref)}
                    className={enFrPreference === pref ? 'opt-enfr-btn active' : 'opt-enfr-btn'}
                    onClick={() => setEnFrPreference(pref)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Avoid days */}
          <div className="opt-setting-group">
            <div className="opt-setting-title">{s('Avoid days','Jours à éviter')}</div>
            <div className="opt-day-btns">
              {ALL_DAYS.map((d) => (
                <button key={d} className={avoidDays.has(d) ? 'opt-day-btn active' : 'opt-day-btn'} onClick={() => toggleDay(d)}>
                  {DAY_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Avoid time slots */}
          <div className="opt-setting-group">
            <div className="opt-setting-title">{s('Avoid time slots','Créneaux à éviter')}</div>
            <p className="opt-setting-desc">{s('Soft preference — the optimizer avoids these when possible but won\'t omit a required course entirely.','Préférence douce — l\'optimiseur évite ces créneaux si possible, mais ne supprimera pas un cours requis.')}</p>
            <div className="opt-slot-btns">
              {TIME_PRESETS.map((p) => {
                const active = avoidSlots.some((a) => a.start === p.start && a.end === p.end);
                return (
                  <button key={p.start} className={active ? 'opt-slot-btn active' : 'opt-slot-btn'} onClick={() => toggleSlot(p)}>
                    {lang === 'fr' ? p.labelFr : p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lock courses */}
          {lockableCourses.length > 0 && (
            <div className="opt-setting-group">
              <div className="opt-setting-title">{s('Lock courses','Verrouiller des cours')}</div>
              <p className="opt-setting-desc">{s('Locked courses are kept as-is. Lectures are always locked.','Les cours verrouillés sont conservés. Les cours magistraux sont toujours verrouillés.')}</p>
              <div className="opt-lock-list">
                {lockableCourses.map((c) => {
                  const locked = lockedIds.has(c.id);
                  return (
                    <button key={c.id} className={locked ? 'opt-lock-item locked' : 'opt-lock-item'} onClick={() => toggleLock(c.id)}>
                      {locked ? '🔒' : '🔓'} {c.title}
                      <span className="opt-lock-sched">{formatSchedule(c)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate button */}
          <button className="opt-generate-btn" onClick={run} disabled={running}>
            {running ? `⚡ ${s('Generating…','Génération…')}` : `⚡ ${s('Generate 3 schedules','Générer 3 emplois du temps')}`}
          </button>
        </div>

        {/* Right results panel */}
        <div className="opt-results">
          {!hasRun && !running && (
            <div className="opt-results-empty">
              <div className="opt-results-empty-icon">⚡</div>
              <h2>{s('Configure your preferences and generate','Configurez vos préférences et générez')}</h2>
              <p>{s('The optimizer will find the 3 best complete schedule combinations that respect your requirements, avoid your preferred days/times, and pre-assign backup groups for each slot.','L\'optimiseur trouvera les 3 meilleures combinaisons d\'emploi du temps complètes respectant vos exigences et pré-assignant des groupes de secours.')}</p>
            </div>
          )}
          {running && (
            <div className="opt-results-empty">
              <div className="opt-results-empty-icon">⚙️</div>
              <h2>{s('Generating…','Génération en cours…')}</h2>
            </div>
          )}
          {!running && hasRun && results.length === 0 && (
            <div className="opt-results-empty">
              <div className="opt-results-empty-icon">😔</div>
              <h2>{s('No valid schedules found','Aucun emploi du temps valide trouvé')}</h2>
              <p>{s('Try unlocking some courses or reducing your avoid preferences.','Essayez de déverrouiller des cours ou de réduire vos préférences d\'évitement.')}</p>
            </div>
          )}
          {!running && results.length > 0 && (
            <div className="opt-collapse-bar">
              <button className="opt-collapse-all-btn" onClick={() => setCollapsedCards(new Set(results.map((_,i)=>i)))}>
                ▶ {s('Collapse all','Tout réduire')}
              </button>
              <button className="opt-collapse-all-btn" onClick={() => setCollapsedCards(new Set())}>
                ▼ {s('Expand all','Tout développer')}
              </button>
            </div>
          )}
          {!running && results.map((result, i) => (
            <ResultCard
              key={i}
              result={result}
              rank={i}
              avoidDays={avoidDays}
              avoidSlots={avoidSlots}
              collapsed={collapsedCards.has(i)}
              onToggleCollapse={() => setCollapsedCards((prev) => {
                const next = new Set(prev);
                next.has(i) ? next.delete(i) : next.add(i);
                return next;
              })}
              onLoadPlanner={(r) => onLoadPlanner(r)}
              onLoadRegistration={(r) => onLoadRegistration(r)}
              onLoadCompare={(r) => onLoadCompare(r)}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
