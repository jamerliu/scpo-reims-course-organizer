import { useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { CourseListModal } from './Modal';

export default function AddedList({ addedCourses, onRemove }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Compact trigger — sits below the calendar */}
      <div className="added-list-trigger" id="list-export-target">
        <button className="course-list-btn" onClick={() => setOpen(true)}>
          <span className="course-list-btn-icon">☰</span>
          {t('selectedCourses', { n: addedCourses.length })}
          {addedCourses.length > 0 && (
            <span className="course-list-btn-hint">— click to view full details</span>
          )}
        </button>
      </div>

      {open && (
        <CourseListModal
          addedCourses={addedCourses}
          onClose={() => setOpen(false)}
          onRemove={onRemove}
        />
      )}
    </>
  );
}
