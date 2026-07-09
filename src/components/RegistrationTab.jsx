import { useState, useMemo, useRef } from 'react';
import { useLang } from '../i18n/LangContext';
import { ConfoscopeTag, NoRatingTag } from './Modal';
import { propagateSwap, findCandidateSecondaries, coursesConflict } from '../utils/registrationEngine';
import { formatSchedule } from '../utils/schedule';
import coursesData from '../data/courses.json';

const byId = new Map(coursesData.map((c) => [c.id, c]));

const STATUS = {
  PENDING:     'pending',     // not yet enrolled, schedule slot held
  CONFIRMED:   'confirmed',   // successfully enrolled — locked
  UNAVAILABLE: 'unavailable', // course was full / removed
};

const STATUS_META = {
  pending:     { label: 'Pending',     labelFr: 'En attente',   color: '#6B7280', bg: 'rgba(163,177,198,0.15)' },
  confirmed:   { label: 'Confirmed',   labelFr: 'Confirmé',     color: '#38B2AC', bg: 'rgba(56,178,172,0.1)'  },
  unavailable: { label: 'Unavailable', labelFr: 'Indisponible', color: '#E05252', bg: 'rgba(224,82,82,0.08)' },
};

// ── Secondary picker modal ─────────────────────────────────────────────────

