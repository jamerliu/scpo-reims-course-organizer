// optimizerEngine.js
// Generates up to 3 complete, valid schedule combinations ranked by quality.
//
// A "slot" is a choice point: a set of candidate courses where exactly one
// must be selected. For each slot the optimizer iterates all candidates,
// filters out avoid-day/time violations (soft penalty, not hard reject),
// checks for conflicts with already-selected courses, and picks the best.
//
// Quadruplette constraint (1A NA): all four conference slots must share
// the same group number.
//
// Returns: Array of up to 3 { courseIds, score, secondaries, slotSummary }
// where secondaries = { [primaryId]: secondaryId } (next-best per slot)

import coursesData from '../data/courses.json';
import { REQUIREMENTS } from '../data/requirements';
import { PROGRAM_COURSE_GROUPS } from '../data/programMap';
import { isLecture } from './lectureGuard';

const byId = new Map(coursesData.map((c) => [c.id, c]));

function toMin(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function slotsOverlap(a, b) {
  return a.day === b.day && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);
}

function coursesConflict(a, b) {
  for (const sa of (a.schedule || []))
    for (const sb of (b.schedule || []))
      if (slotsOverlap(sa, sb)) return true;
  return false;
}

function conflictsWithAny(candidate, chosen) {
  return chosen.some((c) => coursesConflict(candidate, c));
}

// Soft penalty score for a course (lower = better)
function scoreCourse(course, avoidDays, avoidSlots) {
  let penalty = 0;
  for (const slot of (course.schedule || [])) {
    if (avoidDays.has(slot.day)) penalty += 60;
    for (const av of avoidSlots) {
      const s = toMin(slot.start), e = toMin(slot.end);
      const as = toMin(av.start), ae = toMin(av.end);
      if (s < ae && as < e) penalty += 60;
    }
  }
  // Confoscope bonus
  if (course.confoscope1 != null) penalty -= course.confoscope1 * 3;
  return penalty;
}

// Build the list of "slots" that need to be filled for a given profile.
// A slot is: { id, label, candidates: Course[], isQuad: boolean, quadCode?: string, locked?: courseId }
function buildSlots({ profile, programPool, lockedIds, majeureMineure, enFrPreference }) {
  const slots = [];

  profile.categories.forEach((cat) => {
    if (cat.kind === 'mandatory') {
      cat.items.forEach((item) => {
        if (item.autoAdd) return; // lectures — skip, already fixed
        // Find all candidates that match this item from the pool
        let candidates = programPool.filter((c) => {
          try { return !isLecture(c) && item.match(c) && (c.schedule || []).length > 0; }
          catch { return false; }
        });
        candidates = applyEnFrFilter(candidates, cat.id, enFrPreference);
        if (candidates.length === 0) return;

        // Check if any candidate is already locked
        const lockedCandidate = candidates.find((c) => lockedIds.has(c.id));
        slots.push({
          id: `${cat.id}::${item.label}`,
          label: `${cat.label} — ${item.label}`,
          catId: cat.id,
          candidates,
          locked: lockedCandidate?.id || null,
          isQuad: item.label.toLowerCase().includes('quadruplette'),
          quadCode: item.label.toLowerCase().includes('quadruplette') ? candidates[0]?.codeMatiere : null,
        });
      });
    } else if (cat.kind === 'choose-one-of') {
      // For choose-one-of, respect the user's pre-selection (majeure/mineure)
      // or offer all options' non-lecture items as a single merged slot
      const activeOptionLabel = majeureMineure
        ? (cat.id === 'majeure' ? majeureMineure.majeure : cat.id === 'mineure' ? majeureMineure.mineure : null)
        : null;

      const activeOpts = activeOptionLabel
        ? cat.options.filter((o) => o.label === activeOptionLabel)
        : cat.options;

      activeOpts.forEach((opt) => {
        opt.items.forEach((item) => {
          if (item.autoAdd) return;
          let candidates = programPool.filter((c) => {
            try { return !isLecture(c) && item.match(c) && (c.schedule || []).length > 0; }
            catch { return false; }
          });
          candidates = applyEnFrFilter(candidates, cat.id, enFrPreference);
          if (candidates.length === 0) return;
          const lockedCandidate = candidates.find((c) => lockedIds.has(c.id));
          slots.push({
            id: `${cat.id}::${opt.label}::${item.label}`,
            label: `${opt.label} — ${item.label}`,
            catId: cat.id,
            candidates,
            locked: lockedCandidate?.id || null,
            isQuad: false,
          });
        });
      });
    }
  });

  return slots;
}

