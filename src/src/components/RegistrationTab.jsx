import { useState, useMemo, useRef } from 'react';
import { useLang } from '../i18n/LangContext';
import { ConfoscopeTag, NoRatingTag } from './Modal';
import { propagateSwap, findCandidateSecondaries, coursesConflict } from '../utils/registrationEngine';
import { computeSuggestions } from '../utils/smartSuggest';
import { isLecture } from '../utils/lectureGuard';
import { formatSchedule } from '../utils/schedule';
import coursesData from '../data/courses.json';

const byId = new Map(coursesData.map((c) => [c.id, c]));

const STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', UNAVAILABLE: 'unavailable' };
const STATUS_META = {
  pending:     { color: '#6B7280', bg: 'rgba(163,177,198,0.15)' },
  confirmed:   { color: '#38B2AC', bg: 'rgba(56,178,172,0.1)'  },
  unavailable: { color: '#E05252', bg: 'rgba(224,82,82,0.08)'  },
};

const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri'];
const DAY_LABELS = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday' };

// Named time ranges for quick avoidance
const TIME_PRESETS = [
  { label: 'Early morning (before 10:00)', start: '08:00', end: '10:00' },
  { label: 'Morning (10:00–12:20)',         start: '10:00', end: '12:20' },
  { label: 'Lunch (12:00–14:00)',           start: '12:00', end: '14:00' },
  { label: 'Afternoon (14:00–17:00)',       start: '14:00', end: '17:00' },
  { label: 'Late afternoon (17:00–19:00)',  start: '17:00', end: '19:00' },
  { label: 'Evening (after 19:00)',         start: '19:00', end: '21:00' },
];

// ── Secondary Picker Modal ────────────────────────────────────────────────────