function SecondaryPicker({ course, candidates, currentlyAssigned, onAssign, onClose, lang }) {
  const [dragOver, setDragOver] = useState(false);
  const [picked, setPicked]     = useState(currentlyAssigned || null);

  const s = (en, fr) => lang === 'fr' ? fr : en;

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('reg-secondary-id');
    if (id) setPicked(id);
  }

  const pickedCourse = picked ? byId.get(picked) : null;

  return (
    <div className="reg-modal-backdrop" onClick={onClose}>
      <div className="reg-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{s('Set secondary for', 'Définir le secondaire pour')}:</h3>
        <div className="reg-modal-primary-label">{course.title} <code>{course.codeMatiere}</code></div>

        <p className="reg-modal-hint">
          {s(
            'Drag a candidate from the list below onto the drop zone, or click one to select it.',
            'Glissez un cours candidat sur la zone de dépôt, ou cliquez pour le sélectionner.'
          )}
        </p>

        {/* Drop zone */}
        <div
          className={`reg-drop-zone ${dragOver ? 'drag-over' : ''} ${pickedCourse ? 'has-pick' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {pickedCourse ? (
            <div className="reg-drop-picked">
              <span className="reg-drop-picked-title">{pickedCourse.title}</span>
              <span className="reg-drop-picked-meta">{formatSchedule(pickedCourse)}</span>
              <button className="reg-drop-clear" onClick={() => setPicked(null)}>✕</button>
            </div>
          ) : (
            <span className="reg-drop-hint-text">
              {dragOver
                ? (s('Drop here', 'Déposer ici'))
                : (s('Drop secondary course here', 'Déposez le cours secondaire ici'))}
            </span>
          )}
        </div>

        {/* Candidate list */}
        <div className="reg-candidates">
          {candidates.length === 0 && (
            <p className="reg-no-candidates">
              {s('No alternative sections found for this course code.', 'Aucune section alternative trouvée pour ce code.')}
            </p>
          )}
          {candidates.map((c) => (
            <div
              key={c.id}
              className={`reg-candidate ${picked === c.id ? 'selected' : ''}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('reg-secondary-id', c.id)}
              onClick={() => setPicked(c.id === picked ? null : c.id)}
            >
              <div className="reg-candidate-title">{c.title}</div>
              <div className="reg-candidate-meta">
                <span>{formatSchedule(c)}</span>
                {c.teacher1 && <span>{c.teacher1}</span>}
                {c.confoscope1 != null
                  ? <ConfoscopeTag score={c.confoscope1} />
                  : <NoRatingTag />}
              </div>
            </div>
          ))}
        </div>

        <div className="reg-modal-actions">
          <button className="reg-modal-cancel" onClick={onClose}>{s('Cancel', 'Annuler')}</button>
          <button
            className="reg-modal-save"
            disabled={!picked}
            onClick={() => { onAssign(picked); onClose(); }}
          >
            {s('Save secondary', 'Enregistrer le secondaire')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Swap result modal ──────────────────────────────────────────────────────

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
            <div className="swap-block-title">
              ⛔ {s('Conflicts with confirmed (locked) courses — secondary may not work:', 'Conflits avec des cours confirmés (verrouillés) — le secondaire peut ne pas fonctionner :')}
            </div>
            {conflictsWithConfirmed.map((c) => (
              <div key={c.id} className="swap-conflict-item">
                <strong>{c.title}</strong> — {formatSchedule(c)}
              </div>
            ))}
          </div>
        )}

        {conflictsWithPending.length > 0 && (
          <div className="swap-block conflict-pending">
            <div className="swap-block-title">
              ⚠ {s('These pending courses now conflict — you\'ll need to re-select them:', 'Ces cours en attente sont maintenant en conflit — vous devrez les re-sélectionner :')}
            </div>
            {conflictsWithPending.map((c) => (
              <div key={c.id} className="swap-conflict-item">
                <strong>{c.title}</strong> — {formatSchedule(c)}
              </div>
            ))}
          </div>
        )}

        {conflictsWithConfirmed.length === 0 && conflictsWithPending.length === 0 && (
          <div className="swap-block no-conflicts">
            ✓ {s('No conflicts — the secondary fits your schedule cleanly.', 'Aucun conflit — le secondaire s\'intègre parfaitement à votre emploi du temps.')}
          </div>
        )}

        <div className="reg-modal-actions">
          <button className="reg-modal-cancel" onClick={onCancel}>{s('Cancel', 'Annuler')}</button>
          <button className="reg-modal-save" onClick={onConfirm}>
            {s('Apply swap', 'Appliquer l\'échange')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Registration Tab ──────────────────────────────────────────────────

export default function RegistrationTab({
  addedCourses,
  allProgramCourses,
  onUpdateIds,          // (newIds: string[]) => void  — replaces addedIds after a swap
}) {
  const { lang } = useLang();
  const s = (en, fr) => lang === 'fr' ? fr : en;

  // Per-course status: { [id]: STATUS }
  const [statuses, setStatuses]       = useState({});
  // Secondary assignments: { [primaryId]: secondaryId }
  const [secondaries, setSecondaries] = useState({});
  // Which picker is open
  const [pickerFor, setPickerFor]     = useState(null);
  // Pending swap result to confirm
  const [swapResult, setSwapResult]   = useState(null);
  const [swapContext, setSwapContext]  = useState(null); // { unavailableId, secondaryId }
  // Search/filter
  const [filter, setFilter]           = useState('');

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
    if (!secId) {
      // No secondary — just mark unavailable, warn user
      setStatus(course.id, STATUS.UNAVAILABLE);
      return;
    }
    // Compute conflict propagation
    const result = propagateSwap({
      unavailableId: course.id,
      secondaryId: secId,
      currentIds,
      confirmedIds,
    });
    if (!result) return;
    setSwapResult(result);
    setSwapContext({ unavailableId: course.id, secondaryId: secId });
  }

  function applySwap() {
    const { unavailableId, secondaryId } = swapContext;
    // Replace primary with secondary in the course list
    const newIds = currentIds.map((id) => id === unavailableId ? secondaryId : id);
    // Mark conflicts-with-pending as pending (they stay but are flagged)
    const conflictIds = new Set(swapResult.conflictsWithPending.map((c) => c.id));
    setStatuses((prev) => {
      const next = { ...prev, [unavailableId]: STATUS.UNAVAILABLE, [secondaryId]: STATUS.PENDING };
      conflictIds.forEach((id) => { next[id] = STATUS.PENDING; });
      return next;
    });
    // Remove secondaries that now conflict (they need new secondaries)
    setSecondaries((prev) => {
      const next = { ...prev };
      conflictIds.forEach((id) => { delete next[id]; });
      delete next[unavailableId];
      return next;
    });
    onUpdateIds(newIds);
    setSwapResult(null);
    setSwapContext(null);
  }

  function assignSecondary(primaryId, secondaryId) {
    setSecondaries((prev) => ({ ...prev, [primaryId]: secondaryId }));
  }

  const pickerCourse = pickerFor ? byId.get(pickerFor) : null;
  const pickerCandidates = pickerFor
    ? findCandidateSecondaries(pickerFor, allProgramCourses, currentIds)
    : [];

  const filtered = useMemo(() => {
    if (!filter) return addedCourses;
    const q = filter.toLowerCase();
    return addedCourses.filter((c) =>
      c.title?.toLowerCase().includes(q) ||
      c.codeMatiere?.toLowerCase().includes(q) ||
      c.discipline?.toLowerCase().includes(q)
    );
  }, [addedCourses, filter]);

  // Group by status for the summary bar
  const counts = useMemo(() => ({
    confirmed:   addedCourses.filter((c) => statuses[c.id] === STATUS.CONFIRMED).length,
    pending:     addedCourses.filter((c) => !statuses[c.id] || statuses[c.id] === STATUS.PENDING).length,
    unavailable: addedCourses.filter((c) => statuses[c.id] === STATUS.UNAVAILABLE).length,
    withSecondary: addedCourses.filter((c) => secondaries[c.id]).length,
  }), [addedCourses, statuses, secondaries]);

  // Find conflict warnings: any two pending/confirmed courses that clash
  const conflictWarnings = useMemo(() => {
    const active = addedCourses.filter((c) => statuses[c.id] !== STATUS.UNAVAILABLE);
    const pairs = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (coursesConflict(active[i], active[j])) {
          pairs.push([active[i], active[j]]);
        }
      }
    }
    return pairs;
  }, [addedCourses, statuses]);

  return (
    <div className="reg-tab">
      {/* Summary bar */}
      <div className="reg-summary-bar">
        <div className="reg-stat confirmed">
          <span className="reg-stat-n">{counts.confirmed}</span>
          <span className="reg-stat-label">{s('Confirmed', 'Confirmé')}</span>
        </div>
        <div className="reg-stat pending">
          <span className="reg-stat-n">{counts.pending}</span>
          <span className="reg-stat-label">{s('Pending', 'En attente')}</span>
        </div>
        <div className="reg-stat unavailable">
          <span className="reg-stat-n">{counts.unavailable}</span>
          <span className="reg-stat-label">{s('Unavailable', 'Indisponible')}</span>
        </div>
        <div className="reg-stat secondary">
          <span className="reg-stat-n">{counts.withSecondary}</span>
          <span className="reg-stat-label">{s('Have secondary', 'Ont un secondaire')}</span>
        </div>

        {conflictWarnings.length > 0 && (
          <div className="reg-conflict-banner">
            ⚠ {conflictWarnings.length} {s('time conflict(s) detected', 'conflit(s) horaire(s) détecté(s)')}
          </div>
        )}
      </div>

      {/* Conflict detail */}
      {conflictWarnings.length > 0 && (
        <div className="reg-conflict-list">
          {conflictWarnings.map(([a, b], i) => (
            <div key={i} className="reg-conflict-row">
              <span className="reg-conflict-label">⚠</span>
              <strong>{a.title}</strong>
              <span className="reg-conflict-vs">↔</span>
              <strong>{b.title}</strong>
              <span className="reg-conflict-detail">{formatSchedule(a)} / {formatSchedule(b)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="reg-filter-bar">
        <input
          className="reg-filter-input"
          placeholder={s('Filter courses…', 'Filtrer les cours…')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="reg-filter-count">{filtered.length} / {addedCourses.length}</span>
      </div>

      {/* Course list */}
      <div className="reg-course-list">
        {filtered.length === 0 && (
          <p className="reg-empty">{s('No courses in your schedule yet. Add them from the Planner tab.', 'Aucun cours dans votre emploi du temps. Ajoutez-en depuis l\'onglet Planificateur.')}</p>
        )}
        {filtered.map((course) => {
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
            >
              {/* Top row: title + status controls */}
              <div className="reg-card-top">
                <div className="reg-card-info">
                  <div className="reg-card-title" style={{ textDecoration: isUnavail ? 'line-through' : 'none', color: isUnavail ? '#aaa' : undefined }}>
                    {course.title}
                  </div>
                  <div className="reg-card-meta">
                    {course.codeMatiere && <code>{course.codeMatiere}</code>}
                    {course.teacher1 && <span>{course.teacher1}</span>}
                    <span>{formatSchedule(course)}</span>
                    {course.confoscope1 != null
                      ? <ConfoscopeTag score={course.confoscope1} />
                      : <NoRatingTag />}
                  </div>
                </div>

                <div className="reg-card-controls">
                  {/* Status pills */}
                  {!isUnavail && (
                    <>
                      {status !== STATUS.CONFIRMED && (
                        <button
                          className="reg-pill confirm"
                          onClick={() => setStatus(course.id, STATUS.CONFIRMED)}
                          title={s('Mark as confirmed enrolled', 'Marquer comme inscrit confirmé')}
                        >
                          ✓ {s('Confirm', 'Confirmer')}
                        </button>
                      )}
                      {status === STATUS.CONFIRMED && (
                        <button
                          className="reg-pill unconfirm"
                          onClick={() => setStatus(course.id, STATUS.PENDING)}
                        >
                          ↩ {s('Unconfirm', 'Annuler confirmation')}
                        </button>
                      )}
                      <button
                        className="reg-pill unavail"
                        onClick={() => handleMarkUnavailable(course)}
                        title={s('Mark as unavailable / full', 'Marquer comme indisponible / complet')}
                      >
                        ✕ {s('Unavailable', 'Indisponible')}
                      </button>
                    </>
                  )}
                  {isUnavail && (
                    <button
                      className="reg-pill restore"
                      onClick={() => setStatus(course.id, STATUS.PENDING)}
                    >
                      ↩ {s('Restore', 'Restaurer')}
                    </button>
                  )}
                </div>
              </div>

              {/* Secondary row */}
              {!isUnavail && (
                <div className="reg-secondary-row">
                  {secCourse ? (
                    <div className="reg-secondary-assigned">
                      <span className="reg-secondary-badge">2°</span>
                      <span className="reg-secondary-title">{secCourse.title}</span>
                      <span className="reg-secondary-sched">{formatSchedule(secCourse)}</span>
                      <button
                        className="reg-secondary-edit"
                        onClick={() => setPickerFor(course.id)}
                      >
                        {s('Change', 'Modifier')}
                      </button>
                      <button
                        className="reg-secondary-remove"
                        onClick={() => setSecondaries((p) => { const n = { ...p }; delete n[course.id]; return n; })}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="reg-add-secondary"
                      onClick={() => setPickerFor(course.id)}
                    >
                      + {s('Add secondary', 'Ajouter un secondaire')}
                    </button>
                  )}
                </div>
              )}

              {/* Unavailable note with secondary info */}
              {isUnavail && secCourse && (
                <div className="reg-swapped-note">
                  {s('Swapped to', 'Remplacé par')}: <strong>{secCourse.title}</strong> — {formatSchedule(secCourse)}
                </div>
              )}
              {isUnavail && !secCourse && (
                <div className="reg-no-secondary-warn">
                  ⚠ {s('No secondary assigned — no automatic replacement available.', 'Aucun secondaire assigné — aucun remplacement automatique disponible.')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {pickerFor && pickerCourse && (
        <SecondaryPicker
          course={pickerCourse}
          candidates={pickerCandidates}
          currentlyAssigned={secondaries[pickerFor] || null}
          onAssign={(secId) => assignSecondary(pickerFor, secId)}
          onClose={() => setPickerFor(null)}
          lang={lang}
        />
      )}
      {swapResult && swapContext && (
        <SwapResultModal
          swapResult={swapResult}
          unavailableCourse={byId.get(swapContext.unavailableId)}
          onConfirm={applySwap}
          onCancel={() => { setSwapResult(null); setSwapContext(null); }}
          lang={lang}
        />
      )}
    </div>
  );
}
