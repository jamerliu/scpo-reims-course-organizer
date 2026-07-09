// registrationEngine.js
// Logic for the Registration tab:
// - Secondary course assignment
// - Marking courses unavailable and swapping to secondary
// - Conflict propagation: which remaining courses now clash

import coursesData from '../data/courses.json';
const byId = new Map(coursesData.map((c) => [c.id, c]));

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function slotsOverlap(a, b) {
  return a.day === b.day &&
    toMin(a.start) < toMin(b.end) &&
    toMin(b.start) < toMin(a.end);
}

export function coursesConflict(courseA, courseB) {
  for (const sa of (courseA.schedule || [])) {
    for (const sb of (courseB.schedule || [])) {
      if (slotsOverlap(sa, sb)) return true;
    }
  }
  return false;
}

/**
 * When a course is marked unavailable and its secondary is swapped in,
 * compute which currently-active courses conflict with the secondary.
 *
 * @param {string} unavailableId   - the course being dropped
 * @param {string} secondaryId     - the replacement being added
 * @param {string[]} currentIds    - all current course IDs (excluding the unavailable one)
 * @param {Set<string>} confirmedIds - locked courses the user has already enrolled in
 *
 * @returns {object}
 *   {
 *     conflictsWithConfirmed: Course[],  // locked courses that clash — secondary may not work
 *     conflictsWithPending:   Course[],  // unlocked courses that clash — need new secondaries
 *     secondary: Course,                 // the resolved secondary course object
 *   }
 */
export function propagateSwap({ unavailableId, secondaryId, currentIds, confirmedIds }) {
  const secondary = byId.get(secondaryId);
  if (!secondary) return null;

  const remainingIds = currentIds.filter((id) => id !== unavailableId);
  const remaining = remainingIds.map((id) => byId.get(id)).filter(Boolean);

  const conflictsWithConfirmed = [];
  const conflictsWithPending   = [];

  remaining.forEach((course) => {
    if (coursesConflict(secondary, course)) {
      if (confirmedIds.has(course.id)) {
        conflictsWithConfirmed.push(course);
      } else {
        conflictsWithPending.push(course);
      }
    }
  });

  return { secondary, conflictsWithConfirmed, conflictsWithPending };
}

/**
 * For a given course in the current schedule, find all courses in the
 * same program group that could serve as a secondary (same codeMatiere,
 * different UP/group number, not already in the schedule).
 */
export function findCandidateSecondaries(courseId, allProgramCourses, currentIds) {
  const course = byId.get(courseId);
  if (!course || !course.codeMatiere) return [];
  const currentSet = new Set(currentIds);
  return allProgramCourses.filter(
    (c) => c.codeMatiere === course.codeMatiere &&
      c.id !== courseId &&
      !currentSet.has(c.id) &&
      c.schedule?.length > 0
  );
}