function applyEnFrFilter(candidates, catId, enFrPref) {
  if (!enFrPref) return candidates;
  // Digital Culture
  if (catId === 'digital-culture') {
    if (enFrPref === 'EN') return candidates.filter((c) => (c.title || '').includes('ANG')) || candidates;
    if (enFrPref === 'FR') return candidates.filter((c) => !(c.title || '').includes('ANG')) || candidates;
  }
  // Capstone
  if (catId === 'capstone') {
    if (enFrPref === 'EN') return candidates.filter((c) => c.codeMatiere === 'ECEF 27A00') || candidates;
    if (enFrPref === 'FR') return candidates.filter((c) => c.codeMatiere === 'ECEF 27F00') || candidates;
  }
  return candidates;
}

// Find the best candidate for a slot given already-chosen courses and quad constraint
function pickBest(slot, chosen, avoidDays, avoidSlots, quadGroup, usedScores = new Set()) {
  let pool = slot.candidates.filter((c) => !usedScores.has(c.id));
  if (slot.isQuad && quadGroup != null) {
    pool = pool.filter((c) => c.quadGroup === quadGroup);
  }
  // Sort by: no-conflict first, then score
  const scored = pool.map((c) => ({
    c,
    hasConflict: conflictsWithAny(c, chosen),
    score: scoreCourse(c, avoidDays, avoidSlots),
  }));
  scored.sort((a, b) => {
    if (a.hasConflict !== b.hasConflict) return a.hasConflict ? 1 : -1;
    return a.score - b.score;
  });
  return scored;
}

/**
 * Main entry point.
 *
 * @param {object} params
 *   profile          — from REQUIREMENTS[programKey]
 *   programKey       — string
 *   fixedIds         — string[] — lectures + auto-added (always in schedule)
 *   lockedIds        — Set<string> — user-locked choice courses
 *   majeureMineure   — { majeure, mineure } or null
 *   avoidDays        — Set<string>
 *   avoidSlots       — Array<{ start, end }>
 *   enFrPreference   — 'EN' | 'FR' | null
 *
 * @returns Array<{
 *   courseIds: string[],
 *   score: number,
 *   secondaries: { [primaryId]: secondaryId },
 *   slotSummary: Array<{ label, pickedTitle, backupTitle }>
 * }>
 */
