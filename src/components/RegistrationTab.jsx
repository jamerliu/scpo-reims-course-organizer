import { useState, useMemo, useRef } from 'react';
import { useLang } from '../i18n/LangContext';
import { ConfoscopeTag, NoRatingTag } from './Modal';
import { propagateSwap, findCandidateSecondaries, coursesConflict } from '../utils/registrationEngine';
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

// ── Secondary Picker Modal ────────────────────────────────────────────────────

function SecondaryPicker({ course, candidates, currentlyAssigned, onAssign, onClose, lang }) {
  const [dragOver, setDragOver] = useState(false);
  const [picked, setPicked]     = useState(currentlyAssigned || null);
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
            <span className="reg-drop-hint-text">{dragOver ? s('Drop here', 'Déposer ici') : s('Drop secondary course here', 'Déposez le cours secondaire ici')}</span>
          )}
        </div>

        <div className="reg-candidates">
          {candidates.length === 0 && <p className="reg-no-candidates">{s('No alternative sections found.', 'Aucune section alternative trouvée.')}</p>}
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
          <button className="reg-modal-cancel" onClick={onClose}>{s('Cancel', 'Annuler')}</button>
          <button className="reg-modal-save" disabled={!picked} onClick={() => { onAssign(picked); onClose(); }}>
            {s('Save secondary', 'Enregistrer le secondaire')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Swap Result Modal ─────────────────────────────────────────────────────────

function SwapResultModal({ swapResult, unavailableCourse, onConfirm, onCancel, lang }) {
  const s = (en, fr) => lang === 'fr' ? fr : en;
  const { secondary, conflictsWithConfirmed, conflictsWithPending } = swapResult;

  return (
    <div className="reg-modal-backdrop" onClick={onCancel}>
      <div className="reg-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h3>{s('Swap result', 'Résultat de l\'échange')}</h3>
        <div className="swap-summary">
          <div className="swap-row">
            <span className="swap-label">{s('Dropping', 'Suppression')}</span>
            <span className="swap-course unavail">{unavailableCourse.title}</span>
          </div>
          <div className="swap-arrow">↓</div>
          <div className="swap-row">
            <span className="swap-label">{s('Secondary', 'Secondaire')}</span>
            <span className="swap-course secondary">{secondary.title}</span>
            <span className="swap-sched">{formatSchedule(secondary)}</span>
          </div>
        </div>

        {conflictsWithConfirmed.length > 0 && (
          <div className="swap-block conflict-confirmed">
            <div className="swap-block-title">⛔ {s('Conflicts with confirmed (locked) courses:', 'Conflits avec des cours confirmés (verrouillés) :')}</div>
            {conflictsWithConfirmed.map((c) => <div key={c.id} className="swap-conflict-item"><strong>{c.title}</strong> — {formatSchedule(c)}</div>)}
          </div>
        )}
        {conflictsWithPending.length > 0 && (
          <div className="swap-block conflict-pending">
            <div className="swap-block-title">⚠ {s('These pending courses now conflict — you\'ll need to re-select them:', 'Ces cours en attente sont maintenant en conflit :')}</div>
            {conflictsWithPending.map((c) => <div key={c.id} className="swap-conflict-item"><strong>{c.title}</strong> — {formatSchedule(c)}</div>)}
          </div>
        )}
        {conflictsWithConfirmed.length === 0 && conflictsWithPending.length === 0 && (
          <div className="swap-block no-conflicts">✓ {s('No conflicts — the secondary fits cleanly.', 'Aucun conflit — le secondaire s\'intègre parfaitement.')}</div>
        )}

        <div className="reg-modal-actions">
          <button className="reg-modal-cancel" onClick={onCancel}>{s('Cancel', 'Annuler')}</button>
          <button className="reg-modal-save" onClick={onConfirm}>{s('Apply swap', 'Appliquer l\'échange')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Registration Tab ─────────────────────────────────────────────────────

export default function RegistrationTab({
  addedCourses,
  allProgramCourses,
  statuses, setStatuses,
  secondaries, setSecondaries,
  order, setOrder,
  onUpdateIds,
}) {
  const { lang } = useLang();
  const s = (en, fr) => lang === 'fr' ? fr : en;

  const [pickerFor, setPickerFor]   = useState(null);
  const [swapResult, setSwapResult] = useState(null);
  const [swapContext, setSwapContext] = useState(null);
  const [filter, setFilter]         = useState('');

  // Exclude lectures
  const eligibleCourses = useMemo(
    () => addedCourses.filter((c) => !isLecture(c)),
    [addedCourses]
  );

  // Build display list following the user-defined order
  const orderedCourses = useMemo(() => {
    const idToC = new Map(eligibleCourses.map((c) => [c.id, c]));
    // IDs in order that are still in eligibleCourses
    const ordered = order.filter((id) => idToC.has(id)).map((id) => idToC.get(id));
    // Any eligible courses not yet in order (newly added) go at end
    const inOrder = new Set(order);
    const extra = eligibleCourses.filter((c) => !inOrder.has(c.id));
    return [...ordered, ...extra];
  }, [eligibleCourses, order]);

  const confirmedIds = useMemo(
    () => new Set(Object.entries(statuses).filter(([, v]) => v === STATUS.CONFIRMED).map(([k]) => k)),
    [statuses]
  );

  const currentIds = useMemo(() => addedCourses.map((c) => c.id), [addedCourses]);

  function setStatus(id, status) {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }

  function handleMarkUnavailable(course) {
    const secId = secondaries[course.id];
    if (!secId) { setStatus(course.id, STATUS.UNAVAILABLE); return; }
    const result = propagateSwap({ unavailableId: course.id, secondaryId: secId, currentIds, confirmedIds });
    if (!result) return;
    setSwapResult(result);
    setSwapContext({ unavailableId: course.id, secondaryId: secId });
  }

  function applySwap() {
    const { unavailableId, secondaryId } = swapContext;
    const newIds = currentIds.map((id) => id === unavailableId ? secondaryId : id);
    const conflictIds = new Set(swapResult.conflictsWithPending.map((c) => c.id));
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

  // Drag-to-reorder state
  const dragIdRef  = useRef(null);
  const dragOverId = useRef(null);

  function handleDragStart(e, id) {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('reg-reorder-id', id);
  }
  function handleDragEnter(id) { dragOverId.current = id; }
  function handleDragEnd() {
    const from = dragIdRef.current;
    const to   = dragOverId.current;
    if (!from || !to || from === to) { dragIdRef.current = null; dragOverId.current = null; return; }
    setOrder((prev) => {
      const base = [...new Set([...prev, ...orderedCourses.map((c) => c.id)])];
      const fromIdx = base.indexOf(from);
      const toIdx   = base.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...base];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      return next;
    });
    dragIdRef.current = null;
    dragOverId.current = null;
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
    confirmed:   eligibleCourses.filter((c) => statuses[c.id] === STATUS.CONFIRMED).length,
    pending:     eligibleCourses.filter((c) => !statuses[c.id] || statuses[c.id] === STATUS.PENDING).length,
    unavailable: eligibleCourses.filter((c) => statuses[c.id] === STATUS.UNAVAILABLE).length,
    withSecondary: eligibleCourses.filter((c) => secondaries[c.id]).length,
  }), [eligibleCourses, statuses, secondaries]);

  const filtered = useMemo(() => {
    if (!filter) return orderedCourses;
    const q = filter.toLowerCase();
    return orderedCourses.filter((c) =>
      c.title?.toLowerCase().includes(q) ||
      c.codeMatiere?.toLowerCase().includes(q) ||
      c.discipline?.toLowerCase().includes(q)
    );
  }, [orderedCourses, filter]);

  const pickerCourse = pickerFor ? byId.get(pickerFor) : null;
  const pickerCandidates = pickerFor ? findCandidateSecondaries(pickerFor, allProgramCourses, currentIds) : [];

  return (
    <div className="reg-tab">
      {/* Summary bar */}
      <div className="reg-summary-bar">
        <div className="reg-stat confirmed"><span className="reg-stat-n">{counts.confirmed}</span><span className="reg-stat-label">{s('Confirmed', 'Confirmé')}</span></div>
        <div className="reg-stat pending"><span className="reg-stat-n">{counts.pending}</span><span className="reg-stat-label">{s('Pending', 'En attente')}</span></div>
        <div className="reg-stat unavailable"><span className="reg-stat-n">{counts.unavailable}</span><span className="reg-stat-label">{s('Unavailable', 'Indisponible')}</span></div>
        <div className="reg-stat secondary"><span className="reg-stat-n">{counts.withSecondary}</span><span className="reg-stat-label">{s('Have secondary', 'Ont un secondaire')}</span></div>
        <div className="reg-hint-reorder">{s('Drag ⠿ to reorder priority', 'Glissez ⠿ pour réordonner')}</div>
        {conflictWarnings.length > 0 && (
          <div className="reg-conflict-banner">⚠ {conflictWarnings.length} {s('time conflict(s)', 'conflit(s) horaire(s)')}</div>
        )}
      </div>

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
        <input className="reg-filter-input" placeholder={s('Filter courses…', 'Filtrer les cours…')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="reg-filter-count">{filtered.length} / {eligibleCourses.length}</span>
      </div>

      <div className="reg-course-list">
        {eligibleCourses.length === 0 && (
          <p className="reg-empty">{s('No courses in your schedule yet. Add them from the Planner tab.', 'Aucun cours. Ajoutez-en depuis l\'onglet Planificateur.')}</p>
        )}
        {filtered.map((course, idx) => {
          const status = statuses[course.id] || STATUS.PENDING;
          const meta   = STATUS_META[status];
          const secId  = secondaries[course.id];
          const secCourse = secId ? byId.get(secId) : null;
          const isUnavail = status === STATUS.UNAVAILABLE;

          return (
            <div
              key={course.id}
              className={`reg-course-card ${status}`}
              style={{ borderLeftColor: meta.color, background: meta.bg }}
              draggable
              onDragStart={(e) => handleDragStart(e, course.id)}
              onDragEnter={() => handleDragEnter(course.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="reg-card-top">
                <span className="reg-drag-handle" title={s('Drag to reorder', 'Glisser pour réordonner')}>⠿</span>
                <span className="reg-priority-num">{idx + 1}</span>
                <div className="reg-card-info">
                  <div className="reg-card-title" style={{ textDecoration: isUnavail ? 'line-through' : 'none', color: isUnavail ? '#aaa' : undefined }}>
                    {course.title}
                  </div>
                  <div className="reg-card-meta">
                    {course.codeMatiere && <code>{course.codeMatiere}</code>}
                    {course.teacher1 && <span>{course.teacher1}</span>}
                    <span>{formatSchedule(course)}</span>
                    {course.confoscope1 != null ? <ConfoscopeTag score={course.confoscope1} /> : <NoRatingTag />}
                  </div>
                </div>
                <div className="reg-card-controls">
                  {!isUnavail && (
                    <>
                      {status !== STATUS.CONFIRMED
                        ? <button className="reg-pill confirm" onClick={() => setStatus(course.id, STATUS.CONFIRMED)}>✓ {s('Confirm', 'Confirmer')}</button>
                        : <button className="reg-pill unconfirm" onClick={() => setStatus(course.id, STATUS.PENDING)}>↩ {s('Unconfirm', 'Annuler')}</button>}
                      <button className="reg-pill unavail" onClick={() => handleMarkUnavailable(course)}>✕ {s('Unavailable', 'Indisponible')}</button>
                    </>
                  )}
                  {isUnavail && <button className="reg-pill restore" onClick={() => setStatus(course.id, STATUS.PENDING)}>↩ {s('Restore', 'Restaurer')}</button>}
                </div>
              </div>

              {!isUnavail && (
                <div className="reg-secondary-row">
                  {secCourse ? (
                    <div className="reg-secondary-assigned">
                      <span className="reg-secondary-badge">2°</span>
                      <span className="reg-secondary-title">{secCourse.title}</span>
                      <span className="reg-secondary-sched">{formatSchedule(secCourse)}</span>
                      <button className="reg-secondary-edit" onClick={() => setPickerFor(course.id)}>{s('Change', 'Modifier')}</button>
                      <button className="reg-secondary-remove" onClick={() => setSecondaries((p) => { const n = { ...p }; delete n[course.id]; return n; })}>✕</button>
                    </div>
                  ) : (
                    <button className="reg-add-secondary" onClick={() => setPickerFor(course.id)}>+ {s('Add secondary', 'Ajouter un secondaire')}</button>
                  )}
                </div>
              )}
              {isUnavail && secCourse && <div className="reg-swapped-note">{s('Swapped to', 'Remplacé par')}: <strong>{secCourse.title}</strong> — {formatSchedule(secCourse)}</div>}
              {isUnavail && !secCourse && <div className="reg-no-secondary-warn">⚠ {s('No secondary assigned.', 'Aucun secondaire assigné.')}</div>}
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
        <SwapResultModal swapResult={swapResult} unavailableCourse={byId.get(swapContext.unavailableId)}
          onConfirm={applySwap} onCancel={() => { setSwapResult(null); setSwapContext(null); }} lang={lang} />
      )}
    </div>
  );
}
