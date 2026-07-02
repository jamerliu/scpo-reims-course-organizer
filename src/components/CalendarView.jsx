import { useLang } from '../i18n/LangContext';
import { DAYS, GRID_START_MIN, GRID_END_MIN, blockStyle, findConflicts } from '../utils/schedule';

const HOURS = [];
for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) HOURS.push(m);

const PALETTE = ['#5b8def','#e07a5f','#81b29a','#f2cc8f','#9b5de5','#00bbf9','#f15bb5','#43aa8b'];
function colorFor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % PALETTE.length;
  return PALETTE[hash];
}

export default function CalendarView({ addedCourses, onDrop, onRemove }) {
  const { t } = useLang();
  const dayLabels = t('calDays');
  const conflicts = findConflicts(addedCourses);

  function handleDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/course-id');
    if (id) onDrop(id);
  }

  return (
    <div className="calendar-wrap" id="calendar-export-target">
      <div className="calendar-header">
        <div className="time-gutter" />
        {DAYS.map((d) => (
          <div className="day-header" key={d}>{dayLabels[d]}</div>
        ))}
      </div>
      <div className="calendar-grid" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        <div className="time-gutter">
          {HOURS.map((m) => (
            <div className="hour-label" key={m} style={{ top: `${((m - GRID_START_MIN) / (GRID_END_MIN - GRID_START_MIN)) * 100}%` }}>
              {String(Math.floor(m / 60)).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {DAYS.map((day) => (
          <div className="day-column" key={day}>
            {HOURS.map((m) => (
              <div className="hour-line" key={m} style={{ top: `${((m - GRID_START_MIN) / (GRID_END_MIN - GRID_START_MIN)) * 100}%` }} />
            ))}
            {addedCourses.flatMap((c) =>
              (c.schedule || []).filter((s) => s.day === day).map((s, idx) => {
                const style = blockStyle(s.start, s.end);
                const isConflict = conflicts.has(c.id);
                return (
                  <div
                    key={`${c.id}-${idx}`}
                    className={isConflict ? 'course-block conflict' : 'course-block'}
                    style={{ ...style, background: colorFor(c.id) }}
                    title={`${c.title}\n${s.start}-${s.end}${s.note ? ` (${s.note})` : ''}`}
                  >
                    <button className="remove-block" onClick={() => onRemove(c.id)}>×</button>
                    <div className="block-title">{c.title}</div>
                    <div className="block-sub">{s.start}–{s.end}</div>
                    {s.note && <div className="block-note">{s.note}</div>}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
      {conflicts.size > 0 && <p className="conflict-note">{t('conflictNote')}</p>}
    </div>
  );
}