function SecondaryPicker({ course, candidates, currentlyAssigned, onAssign, onClose, lang }) {
  const [dragOver, setDragOver] = useState(false);
  const [picked, setPicked] = useState(currentlyAssigned || null);
  const s = (en, fr) => lang === 'fr' ? fr : en;
  const pickedCourse = picked ? byId.get(picked) : null;

  return (
    <div className="reg-modal-backdrop" onClick={onClose}>
      <div className="reg-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{s('Set secondary for', 'Définir le secondaire pour')}:</h3>
        <div className="reg-modal-primary-label">{course.title} <code>{course.codeMatiere}</code></div>
        <p className="reg-modal-hint">{s('Drag a candidate onto the drop zone, or click to select.', 'Glissez un candidat sur la zone de dépôt, ou cliquez pour sélectionner.')}</p>
        <div
          className={`reg-drop-zone ${dragOver ? 'drag-over' : ''} ${pickedCourse ? 'has-pick' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const id = e.dataTransfer.getData('reg-secondary-id'); if (id) setPicked(id); }}
        >
          {pickedCourse ? (
            <div className="reg-drop-picked">
              <span className="reg-drop-picked-title">{pickedCourse.title}</span>
              <span className="reg-drop-picked-meta">{formatSchedule(pickedCourse)}</span>
              <button className="reg-drop-clear" onClick={() => setPicked(null)}>✕</button>
            </div>
          ) : (
            <span className="reg-drop-hint-text">{dragOver ? s('Drop here','Déposer ici') : s('Drop secondary here','Déposez le secondaire ici')}</span>
          )}
        </div>
        <div className="reg-candidates">
          {candidates.length === 0 && <p className="reg-no-candidates">{s('No alternatives found.','Aucune alternative trouvée.')}</p>}
          {candidates.map((c) => (
            <div key={c.id} className={`reg-candidate ${picked === c.id ? 'selected' : ''}`}
              draggable onDragStart={(e) => e.dataTransfer.setData('reg-secondary-id', c.id)}
              onClick={() => setPicked(c.id === picked ? null : c.id)}>
              <div className="reg-candidate-title">{c.title}</div>
              <div className="reg-candidate-meta">
                <span>{formatSchedule(c)}</span>
                {c.teacher1 && <span>{c.teacher1}</span>}
                {c.confoscope1 != null ? <ConfoscopeTag score={c.confoscope1} /> : <NoRatingTag />}
              </div>
            </div>
          ))}
        </div>
        <div className="reg-modal-actions">
          <button className="reg-modal-cancel" onClick={onClose}>{s('Cancel','Annuler')}</button>
          <button className="reg-modal-save" disabled={!picked} onClick={() => { onAssign(picked); onClose(); }}>
            {s('Save secondary','Enregistrer le secondaire')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Swap Result Modal (with inline suggestions) ────────────────────────────

function SwapResultModal({ swapResult, unavailableCourse, allProgramCourses, currentIds, avoidDays, avoidSlots, onConfirm, onCancel, lang }) {
  const s = (en, fr) => lang === 'fr' ? fr : en;
  const { secondary, conflictsWithConfirmed, conflictsWithPending } = swapResult;

  // Remaining courses after applying the swap (excluding unavailable and conflicts)
  const remainingCourses = useMemo(() => {
    const conflictIds = new Set(conflictsWithPending.map((c) => c.id));
    return currentIds
      .filter((id) => id !== unavailableCourse.id && !conflictIds.has(id))
      .map((id) => byId.get(id)).filter(Boolean);
  }, [currentIds, unavailableCourse, conflictsWithPending]);

  const suggestions = useMemo(() => {
    if (conflictsWithPending.length === 0) return [];
    return computeSuggestions({
      conflictingCourses: conflictsWithPending,
      allProgramCourses,
      remainingCourses,
      avoidDays,
      avoidSlots,
      currentIds,
    });
  }, [conflictsWithPending, allProgramCourses, remainingCourses, avoidDays, avoidSlots, currentIds]);

  return (
    <div className="reg-modal-backdrop" onClick={onCancel}>
      <div className="reg-modal swap-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h3>{s('Swap result','Résultat de l\'échange')}</h3>
        <div className="swap-summary">
          <div className="swap-row">
            <span className="swap-label">{s('Dropping','Suppression')}</span>
            <span className="swap-course unavail">{unavailableCourse.title}</span>
          </div>
          <div className="swap-arrow">↓</div>
          <div className="swap-row">
            <span className="swap-label">{s('Secondary','Secondaire')}</span>
            <span className="swap-course secondary">{secondary.title}</span>
            <span className="swap-sched">{formatSchedule(secondary)}</span>
          </div>
        </div>

        {conflictsWithConfirmed.length > 0 && (
          <div className="swap-block conflict-confirmed">
            <div className="swap-block-title">⛔ {s('Conflicts with confirmed (locked) courses:','Conflits avec des cours confirmés :')}</div>
            {conflictsWithConfirmed.map((c) => <div key={c.id} className="swap-conflict-item"><strong>{c.title}</strong> — {formatSchedule(c)}</div>)}
          </div>
        )}

        {conflictsWithPending.length > 0 && (
          <div className="swap-block conflict-pending">
            <div className="swap-block-title">⚠ {s('These pending courses now conflict:','Ces cours en attente sont maintenant en conflit :')}</div>
            {conflictsWithPending.map((c) => <div key={c.id} className="swap-conflict-item"><strong>{c.title}</strong> — {formatSchedule(c)}</div>)}
          </div>
        )}

        {conflictsWithPending.length === 0 && conflictsWithConfirmed.length === 0 && (
          <div className="swap-block no-conflicts">✓ {s('No conflicts — the secondary fits cleanly.','Aucun conflit.')}</div>
        )}

        {/* Smart suggestions for conflicted courses */}
        {suggestions.length > 0 && (
          <div className="suggest-section">
            <div className="suggest-section-title">
              💡 {s('Suggested replacements for conflicting courses','Remplacements suggérés pour les cours en conflit')}
            </div>
            {suggestions.map(({ conflictCourse, suggestions: sug, hasCleanOption }) => (
              <div key={conflictCourse.id} className="suggest-group">
                <div className="suggest-group-label">
                  {conflictCourse.title}
                  {hasCleanOption && <span className="suggest-clean-badge">{s('clean swap available','échange propre disponible')}</span>}
                </div>
                {sug.length === 0
                  ? <p className="suggest-none">{s('No suitable replacement found.','Aucun remplacement adapté.')}</p>
                  : sug.map(({ course: c, sameCode, hasConflicts, penalised }) => (
                    <div key={c.id} className={`suggest-card ${hasConflicts ? 'has-conflict' : 'clean'} ${penalised ? 'penalised' : ''}`}>
                      <div className="suggest-card-top">
                        {sameCode && <span className="suggest-badge same-code">{s('Same course','Même cours')}</span>}
                        {hasConflicts && <span className="suggest-badge conflict-badge">⚠ {s('Has conflicts','A des conflits')}</span>}
                        {penalised && <span className="suggest-badge avoid-badge">⚠ {s('Avoided slot','Créneau évité')}</span>}
                        {!hasConflicts && !penalised && <span className="suggest-badge ok-badge">✓ {s('Clean fit','Créneau libre')}</span>}
                        {c.confoscope1 != null && <ConfoscopeTag score={c.confoscope1} />}
                      </div>
                      <div className="suggest-card-title">{c.title}</div>
                      <div className="suggest-card-meta">
                        {c.teacher1 && <span>{c.teacher1}</span>}
                        <span>{formatSchedule(c)}</span>
                        {c.codeMatiere && <code>{c.codeMatiere}</code>}
                      </div>
                    </div>
                  ))
                }
              </div>
            ))}
          </div>
        )}

        <div className="reg-modal-actions">
          <button className="reg-modal-cancel" onClick={onCancel}>{s('Cancel','Annuler')}</button>
          <button className="reg-modal-save" onClick={onConfirm}>{s('Apply swap','Appliquer l\'échange')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Avoid Filters Bar ─────────────────────────────────────────────────────────

function AvoidFilters({ avoidDays, setAvoidDays, avoidSlots, setAvoidSlots, lang }) {
  const s = (en, fr) => lang === 'fr' ? fr : en;
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef(null);

  function toggleDay(day) {
    setAvoidDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

  function toggleSlot(preset) {
    setAvoidSlots((prev) => {
      const exists = prev.find((s) => s.start === preset.start && s.end === preset.end);
      if (exists) return prev.filter((s) => s.start !== preset.start || s.end !== preset.end);
      return [...prev, { start: preset.start, end: preset.end }];
    });
  }

  const totalAvoided = avoidDays.size + avoidSlots.length;

  return (
    <div className="avoid-bar" ref={ref}>
      <div className="avoid-bar-inner">
        <span className="avoid-label">{s('Avoid','Éviter')}:</span>
        {ALL_DAYS.map((d) => (
          <button key={d} className={`avoid-day-btn ${avoidDays.has(d) ? 'active' : ''}`} onClick={() => toggleDay(d)}>
            {d}
          </button>
        ))}
        <div className="avoid-divider" />
        <div className="avoid-time-wrap">
          <button className={`avoid-time-toggle ${showDropdown ? 'open' : ''}`} onClick={() => setShowDropdown((v) => !v)}>
            🕐 {s('Time slots','Créneaux')} {avoidSlots.length > 0 && `(${avoidSlots.length})`} ▾
          </button>
          {showDropdown && (
            <div className="avoid-time-dropdown">
              {TIME_PRESETS.map((p) => {
                const active = avoidSlots.some((a) => a.start === p.start && a.end === p.end);
                return (
                  <button key={p.start} className={`avoid-time-item ${active ? 'active' : ''}`} onClick={() => toggleSlot(p)}>
                    {active ? '✓ ' : ''}{p.label}
                  </button>
                );
              })}
              <button className="avoid-time-clear" onClick={() => { setAvoidSlots([]); setShowDropdown(false); }}>
                {s('Clear all time filters','Effacer les filtres de temps')}
              </button>
            </div>
          )}
        </div>
        {totalAvoided > 0 && (
          <button className="avoid-clear-all" onClick={() => { setAvoidDays(new Set()); setAvoidSlots([]); }}>
            ✕ {s('Clear all','Tout effacer')}
          </button>
        )}
        {totalAvoided > 0 && (
          <span className="avoid-active-count">{totalAvoided} {s('filter(s) active — applied to suggestions','filtre(s) actif(s) — appliqués aux suggestions')}</span>
        )}
      </div>
    </div>
  );
}

// ── Main Registration Tab ─────────────────────────────────────────────────────

export default function RegistrationTab({
  addedCourses, allProgramCourses,
  statuses, setStatuses,
  secondaries, setSecondaries,
  order, setOrder,
  onUpdateIds,
}) {
  const { lang } = useLang();
  const s = (en, fr) => lang === 'fr' ? fr : en;

  const [pickerFor, setPickerFor]     = useState(null);
  const [swapResult, setSwapResult]   = useState(null);
  const [swapContext, setSwapContext]  = useState(null);
  const [filter, setFilter]           = useState('');
  const [avoidDays, setAvoidDays]     = useState(new Set());
  const [avoidSlots, setAvoidSlots]   = useState([]);
  // Undo history: Array of { prevPrimaryId, prevSecondaryId, replacedId, prevIds }
  const [undoStack, setUndoStack]     = useState([]);

  const eligibleCourses = useMemo(() => addedCourses.filter((c) => !isLecture(c)), [addedCourses]);

  const orderedCourses = useMemo(() => {
    const idToC = new Map(eligibleCourses.map((c) => [c.id, c]));
    const ordered = order.filter((id) => idToC.has(id)).map((id) => idToC.get(id));
    const inOrder = new Set(order);
    const extra = eligibleCourses.filter((c) => !inOrder.has(c.id));
    return [...ordered, ...extra];
  }, [eligibleCourses, order]);

  const confirmedIds = useMemo(
    () => new Set(Object.entries(statuses).filter(([, v]) => v === STATUS.CONFIRMED).map(([k]) => k)),
    [statuses]
  );
  const currentIds = useMemo(() => addedCourses.map((c) => c.id), [addedCourses]);

  function setStatus(id, status) { setStatuses((prev) => ({ ...prev, [id]: status })); }

  function handleMarkUnavailable(course) {
    const secId = secondaries[course.id];
    if (!secId) { setStatus(course.id, STATUS.UNAVAILABLE); return; }
    const result = propagateSwap({ unavailableId: course.id, secondaryId: secId, currentIds, confirmedIds });
    if (!result) return;
    setSwapResult(result);
    setSwapContext({ unavailableId: course.id, secondaryId: secId, prevIds: [...currentIds] });
  }

  function applySwap() {
    const { unavailableId, secondaryId, prevIds } = swapContext;
    const newIds = currentIds.map((id) => id === unavailableId ? secondaryId : id);
    const conflictIds = new Set(swapResult.conflictsWithPending.map((c) => c.id));

    // Save undo entry
    setUndoStack((prev) => [...prev, {
      prevPrimaryId: unavailableId,
      replacedId: secondaryId,
      prevIds,
      prevStatuses: { ...statuses },
      prevSecondaries: { ...secondaries },
      prevOrder: [...order],
    }]);

    setStatuses((prev) => {
      const next = { ...prev, [unavailableId]: STATUS.UNAVAILABLE, [secondaryId]: STATUS.PENDING };
      conflictIds.forEach((id) => { next[id] = STATUS.PENDING; });
      return next;
    });
    setSecondaries((prev) => {
      const next = { ...prev };
      conflictIds.forEach((id) => { delete next[id]; });
      delete next[unavailableId];
      return next;
    });
    setOrder((prev) => {
      const pos = prev.indexOf(unavailableId);
      const next = [...prev];
      if (pos !== -1) next.splice(pos, 1, secondaryId); else next.push(secondaryId);
      return next;
    });
    onUpdateIds(newIds);
    setSwapResult(null);
    setSwapContext(null);
  }

  function handleUndo(entry) {
    onUpdateIds(entry.prevIds);
    setStatuses(entry.prevStatuses);
    setSecondaries(entry.prevSecondaries);
    setOrder(entry.prevOrder);
    setUndoStack((prev) => prev.filter((e) => e !== entry));
  }

  // Drag-to-reorder
  const dragIdRef  = useRef(null);
  const dragOverId = useRef(null);
  function handleDragStart(e, id) { dragIdRef.current = id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('reg-reorder-id', id); }
  function handleDragEnter(id) { dragOverId.current = id; }
  function handleDragEnd() {
    const from = dragIdRef.current, to = dragOverId.current;
    if (!from || !to || from === to) { dragIdRef.current = null; dragOverId.current = null; return; }
    setOrder((prev) => {
      const base = [...new Set([...prev, ...orderedCourses.map((c) => c.id)])];
      const fi = base.indexOf(from), ti = base.indexOf(to);
      if (fi === -1 || ti === -1) return prev;
      const next = [...base];
      next.splice(fi, 1); next.splice(ti, 0, from);
      return next;
    });
    dragIdRef.current = null; dragOverId.current = null;
  }

  const conflictWarnings = useMemo(() => {
    const active = addedCourses.filter((c) => statuses[c.id] !== STATUS.UNAVAILABLE);
    const pairs = [];
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++)
        if (coursesConflict(active[i], active[j])) pairs.push([active[i], active[j]]);
    return pairs;
  }, [addedCourses, statuses]);

  const counts = useMemo(() => ({
    confirmed: eligibleCourses.filter((c) => statuses[c.id] === STATUS.CONFIRMED).length,
    pending:   eligibleCourses.filter((c) => !statuses[c.id] || statuses[c.id] === STATUS.PENDING).length,
    unavailable: eligibleCourses.filter((c) => statuses[c.id] === STATUS.UNAVAILABLE).length,
    withSecondary: eligibleCourses.filter((c) => secondaries[c.id]).length,
  }), [eligibleCourses, statuses, secondaries]);

  const filtered = useMemo(() => {
    if (!filter) return orderedCourses;
    const q = filter.toLowerCase();
    return orderedCourses.filter((c) =>
      c.title?.toLowerCase().includes(q) || c.codeMatiere?.toLowerCase().includes(q) || c.discipline?.toLowerCase().includes(q)
    );
  }, [orderedCourses, filter]);

  const pickerCourse = pickerFor ? byId.get(pickerFor) : null;
  const pickerCandidates = pickerFor ? findCandidateSecondaries(pickerFor, allProgramCourses, currentIds) : [];

  return (
    <div className="reg-tab">
      {/* Summary bar */}
      <div className="reg-summary-bar">
        <div className="reg-stat confirmed"><span className="reg-stat-n">{counts.confirmed}</span><span className="reg-stat-label">{s('Confirmed','Confirmé')}</span></div>
        <div className="reg-stat pending"><span className="reg-stat-n">{counts.pending}</span><span className="reg-stat-label">{s('Pending','En attente')}</span></div>
        <div className="reg-stat unavailable"><span className="reg-stat-n">{counts.unavailable}</span><span className="reg-stat-label">{s('Unavailable','Indisponible')}</span></div>
        <div className="reg-stat secondary"><span className="reg-stat-n">{counts.withSecondary}</span><span className="reg-stat-label">{s('Have secondary','Ont un secondaire')}</span></div>
        <div className="reg-hint-reorder">{s('Drag ⠿ to reorder priority','Glissez ⠿ pour réordonner')}</div>
        {conflictWarnings.length > 0 && <div className="reg-conflict-banner">⚠ {conflictWarnings.length} {s('time conflict(s)','conflit(s) horaire(s)')}</div>}
      </div>

      {/* Undo bar */}
      {undoStack.length > 0 && (
        <div className="undo-bar">
          {undoStack.slice().reverse().map((entry, i) => {
            const prev = byId.get(entry.prevPrimaryId);
            const rep  = byId.get(entry.replacedId);
            return (
              <div key={i} className="undo-entry">
                <span className="undo-label">{s('Swapped','Échangé')}:</span>
                <span className="undo-from">{prev?.title || entry.prevPrimaryId}</span>
                <span className="undo-arrow">→</span>
                <span className="undo-to">{rep?.title || entry.replacedId}</span>
                <button className="undo-btn" onClick={() => handleUndo(entry)}>↩ {s('Undo','Annuler')}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Avoid filters */}
      <AvoidFilters avoidDays={avoidDays} setAvoidDays={setAvoidDays} avoidSlots={avoidSlots} setAvoidSlots={setAvoidSlots} lang={lang} />

      {conflictWarnings.length > 0 && (
        <div className="reg-conflict-list">
          {conflictWarnings.map(([a, b], i) => (
            <div key={i} className="reg-conflict-row">
              <span className="reg-conflict-label">⚠</span>
              <strong>{a.title}</strong><span className="reg-conflict-vs">↔</span><strong>{b.title}</strong>
              <span className="reg-conflict-detail">{formatSchedule(a)} / {formatSchedule(b)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="reg-filter-bar">
        <input className="reg-filter-input" placeholder={s('Filter courses…','Filtrer les cours…')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="reg-filter-count">{filtered.length} / {eligibleCourses.length}</span>
      </div>

      <div className="reg-course-list">
        {eligibleCourses.length === 0 && <p className="reg-empty">{s('No courses yet. Add from the Planner tab.','Aucun cours. Ajoutez-en depuis le Planificateur.')}</p>}
        {filtered.map((course, idx) => {
          const status = statuses[course.id] || STATUS.PENDING;
          const meta   = STATUS_META[status];
          const secId  = secondaries[course.id];
          const secCourse = secId ? byId.get(secId) : null;
          const isUnavail = status === STATUS.UNAVAILABLE;
          const undoEntry = undoStack.find((e) => e.replacedId === course.id);

          return (
            <div key={course.id} className={`reg-course-card ${status}`}
              style={{ borderLeftColor: meta.color, background: meta.bg }}
              draggable onDragStart={(e) => handleDragStart(e, course.id)}
              onDragEnter={() => handleDragEnter(course.id)}
              onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}>
              <div className="reg-card-top">
                <span className="reg-drag-handle" title={s('Drag to reorder','Glisser pour réordonner')}>⠿</span>
                <span className="reg-priority-num">{idx + 1}</span>
                <div className="reg-card-info">
                  <div className="reg-card-title" style={{ textDecoration: isUnavail ? 'line-through' : 'none', color: isUnavail ? '#aaa' : undefined }}>
                    {course.title}
                    {undoEntry && <span className="swapped-in-badge">{s('Swapped in','Échangé')}</span>}
                  </div>
                  <div className="reg-card-meta">
                    {course.codeMatiere && <code>{course.codeMatiere}</code>}
                    {course.teacher1 && <span>{course.teacher1}</span>}
                    <span>{formatSchedule(course)}</span>
                    {course.confoscope1 != null ? <ConfoscopeTag score={course.confoscope1} /> : <NoRatingTag />}
                  </div>
                </div>
                <div className="reg-card-controls">
                  {/* Undo button for swapped-in courses */}
                  {undoEntry && (
                    <button className="reg-pill undo-pill" onClick={() => handleUndo(undoEntry)}>
                      ↩ {s('Undo swap','Annuler l\'échange')}
                    </button>
                  )}
                  {!isUnavail && (
                    <>
                      {status !== STATUS.CONFIRMED
                        ? <button className="reg-pill confirm" onClick={() => setStatus(course.id, STATUS.CONFIRMED)}>✓ {s('Confirm','Confirmer')}</button>
                        : <button className="reg-pill unconfirm" onClick={() => setStatus(course.id, STATUS.PENDING)}>↩ {s('Unconfirm','Annuler')}</button>}
                      <button className="reg-pill unavail" onClick={() => handleMarkUnavailable(course)}>✕ {s('Unavailable','Indisponible')}</button>
                    </>
                  )}
                  {isUnavail && <button className="reg-pill restore" onClick={() => setStatus(course.id, STATUS.PENDING)}>↩ {s('Restore','Restaurer')}</button>}
                </div>
              </div>

              {!isUnavail && (
                <div className="reg-secondary-row">
                  {secCourse ? (
                    <div className="reg-secondary-assigned">
                      <span className="reg-secondary-badge">2°</span>
                      <span className="reg-secondary-title">{secCourse.title}</span>
                      <span className="reg-secondary-sched">{formatSchedule(secCourse)}</span>
                      <button className="reg-secondary-edit" onClick={() => setPickerFor(course.id)}>{s('Change','Modifier')}</button>
                      <button className="reg-secondary-remove" onClick={() => setSecondaries((p) => { const n = { ...p }; delete n[course.id]; return n; })}>✕</button>
                    </div>
                  ) : (
                    <button className="reg-add-secondary" onClick={() => setPickerFor(course.id)}>+ {s('Add secondary','Ajouter un secondaire')}</button>
                  )}
                </div>
              )}
              {isUnavail && secCourse && <div className="reg-swapped-note">{s('Swapped to','Remplacé par')}: <strong>{secCourse.title}</strong> — {formatSchedule(secCourse)}</div>}
              {isUnavail && !secCourse && <div className="reg-no-secondary-warn">⚠ {s('No secondary assigned.','Aucun secondaire assigné.')}</div>}
            </div>
          );
        })}
      </div>

      {pickerFor && pickerCourse && (
        <SecondaryPicker course={pickerCourse} candidates={pickerCandidates} currentlyAssigned={secondaries[pickerFor] || null}
          onAssign={(secId) => setSecondaries((prev) => ({ ...prev, [pickerFor]: secId }))}
          onClose={() => setPickerFor(null)} lang={lang} />
      )}
      {swapResult && swapContext && (
        <SwapResultModal
          swapResult={swapResult}
          unavailableCourse={byId.get(swapContext.unavailableId)}
          allProgramCourses={allProgramCourses}
          currentIds={currentIds}
          avoidDays={avoidDays}
          avoidSlots={avoidSlots}
          onConfirm={applySwap}
          onCancel={() => { setSwapResult(null); setSwapContext(null); }}
          lang={lang}
        />
      )}
    </div>
  );
}