export function generateSchedules({
  profile, programKey, fixedIds, lockedIds,
  majeureMineure, avoidDays, avoidSlots, enFrPreference, languageProfile,
}) {
  const groups = PROGRAM_COURSE_GROUPS[programKey] || [];
  const programPool = coursesData.filter(
    (c) => groups.includes(c.group) || c.group === 'LANGUE' || c.group === '2A_SEMINAIRE'
  );

  const slots = buildSlots({ profile, programPool, lockedIds, majeureMineure, enFrPreference });

  // Add language slots based on languageProfile
  const langPool = coursesData.filter((c) => c.group === 'LANGUE' && (c.schedule || []).length > 0);

  function langSlot(id, label, filterFn) {
    const candidates = langPool.filter(filterFn);
    if (candidates.length === 0) return;
    const lockedCandidate = candidates.find((c) => lockedIds.has(c.id));
    slots.push({ id, label, catId: 'language', candidates, locked: lockedCandidate?.id || null, isQuad: false });
  }

  if (languageProfile?.needsFrench) {
    langSlot('lang::french', `French (study to ${languageProfile.frenchTarget || 'B2'})`, (c) => {
      const l = (c.langue || '').toLowerCase();
      return l.includes('fle') || l.includes('français') || l.includes('francais');
    });
  }
  if (languageProfile?.needsEnglish) {
    langSlot('lang::english', `English (study to ${languageProfile.englishTarget || 'C1'})`, (c) => {
      const l = (c.langue || '').toLowerCase();
      return l.includes('anglais') || l.includes('english');
    });
  }
  if (languageProfile?.thirdLanguageUnlocked && languageProfile?.thirdLanguage) {
    const tl = languageProfile.thirdLanguage.toLowerCase();
    langSlot(`lang::third::${tl}`, `${languageProfile.thirdLanguage} (third language)`, (c) =>
      (c.langue || '').toLowerCase().includes(tl)
    );
  }
  const fixedCourses = fixedIds.map((id) => byId.get(id)).filter(Boolean);

  // For 1A NA: quadruplette groups 1–19 are linked across 4 codes
  const isQuadProg = profile.quadrupletteLinked === true;
  const quadSlots  = slots.filter((s) => s.isQuad);
  const quadGroups = isQuadProg
    ? [...new Set(quadSlots.flatMap((s) => s.candidates.map((c) => c.quadGroup).filter(Boolean)))]
    : [null];

  const results = [];
  const usedSolutionHashes = new Set();

  // We try multiple quad groups (for 1A NA) or just null
  for (const qg of quadGroups) {
    if (results.length >= 3) break;

    // For each slot, pick the best then second-best
    const chosen   = [...fixedCourses];
    const picked   = []; // { slotId, courseId, backupId, label }
    let totalScore = 0;
    let valid      = true;

    for (const slot of slots) {
      const alreadyLocked = slot.locked;
      if (alreadyLocked) {
        const c = byId.get(alreadyLocked);
        if (c) { chosen.push(c); picked.push({ slotId: slot.id, label: slot.label, courseId: alreadyLocked, backupId: null, pickedTitle: c.title, backupTitle: null }); }
        continue;
      }

      const ranked = pickBest(slot, chosen, avoidDays, avoidSlots, qg);
      if (ranked.length === 0) { valid = false; break; }

      const best = ranked[0];
      totalScore += best.score;
      if (best.hasConflict) totalScore += 200; // penalise conflict solutions

      const backup = ranked.find((r, i) => i > 0 && !r.hasConflict) || ranked[1] || null;
      chosen.push(best.c);
      picked.push({
        slotId: slot.id,
        label: slot.label,
        courseId: best.c.id,
        backupId: backup?.c?.id || null,
        pickedTitle: best.c.title,
        backupTitle: backup?.c?.title || null,
      });
    }

    if (!valid) continue;

    const courseIds = [
      ...fixedIds,
      ...picked.map((p) => p.courseId).filter((id) => !fixedIds.includes(id)),
    ];
    const hash = [...courseIds].sort().join(',');
    if (usedSolutionHashes.has(hash)) continue;
    usedSolutionHashes.add(hash);

    const secondaries = {};
    picked.forEach((p) => { if (p.backupId) secondaries[p.courseId] = p.backupId; });

    results.push({ courseIds, score: totalScore, secondaries, slotSummary: picked, quadGroup: qg });
    if (results.length >= 3) break;
  }

  // If quadruplette exhausted, try non-quad permutations for diversity
  if (results.length < 3 && !isQuadProg) {
    // Try different slot orderings for variety (shuffle non-locked slots)
    for (let attempt = 0; attempt < 20 && results.length < 3; attempt++) {
      const shuffledSlots = [...slots].sort(() => Math.random() - 0.5);
      const chosen   = [...fixedCourses];
      const picked   = [];
      let totalScore = 0;
      let valid      = true;

      for (const slot of shuffledSlots) {
        if (slot.locked) {
          const c = byId.get(slot.locked);
          if (c) { chosen.push(c); picked.push({ slotId: slot.id, label: slot.label, courseId: slot.locked, backupId: null, pickedTitle: c.title, backupTitle: null }); }
          continue;
        }
        const usedInThisRun = new Set(picked.map((p) => p.courseId));
        const ranked = pickBest(slot, chosen, avoidDays, avoidSlots, null, usedInThisRun);
        if (ranked.length === 0) { valid = false; break; }
        const best   = ranked[0];
        const backup = ranked.find((r, i) => i > 0 && !r.hasConflict) || ranked[1] || null;
        totalScore  += best.score + (best.hasConflict ? 200 : 0);
        chosen.push(best.c);
        picked.push({ slotId: slot.id, label: slot.label, courseId: best.c.id, backupId: backup?.c?.id || null, pickedTitle: best.c.title, backupTitle: backup?.c?.title || null });
      }

      if (!valid) continue;
      const courseIds = [...fixedIds, ...picked.map((p) => p.courseId).filter((id) => !fixedIds.includes(id))];
      const hash = [...courseIds].sort().join(',');
      if (usedSolutionHashes.has(hash)) continue;
      usedSolutionHashes.add(hash);
      const secondaries = {};
      picked.forEach((p) => { if (p.backupId) secondaries[p.courseId] = p.backupId; });
      results.push({ courseIds, score: totalScore, secondaries, slotSummary: picked, quadGroup: null });
    }
  }

  results.sort((a, b) => a.score - b.score);
  return results.slice(0, 3);
}
