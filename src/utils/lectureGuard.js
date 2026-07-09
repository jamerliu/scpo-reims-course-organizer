// A course is a "locked lecture" if its type is any variant of Cours magistral or Lecture.
// These are auto-added, cannot be removed from the calendar, and are excluded from registration.

export function isLecture(course) {
  if (!course) return false;
  const t = (course.type || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return (
    t === 'cours magistral' ||
    t.startsWith('cours magistral') ||
    t === 'lecture'
  );
}
