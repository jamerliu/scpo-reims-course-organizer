// smartSuggest.js
// Given a course that has been knocked into conflict by a swap,
// find the best available alternatives from the program pool.
//
// Scoring (lower = better):
//   - Same codeMatiere first (same course, different group) — best match
//   - Same day(s): -30 points per matching day
//   - Time proximity: absolute difference in start minutes, capped at 240
//   - Confoscope rating bonus: subtract rating * 2 (higher rating = lower score)
//   - Avoid-day penalty: +999 per slot on an avoided day
//   - Avoid-time penalty: +999 if slot falls within avoided timeslot range
//   - Conflict penalty: +500 per remaining course it clashes with
//
// We only surface suggestions when there is NO candidate with zero conflicts
// (i.e. the user truly has no clean pick), OR when the course has
// same-codeMatiere alternatives — always show those.

import { coursesConflict } from './registrationEngine';

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// avoidDays: Set of day strings e.g. Set(['Mon','Fri'])
// avoidSlots: Array of { start: 'HH:MM', end: 'HH:MM' }
function slotPenalty(slot, avoidDays, avoidSlots) {
  let penalty = 0;
  if (avoidDays.has(slot.day)) penalty += 999;
  const slotStart = toMin(slot.start);
  const slotEnd   = toMin(slot.end);
  for (const avoid of avoidSlots) {
    const avStart = toMin(avoid.start);
    const avEnd   = toMin(avoid.end);
    // overlapping at all
    if (slotStart < avEnd && avStart < slotEnd) penalty += 999;
  }
  return penalty;
}

function scoreAlternative({ candidate, originalCourse, remainingCourses, avoidDays, avoidSlots }) {
  let score = 0;

  // Same code = same course, just a different group — preferred
  const sameCode = candidate.codeMatiere === originalCourse.codeMatiere;
  if (sameCode) score -= 200;

  // Day proximity
  const origDays = new Set((originalCourse.schedule || []).map((s) => s.day));
  let dayMatchCount = 0;
  for (const slot of (candidate.schedule || [])) {
    if (origDays.has(slot.day)) dayMatchCount++;
    score += slotPenalty(slot, avoidDays, avoidSlots);
  }
  score -= dayMatchCount * 30;

  // Time proximity (compare first slots)
  const origStart = originalCourse.schedule?.[0]?.start;
  const candStart = candidate.schedule?.[0]?.start;
  if (origStart && candStart) {
    score += Math.min(Math.abs(toMin(origStart) - toMin(candStart)), 240);
  }

  // Confoscope bonus
  if (candidate.confoscope1 != null) score -= candidate.confoscope1 * 2;

  // Conflict penalty
  for (const r of remainingCourses) {
    if (coursesConflict(candidate, r)) score += 500;
  }

  return score;
}

/**
 * For each conflicting course (knocked out by a swap), find the best alternatives.
 *
 * @param {object} params
 *   conflictingCourses   — courses now in conflict
 *   allProgramCourses    — full pool
 *   remainingCourses     — courses still in schedule (after swap, excluding conflicts)
 *   avoidDays            — Set<string>
 *   avoidSlots           — Array<{ start, end }>
 *   currentIds           — all current IDs (to exclude already-scheduled)
 *
 * @returns Array<{
 *   conflictCourse,
 *   suggestions: Array<{ course, score, sameCode, hasConflicts, penalised }>
 *   hasCleanOption: boolean
 * }>
 */
export function computeSuggestions({
  conflictingCourses,
  allProgramCourses,
  remainingCourses,
  avoidDays,
  avoidSlots,
  currentIds,
}) {
  const currentSet = new Set(currentIds);

  return conflictingCourses.map((original) => {
    // Pool: not already in schedule, not the original itself, has a schedule
    const pool = allProgramCourses.filter(
      (c) => !currentSet.has(c.id) && c.id !== original.id && (c.schedule || []).length > 0
    );

    // Score all candidates
    const scored = pool.map((candidate) => {
      const score = scoreAlternative({ candidate, originalCourse: original, remainingCourses, avoidDays, avoidSlots });
      const penalised = (candidate.schedule || []).some((slot) => slotPenalty(slot, avoidDays, avoidSlots) > 0);
      const hasConflicts = remainingCourses.some((r) => coursesConflict(candidate, r));
      const sameCode = candidate.codeMatiere === original.codeMatiere;
      return { course: candidate, score, sameCode, hasConflicts, penalised };
    });

    scored.sort((a, b) => a.score - b.score);

    // Clean option = same code AND no conflict AND not penalised
    const hasCleanOption = scored.some((s) => s.sameCode && !s.hasConflicts && !s.penalised);

    // Only show: same-code alternatives always; cross-code only if no clean option
    let suggestions = scored.filter((s) => s.sameCode).slice(0, 5);
    if (!hasCleanOption) {
      const crossCode = scored.filter((s) => !s.sameCode && !s.hasConflicts && !s.penalised).slice(0, 3);
      suggestions = [...suggestions, ...crossCode];
    }

    return { conflictCourse: original, suggestions, hasCleanOption };
  });
}
