import { useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { formatSchedule } from '../utils/schedule';

// Generic fullscreen overlay modal
export function Modal({ onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}

// Detail card for a single course — used when clicking a calendar block
export function CourseDetailModal({ course, onClose, onRemove }) {
  const { t } = useLang();
  const color = courseColor(course.id);

  return (
    <Modal onClose={onClose}>
      <div className="course-detail">
        <div className="course-detail-stripe" style={{ background: color }} />
        <div className="course-detail-body">
          <h2>{course.title}</h2>
          <div className="course-detail-grid">
            <Field label={t('colDiscipline')}  value={course.discipline || course.majeure} />
            <Field label={t('colType')}         value={course.type} />
            <Field label={t('colCode')}         value={course.codeMatiere} />
            <Field label={t('colUp')}           value={course.up} />
            <Field label={t('colEns1')}         value={course.teacher1}
              extra={course.confoscope1 != null ? <ConfoscopeTag score={course.confoscope1} /> : <NoRatingTag />}
            />
            {course.teacher2 && (
              <Field label={t('colEns2')} value={course.teacher2}
                extra={course.confoscope2 != null ? <ConfoscopeTag score={course.confoscope2} /> : <NoRatingTag />}
              />
            )}
            <Field label={t('colSchedule')}     value={formatSchedule(course)} span />
            {course.niveau && <Field label={t('colNiveau')} value={course.niveau} />}
          </div>
          <div className="course-detail-actions">
            <button className="remove-btn-modal" onClick={() => { onRemove(course.id); onClose(); }}>
              {t('remove')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Fullscreen table of all selected courses
export function CourseListModal({ addedCourses, onClose, onRemove }) {
  const { t } = useLang();
  return (
    <Modal onClose={onClose}>
      <div className="course-list-modal">
        <h2>{t('selectedCourses', { n: addedCourses.length })}</h2>
        {addedCourses.length === 0 && <p className="hint">{t('addHint')}</p>}
        <div className="modal-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('colTitle')}</th>
                <th>{t('colDiscipline')}</th>
                <th>{t('colType')}</th>
                <th>{t('colUp')}</th>
                <th>{t('colCode')}</th>
                <th>{t('colSchedule')}</th>
                <th>{t('colEns1')}</th>
                <th>{t('colEns2')}</th>
                <th>Confoscope</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {addedCourses.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.discipline || c.majeure || '—'}</td>
                  <td>{c.type}</td>
                  <td>{c.up}</td>
                  <td>{c.codeMatiere}</td>
                  <td>{formatSchedule(c)}</td>
                  <td>{c.teacher1 || ''}</td>
                  <td>{c.teacher2 || ''}</td>
                  <td>
                    {c.confoscope1 != null
                      ? <ConfoscopeTag score={c.confoscope1} />
                      : <NoRatingTag />}
                  </td>
                  <td>
                    <button className="remove-link" onClick={() => onRemove(c.id)}>
                      {t('remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value, span, extra }) {
  if (!value && value !== 0) return null;
  return (
    <div className={span ? 'detail-field span' : 'detail-field'}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
      {extra && <div className="detail-extra">{extra}</div>}
    </div>
  );
}

function ratingColor(score) {
  if (score >= 8) return { bg: '#d4f0ea', text: '#1a6b5a', border: '#38B2AC' };
  if (score >= 6) return { bg: '#fff7d4', text: '#7c5700', border: '#e0a020' };
  return { bg: '#fde8e8', text: '#8b1a1a', border: '#E05252' };
}

export function ConfoscopeTag({ score }) {
  const { bg, text, border } = ratingColor(score);
  return (
    <span className="confoscope-tag" style={{ background: bg, color: text, borderColor: border }}>
      Confoscope Rating: {score.toFixed(1)}/10
    </span>
  );
}

export function NoRatingTag() {
  return <span className="confoscope-tag no-rating">No Confoscope Rating</span>;
}

const PALETTE = ['#5b8def','#e07a5f','#81b29a','#f2cc8f','#9b5de5','#00bbf9','#f15bb5','#43aa8b'];
export function courseColor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % PALETTE.length;
  return PALETTE[hash];
}
