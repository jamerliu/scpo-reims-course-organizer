export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const DAY_LABELS = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };

export const GRID_START_MIN = 8 * 60; // 08:00
export const GRID_END_MIN = 21 * 60;  // 21:00
export const GRID_SPAN_MIN = GRID_END_MIN - GRID_START_MIN;

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function blockStyle(startHHMM, endHHMM) {
  const start = Math.max(toMinutes(startHHMM), GRID_START_MIN);
  const end = Math.min(toMinutes(endHHMM), GRID_END_MIN);
  const top = ((start - GRID_START_MIN) / GRID_SPAN_MIN) * 100;
  const height = ((end - start) / GRID_SPAN_MIN) * 100;
  return { top: `${top}%`, height: `${Math.max(height, 2)}%` };
}

// Returns a Set of course IDs that have at least one overlapping time block
// with another added course, for conflict highlighting.
export function findConflicts(addedCourses) {
  const blocks = [];
  addedCourses.forEach((c) => {
    (c.schedule || []).forEach((s) => {
      blocks.push({ courseId: c.id, day: s.day, start: toMinutes(s.start), end: toMinutes(s.end) });
    });
  });
  const conflictIds = new Set();
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.courseId === b.courseId) continue;
      if (a.day !== b.day) continue;
      if (a.start < b.end && b.start < a.end) {
        conflictIds.add(a.courseId);
        conflictIds.add(b.courseId);
      }
    }
  }
  return conflictIds;
}

export function formatSchedule(course) {
  if (!course.schedule || course.schedule.length === 0) return 'TBD';
  return course.schedule
    .map((s) => `${DAY_LABELS[s.day] || s.day} ${s.start}–${s.end}${s.note ? ` (${s.note})` : ''}`)
    .join(' · ');
}
