// compareEngine.js
// Core logic for schedule comparison, overlap detection, and optimal path analysis.

import coursesData from '../data/courses.json';
import { PROGRAM_COURSE_GROUPS } from '../data/programMap';
import { REQUIREMENTS } from '../data/requirements';
import { evaluateCategory } from './requirementEngine';

const byId = new Map(coursesData.map((c) => [c.id, c]));

// ── helpers ──────────────────────────────────────────────────────────────────

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function slotsOverlap(a, b) {
  // Two schedule slots [{ day, start, end }] overlap if same day and times intersect.
  return a.day === b.day &&
    toMin(a.start) < toMin(b.end) &&
    toMin(b.start) < toMin(a.end);
}

function courseConflicts(courseA, courseB) {
  for (const sa of (courseA.schedule || [])) {
    for (const sb of (courseB.schedule || [])) {
      if (slotsOverlap(sa, sb)) return true;
    }
  }
  return false;
}

// ── stack parsing ─────────────────────────────────────────────────────────────

export function resolveStack(saveData) {
  // Given a parsed save file, return { meta, courses[] }
  const ids = saveData.addedCourseIds || [];
  const courses = ids.map((id) => byId.get(id)).filter(Boolean);
  return {
    label: saveData.program
      ? `${saveData.program.grade} — ${saveData.program.programLabel || saveData.program.programKey}`
      : 'Unknown',
    programKey: saveData.program?.programKey || null,
    savedAt: saveData._savedAt || null,
    courses,
    addedIds: ids,
    languageProfile: saveData.languageProfile || null,
    majeureMineure: saveData.majeureMineure || null,
  };
}

// ── overlap classification ────────────────────────────────────────────────────

export const OVERLAP = {
  SHARED:  'shared',   // course appears in ALL selected stacks
  SOME:    'some',     // course appears in SOME but not all
  UNIQUE:  'unique',   // course appears in exactly one stack
};

export function classifySlots(stacks) {
  // Returns a flat list of { course, stackIdx, slotIdx, slot, overlapClass, stacksContaining }
  if (stacks.length === 0) return [];

  // For each unique course ID, how many stacks contain it?
  const idCounts = {};
  stacks.forEach((stack, si) => {
    stack.courses.forEach((c) => {
      idCounts[c.id] = idCounts[c.id] || new Set();
      idCounts[c.id].add(si);
    });
  });

  const entries = [];
  stacks.forEach((stack, si) => {
    stack.courses.forEach((course) => {
      const stacksContaining = idCounts[course.id] || new Set();
      const count = stacksContaining.size;
      const overlapClass =
        count === stacks.length ? OVERLAP.SHARED :
        count > 1              ? OVERLAP.SOME :
        OVERLAP.UNIQUE;

      (course.schedule || []).forEach((slot, slotIdx) => {
        entries.push({ course, stackIdx: si, slotIdx, slot, overlapClass, stacksContaining });
      });
    });
  });
  return entries;
}

// ── optimal path analysis ─────────────────────────────────────────────────────

/**
 * Given:
 *   baseStack      — the primary stack the user is working from
 *   droppedIds     — set of course IDs the user has marked as dropped
 *   otherStacks    — other uploaded stacks (checked first for replacements)
 *   programKey     — to access requirements and full course pool
 *
 * Returns an array of { category, droppedCourse, replacements[] }
 * where replacements[] = [{ course, source: 'stack'|'pool', fromStackLabel, conflicts: [] }]
 */
export function computeOptimalPaths({ baseStack, droppedIds, otherStacks, programKey }) {
  const profile = REQUIREMENTS[programKey];
  if (!profile) return [];

  const remainingIds = new Set(
    baseStack.addedIds.filter((id) => !droppedIds.has(id))
  );
  const remainingCourses = [...remainingIds].map((id) => byId.get(id)).filter(Boolean);

  // Full course pool for the program (excluding already-added and dropped)
  const groups = PROGRAM_COURSE_GROUPS[programKey] || [];
  const fullPool = coursesData.filter(
    (c) => (groups.includes(c.group) || c.group === 'LANGUE') &&
    !remainingIds.has(c.id) &&
    !droppedIds.has(c.id)
  );

  // For each dropped course, figure out what requirement(s) it was filling
  const droppedCourses = [...droppedIds].map((id) => byId.get(id)).filter(Boolean);
  const results = [];

  droppedCourses.forEach((droppedCourse) => {
    // Which categories did this course match?
    const affectedCategories = [];
    profile.categories.forEach((cat) => {
      if (cat.kind === 'mandatory') {
        const matched = cat.items.some((item) => {
          try { return item.match(droppedCourse); } catch { return false; }
        });
        if (matched) affectedCategories.push(cat);
      } else if (cat.kind === 'choose-one-of') {
        cat.options.forEach((opt) => {
          const matched = opt.items.some((item) => {
            try { return item.match(droppedCourse); } catch { return false; }
          });
          if (matched) affectedCategories.push({ ...cat, _matchedOption: opt });
        });
      }
    });

    if (affectedCategories.length === 0) {
      // Dropped course didn't match any requirement — still surface it
      affectedCategories.push(null);
    }

    affectedCategories.forEach((cat) => {
      // Gather candidate replacements
      const candidates = [];

      // 1. From other stacks (preferred)
      otherStacks.forEach((stack) => {
        stack.courses.forEach((c) => {
          if (droppedIds.has(c.id) || remainingIds.has(c.id)) return;
          const matchesReq = cat ? matchesCategoryItem(c, cat) : false;
          if (!matchesReq && cat) return;
          const conflicts = remainingCourses.filter((r) => courseConflicts(c, r));
          candidates.push({
            course: c,
            source: 'stack',
            fromStackLabel: stack.label,
            conflicts,
            matchesReq,
          });
        });
      });

      // 2. From full pool (fallback) — only add if not already in candidates
      const candidateIds = new Set(candidates.map((c) => c.course.id));
      fullPool.forEach((c) => {
        if (candidateIds.has(c.id)) return;
        const matchesReq = cat ? matchesCategoryItem(c, cat) : false;
        if (!matchesReq) return;
        const conflicts = remainingCourses.filter((r) => courseConflicts(c, r));
        candidates.push({
          course: c,
          source: 'pool',
          fromStackLabel: null,
          conflicts,
          matchesReq,
        });
      });

      // Sort: prefer matches over non-matches, then prefer no-conflict over conflicts
      candidates.sort((a, b) => {
        if (a.matchesReq !== b.matchesReq) return b.matchesReq - a.matchesReq;
        return a.conflicts.length - b.conflicts.length;
      });

      results.push({
        droppedCourse,
        category: cat,
        categoryLabel: cat?._matchedOption?.label || cat?.label || 'No requirement matched',
        replacements: candidates.slice(0, 8), // top 8
      });
    });
  });

  return results;
}

function matchesCategoryItem(course, cat) {
  if (!cat) return false;
  const items = cat._matchedOption ? cat._matchedOption.items : (cat.items || []);
  return items.some((item) => {
    try { return item.match(course); } catch { return false; }
  });
}
