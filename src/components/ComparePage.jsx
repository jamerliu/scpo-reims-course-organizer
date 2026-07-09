import { useRef, useState, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import { parseSaveFile, validateSaveData } from '../utils/saveLoad';
import { resolveStack, classifySlots, OVERLAP, computeOptimalPaths } from '../utils/compareEngine';
import { ConfoscopeTag } from './Modal';
import coursesData from '../data/courses.json';
import { PROGRAM_COURSE_GROUPS } from '../data/programMap';

const byId = new Map(coursesData.map((c) => [c.id, c]));
const validProgramKeys = Object.keys(PROGRAM_COURSE_GROUPS);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS_EN = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri' };
const DAY_LABELS_FR = { Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven' };

const GRID_START = 8 * 60;
const GRID_END   = 21 * 60;
const GRID_SPAN  = GRID_END - GRID_START;

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const STACK_COLORS = [
  '#6C63FF', '#38B2AC', '#E07A5F', '#81B29A', '#F2CC8F', '#9B5DE5',
];
const OVERLAP_SHARED = '#38B2AC';
const OVERLAP_SOME   = '#F2CC8F';
const OVERLAP_UNIQUE = (stackIdx) => STACK_COLORS[stackIdx % STACK_COLORS.length];

// ── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ onStackAdded, lang }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = parseSaveFile(e.target.result);
      if (!raw) return alert(lang === 'fr' ? 'Fichier JSON invalide.' : 'Invalid JSON file.');
      const validation = validateSaveData(raw, { validProgramKeys, coursesById: byId });
      if (!validation.ok) return alert(validation.detail);
      const stack = resolveStack(raw);
      onStackAdded(stack, raw);
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.json'));
    files.forEach(processFile);
  }

  return (
    <div
      className={`compare-upload-zone ${dragging ? 'dragging' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept=".json" multiple style={{ display: 'none' }}
        onChange={(e) => Array.from(e.target.files).forEach(processFile)} />
      <div className="compare-upload-icon">📂</div>
      <div className="compare-upload-text">
        {lang === 'fr' ? 'Déposer des fichiers .json ici, ou cliquer pour choisir' : 'Drop .json schedule files here, or click to choose'}
      </div>
      <div className="compare-upload-hint">
        {lang === 'fr' ? 'Vous pouvez charger plusieurs fichiers à la fois' : 'You can load multiple files at once'}
      </div>
    </div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ stack, color, droppedIds = new Set(), onToggleDrop }) {
  const hours = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) hours.push(m);

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <div className="mini-gutter-placeholder"></div>
        {DAYS.map((d) => (
          <div key={d} className="mini-day-head">{d}</div>
        ))}
      </div>
      <div className="mini-cal-grid">
        <div className="mini-time-col">
          {hours.map((m) => (
            <div key={m} className="mini-hour-label" style={{ top: `${((m - GRID_START) / GRID_SPAN) * 100}%` }}>
              {String(Math.floor(m / 60)).padStart(2, '0')}
            </div>
          ))}
        </div>
        {DAYS.map((day) => (
          <div key={day} className="mini-day-col">
            {hours.map((m) => (
              <div key={m} className="mini-hour-line" style={{ top: `${((m - GRID_START) / GRID_SPAN) * 100}%` }} />
            ))}
            {stack.courses.flatMap((course) =>
              (course.schedule || [])
                .filter((s) => s.day === day)
                .map((s, idx) => {
                  const top = ((Math.max(toMin(s.start), GRID_START) - GRID_START) / GRID_SPAN) * 100;
                  const height = Math.max(((Math.min(toMin(s.end), GRID_END) - Math.max(toMin(s.start), GRID_START)) / GRID_SPAN) * 100, 1.5);
                  const dropped = droppedIds.has(course.id);
                  return (
                    <div
                      key={`${course.id}-${idx}`}
                      className={`mini-block ${dropped ? 'dropped' : ''}`}
                      style={{ top: `${top}%`, height: `${height}%`, background: dropped ? '#aaa' : color, opacity: dropped ? 0.4 : 1 }}
                      title={`${course.title}\n${s.start}–${s.end}${dropped ? '\n[DROPPED]' : ''}`}
                      onClick={onToggleDrop ? () => onToggleDrop(course.id) : undefined}
                    >
                      <div className="mini-block-title">{course.title}</div>
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

// ── Overlay Calendar ──────────────────────────────────────────────────────────

function OverlayCalendar({ stacks, activeIndices }) {
  const activeStacks = stacks.filter((_, i) => activeIndices.has(i));
  const slots = useMemo(() => classifySlots(activeStacks), [activeStacks]);
  const hours = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) hours.push(m);

  // Group slots by day so we can render per column
  const slotsByDay = {};
  DAYS.forEach((d) => { slotsByDay[d] = []; });
  slots.forEach((entry) => { if (slotsByDay[entry.slot.day]) slotsByDay[entry.slot.day].push(entry); });

  return (
    <div className="overlay-cal-wrap">
      <div className="overlay-legend">
        <span className="legend-dot" style={{ background: OVERLAP_SHARED }} />
        <span>In all stacks</span>
        <span className="legend-dot" style={{ background: OVERLAP_SOME }} />
        <span>In some stacks</span>
        <span className="legend-dot" style={{ background: STACK_COLORS[0] }} />
        <span>Stack-unique</span>
      </div>
      <div className="mini-cal">
        <div className="mini-cal-header">
          {DAYS.map((d) => <div key={d} className="mini-day-head">{d}</div>)}
        </div>
        <div className="mini-cal-grid" style={{ height: 560 }}>
          <div className="mini-time-col">
            {hours.map((m) => (
              <div key={m} className="mini-hour-label" style={{ top: `${((m - GRID_START) / GRID_SPAN) * 100}%` }}>
                {String(Math.floor(m / 60)).padStart(2, '0')}
              </div>
            ))}
          </div>
          {DAYS.map((day) => (
            <div key={day} className="mini-day-col">
              {hours.map((m) => (
                <div key={m} className="mini-hour-line" style={{ top: `${((m - GRID_START) / GRID_SPAN) * 100}%` }} />
              ))}
              {slotsByDay[day].map((entry, i) => {
                const top = ((Math.max(toMin(entry.slot.start), GRID_START) - GRID_START) / GRID_SPAN) * 100;
                const height = Math.max(((Math.min(toMin(entry.slot.end), GRID_END) - Math.max(toMin(entry.slot.start), GRID_START)) / GRID_SPAN) * 100, 1.5);
                const color =
                  entry.overlapClass === OVERLAP.SHARED ? OVERLAP_SHARED :
                  entry.overlapClass === OVERLAP.SOME   ? OVERLAP_SOME :
                  OVERLAP_UNIQUE(entry.stackIdx);
                const borderStyle = entry.overlapClass === OVERLAP.SOME ? '2px dashed rgba(0,0,0,0.3)' : 'none';
                return (
                  <div
                    key={`${entry.course.id}-${entry.stackIdx}-${i}`}
                    className="mini-block overlay-block"
                    style={{ top: `${top}%`, height: `${height}%`, background: color, border: borderStyle, zIndex: entry.overlapClass === OVERLAP.SHARED ? 3 : 2 }}
                    title={`${entry.course.title}\n${entry.slot.start}–${entry.slot.end}\nStack: ${stacks[entry.stackIdx]?.label}`}
                  >
                    <div className="mini-block-title">{entry.course.title}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Optimal Path Panel ────────────────────────────────────────────────────────

function OptimalPathPanel({ baseStack, baseIdx, stacks, droppedIds, programKey, lang }) {
  const otherStacks = stacks.filter((_, i) => i !== baseIdx);

  const analysis = useMemo(() => {
    if (droppedIds.size === 0) return [];
    return computeOptimalPaths({ baseStack, droppedIds, otherStacks, programKey });
  }, [baseStack, droppedIds, otherStacks, programKey]);

  if (droppedIds.size === 0) {
    return (
      <div className="optimal-empty">
        <div className="optimal-empty-icon">💡</div>
        <p>{lang === 'fr'
          ? 'Cliquez sur un bloc de cours dans le calendrier ci-dessus pour le marquer comme "supprimé" et voir les remplacements optimaux.'
          : 'Click any course block in the calendar above to mark it as dropped and see optimal replacements.'}</p>
      </div>
    );
  }

  return (
    <div className="optimal-panel">
      {analysis.map((item, i) => (
        <div key={i} className="optimal-group">
          <div className="optimal-dropped-header">
            <span className="optimal-dropped-label">Dropped:</span>
            <span className="optimal-dropped-name">{item.droppedCourse.title}</span>
            {item.droppedCourse.codeMatiere && <code className="optimal-code">{item.droppedCourse.codeMatiere}</code>}
          </div>
          {item.category && (
            <div className="optimal-req-label">
              Requirement: <strong>{item.categoryLabel}</strong>
            </div>
          )}
          {item.replacements.length === 0 ? (
            <p className="optimal-no-rep">{lang === 'fr' ? 'Aucun remplacement trouvé.' : 'No replacements found.'}</p>
          ) : (
            <div className="optimal-replacements">
              {item.replacements.map((rep, ri) => (
                <div key={ri} className={`optimal-rep ${rep.conflicts.length === 0 ? 'no-conflict' : 'has-conflict'}`}>
                  <div className="optimal-rep-top">
                    <span className={`optimal-source-badge ${rep.source}`}>
                      {rep.source === 'stack' ? `From: ${rep.fromStackLabel}` : 'Full pool'}
                    </span>
                    {rep.conflicts.length === 0
                      ? <span className="optimal-ok">✓ No conflicts</span>
                      : <span className="optimal-conflict">⚠ Conflicts with {rep.conflicts.length} course(s)</span>}
                    {rep.course.confoscope1 != null && <ConfoscopeTag score={rep.course.confoscope1} />}
                  </div>
                  <div className="optimal-rep-title">{rep.course.title}</div>
                  <div className="optimal-rep-meta">
                    {rep.course.codeMatiere && <code>{rep.course.codeMatiere}</code>}
                    {rep.course.teacher1 && <span>{rep.course.teacher1}</span>}
                    {rep.course.schedule?.map((s, si) => (
                      <span key={si}>{s.day} {s.start}–{s.end}</span>
                    ))}
                  </div>
                  {rep.conflicts.length > 0 && (
                    <div className="optimal-conflict-list">
                      Conflicts with: {rep.conflicts.map((c) => c.title).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Course Diff Table ─────────────────────────────────────────────────────────

function DiffTable({ stacks, activeIndices, lang }) {
  const activeStacks = stacks.filter((_, i) => activeIndices.has(i));
  if (activeStacks.length === 0) return null;

  // Collect all unique course IDs across active stacks
  const allIds = new Set(activeStacks.flatMap((s) => s.courses.map((c) => c.id)));

  return (
    <div className="diff-table-wrap">
      <table className="diff-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Code</th>
            <th>Schedule</th>
            {activeStacks.map((s, i) => (
              <th key={i} style={{ color: STACK_COLORS[stacks.indexOf(s) % STACK_COLORS.length] }}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...allIds].map((id) => {
            const course = byId.get(id);
            if (!course) return null;
            const inStack = activeStacks.map((s) => s.courses.some((c) => c.id === id));
            const allIn  = inStack.every(Boolean);
            const someIn = inStack.some(Boolean);
            return (
              <tr key={id} className={allIn ? 'diff-row-shared' : someIn ? 'diff-row-partial' : ''}>
                <td><strong>{course.title}</strong></td>
                <td><code>{course.codeMatiere}</code></td>
                <td className="diff-sched">
                  {(course.schedule || []).map((s, i) => (
                    <span key={i}>{s.day} {s.start}–{s.end}</span>
                  ))}
                </td>
                {inStack.map((present, i) => (
                  <td key={i} className="diff-check">
                    {present
                      ? <span className="diff-yes">✓</span>
                      : <span className="diff-no">—</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Compare Page ─────────────────────────────────────────────────────────

export default function ComparePage({ onBack, currentStack, extraStack, onExtraStackConsumed }) {
  const { lang } = useLang();
  const [stacks, setStacks] = useState(() => {
    const initial = currentStack ? [currentStack] : [];
    if (extraStack) initial.push(extraStack);
    return initial;
  });
  const [activeIndices, setActive] = useState(() => {
    const count = (currentStack ? 1 : 0) + (extraStack ? 1 : 0);
    return new Set(Array.from({ length: count }, (_, i) => i));
  });
  const [viewMode, setViewMode]       = useState('sidebyside'); // sidebyside | overlay | diff
  const [baseIdx, setBaseIdx]         = useState(0);
  const [droppedIds, setDroppedIds]   = useState(new Set());
  const [showOptimal, setShowOptimal] = useState(false);

  function handleStackAdded(stack) {
    setStacks((prev) => {
      const next = [...prev, stack];
      setActive((a) => new Set([...a, next.length - 1]));
      return next;
    });
  }

  function toggleActive(i) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  }

  function toggleDrop(courseId) {
    setDroppedIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
      return next;
    });
  }

  const baseStack = stacks[baseIdx];
  const programKey = baseStack?.programKey;

  return (
    <div className="compare-page">
      {/* Header */}
      <div className="compare-header">
        <button className="compare-back-btn" onClick={onBack}>
          ← {lang === 'fr' ? 'Retour au planificateur' : 'Back to planner'}
        </button>
        <h1 className="compare-title">
          {lang === 'fr' ? 'Comparer les emplois du temps' : 'Compare Schedules'}
        </h1>
        <div className="compare-view-toggle">
          {[
            { key: 'sidebyside', label: lang === 'fr' ? 'Côte à côte' : 'Side by side' },
            { key: 'overlay',    label: lang === 'fr' ? 'Superposition' : 'Overlay' },
            { key: 'diff',       label: lang === 'fr' ? 'Tableau diff' : 'Diff table' },
          ].map((m) => (
            <button
              key={m.key}
              className={viewMode === m.key ? 'view-toggle-btn active' : 'view-toggle-btn'}
              onClick={() => setViewMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="compare-body">
        {/* Left sidebar: upload + stack list */}
        <div className="compare-sidebar">
          <UploadZone onStackAdded={handleStackAdded} lang={lang} />

          {stacks.length > 0 && (
            <div className="stack-list">
              <div className="stack-list-title">
                {lang === 'fr' ? 'Emplois du temps chargés' : 'Loaded schedules'}
              </div>
              {stacks.map((stack, i) => (
                <div key={i} className={`stack-card ${activeIndices.has(i) ? 'active' : ''}`}>
                  <div className="stack-card-top">
                    <span className="stack-color-dot" style={{ background: STACK_COLORS[i % STACK_COLORS.length] }} />
                    <div className="stack-card-info">
                      <div className="stack-card-label">{stack.label}</div>
                      <div className="stack-card-meta">
                        {stack.courses.length} {lang === 'fr' ? 'cours' : 'courses'}
                        {stack.savedAt && ` · ${new Date(stack.savedAt).toLocaleDateString()}`}
                      </div>
                      {stack.majeureMineure && (
                        <div className="stack-card-meta">
                          {stack.majeureMineure.majeure?.replace('Majeure ', '')} + {stack.majeureMineure.mineure}
                        </div>
                      )}
                    </div>
                    <label className="stack-toggle">
                      <input type="checkbox" checked={activeIndices.has(i)} onChange={() => toggleActive(i)} />
                    </label>
                  </div>
                  <div className="stack-card-actions">
                    <button
                      className={baseIdx === i ? 'stack-base-btn active' : 'stack-base-btn'}
                      onClick={() => { setBaseIdx(i); setDroppedIds(new Set()); }}
                      title={lang === 'fr' ? 'Définir comme pile de base pour l\'analyse' : 'Set as base stack for path analysis'}
                    >
                      {baseIdx === i ? '★ Base' : '☆ Set base'}
                    </button>
                    <button className="stack-remove-btn" onClick={() => {
                      setStacks((prev) => prev.filter((_, j) => j !== i));
                      setActive((prev) => {
                        const next = new Set([...prev].filter((j) => j !== i).map((j) => j > i ? j - 1 : j));
                        return next;
                      });
                      if (baseIdx >= i) setBaseIdx(Math.max(0, baseIdx - 1));
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Optimal path toggle */}
          {baseStack && droppedIds.size === 0 && (
            <div className="optimal-hint">
              <span>💡</span>
              {lang === 'fr'
                ? 'En mode côte-à-côte, cliquez sur un cours dans le calendrier de base pour le marquer comme supprimé et lancer l\'analyse de chemin optimal.'
                : 'In side-by-side mode, click a course block in the base calendar to mark it as dropped and trigger optimal path analysis.'}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="compare-main">
          {stacks.length === 0 ? (
            <div className="compare-empty">
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
              <h2>{lang === 'fr' ? 'Aucun emploi du temps chargé' : 'No schedules loaded'}</h2>
              <p>{lang === 'fr'
                ? 'Chargez des fichiers .json sauvegardés depuis le planificateur pour les comparer.'
                : 'Upload .json files saved from the planner to compare them side by side.'}</p>
            </div>
          ) : viewMode === 'sidebyside' ? (
            <div className="sidebyside-wrap">
              <div className="sidebyside-calendars">
                {stacks.map((stack, i) => (
                  activeIndices.has(i) && (
                    <div key={i} className="sidebyside-col">
                      <div className="sidebyside-col-header" style={{ borderColor: STACK_COLORS[i % STACK_COLORS.length] }}>
                        <span className="stack-color-dot" style={{ background: STACK_COLORS[i % STACK_COLORS.length] }} />
                        <span>{stack.label}</span>
                        {baseIdx === i && <span className="base-badge">BASE</span>}
                      </div>
                      <MiniCalendar
                        stack={stack}
                        color={STACK_COLORS[i % STACK_COLORS.length]}
                        droppedIds={baseIdx === i ? droppedIds : new Set()}
                        onToggleDrop={baseIdx === i ? toggleDrop : null}
                      />
                    </div>
                  )
                ))}
              </div>

              {/* Optimal path section */}
              {baseStack && (
                <div className="optimal-section">
                  <button
                    className={showOptimal || droppedIds.size > 0 ? 'optimal-toggle active' : 'optimal-toggle'}
                    onClick={() => setShowOptimal((v) => !v)}
                  >
                    💡 {lang === 'fr' ? 'Analyse de chemin optimal' : 'Optimal Path Analysis'}
                    {droppedIds.size > 0 && <span className="optimal-count-badge">{droppedIds.size} dropped</span>}
                  </button>
                  {droppedIds.size > 0 && (
                    <button className="optimal-reset-btn" onClick={() => setDroppedIds(new Set())}>
                      {lang === 'fr' ? 'Réinitialiser' : 'Reset dropped'}
                    </button>
                  )}
                  {(showOptimal || droppedIds.size > 0) && (
                    <OptimalPathPanel
                      baseStack={baseStack}
                      baseIdx={baseIdx}
                      stacks={stacks}
                      droppedIds={droppedIds}
                      programKey={programKey}
                      lang={lang}
                    />
                  )}
                </div>
              )}
            </div>
          ) : viewMode === 'overlay' ? (
            <OverlayCalendar stacks={stacks} activeIndices={activeIndices} />
          ) : (
            <DiffTable stacks={stacks} activeIndices={activeIndices} lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}
