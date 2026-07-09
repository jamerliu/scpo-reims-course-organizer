// Save/load schedule state as a versioned JSON file.
// The file contains everything needed to reconstruct the session:
// program, grade, majeure/mineure, language profile, added course IDs,
// starred IDs, and schedule metadata (version, date, course titles for
// human readability and compatibility checking).

export const SAVE_VERSION = 1;

// ---------- SAVE ----------
export function buildSaveData({ program, majeureMineure, languageProfile, addedIds, starredIds, coursesById, regStatuses, regSecondaries, regOrder, enFrPreference }) {
  const addedMeta = addedIds.map((id) => {
    const c = coursesById.get(id);
    return c ? { id, title: c.title, codeMatiere: c.codeMatiere, group: c.group } : { id };
  });
  const starredMeta = starredIds.map((id) => {
    const c = coursesById.get(id);
    return c ? { id, title: c.title, codeMatiere: c.codeMatiere, group: c.group } : { id };
  });

  return {
    _version: SAVE_VERSION,
    _app: 'sciencespo-course-planner',
    _savedAt: new Date().toISOString(),
    program: {
      grade: program.grade,
      programKey: program.programKey,
      programLabel: program.programLabel,
    },
    majeureMineure: majeureMineure || null,
    languageProfile: {
      frenchLevel:           languageProfile?.frenchLevel ?? null,
      englishLevel:          languageProfile?.englishLevel ?? null,
      englishTarget:         languageProfile?.englishTarget ?? null,
      frenchTarget:          languageProfile?.frenchTarget ?? null,
      needsFrench:           languageProfile?.needsFrench ?? false,
      needsEnglish:          languageProfile?.needsEnglish ?? false,
      frenchNative:          languageProfile?.frenchNative ?? false,
      englishNative:         languageProfile?.englishNative ?? false,
      thirdLanguageUnlocked: languageProfile?.thirdLanguageUnlocked ?? false,
      thirdLanguage:         languageProfile?.thirdLanguage ?? null,
    },
    addedCourseIds:   addedIds,
    starredCourseIds: starredIds,
    registration: {
      statuses:    regStatuses    || {},
      secondaries: regSecondaries || {},
      order:       regOrder       || [],
    },
    enFrPreference: enFrPreference || null,
    _meta: {
      addedCourses:   addedMeta,
      starredCourses: starredMeta,
      totalAdded:     addedIds.length,
      totalStarred:   starredIds.length,
    },
  };
}

export function downloadSave(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- LOAD ----------
export const COMPATIBILITY_ISSUES = {
  NOT_JSON:          'NOT_JSON',
  MISSING_FIELDS:    'MISSING_FIELDS',
  WRONG_APP:         'WRONG_APP',
  UNKNOWN_PROGRAM:   'UNKNOWN_PROGRAM',
  UNKNOWN_COURSES:   'UNKNOWN_COURSES',
  GRADE_MISMATCH:    'GRADE_MISMATCH',
  PROGRAM_MISMATCH:  'PROGRAM_MISMATCH',
};

export function validateSaveData(raw, { validProgramKeys, coursesById }) {
  // Structure check
  if (!raw || typeof raw !== 'object')
    return { ok: false, issue: COMPATIBILITY_ISSUES.NOT_JSON, detail: 'File is not valid JSON.' };
  if (raw._app !== 'sciencespo-course-planner')
    return { ok: false, issue: COMPATIBILITY_ISSUES.WRONG_APP, detail: 'This file was not created by this planner.' };
  if (!raw.program?.grade || !raw.program?.programKey || !Array.isArray(raw.addedCourseIds))
    return { ok: false, issue: COMPATIBILITY_ISSUES.MISSING_FIELDS, detail: 'Save file is incomplete or corrupted.' };

  const warnings = [];

  // Program compatibility
  if (!validProgramKeys.includes(raw.program.programKey)) {
    return {
      ok: false,
      issue: COMPATIBILITY_ISSUES.UNKNOWN_PROGRAM,
      detail: `Program key "${raw.program.programKey}" is not recognised in this version of the planner.`,
    };
  }

  // Course ID compatibility — check how many saved IDs exist in the current course data
  const unknownAdded = raw.addedCourseIds.filter((id) => !coursesById.has(id));
  const unknownStarred = (raw.starredCourseIds || []).filter((id) => !coursesById.has(id));

  if (unknownAdded.length > 0) {
    warnings.push(
      `${unknownAdded.length} added course(s) could not be found in the current schedule and will be skipped. ` +
      `This may happen if the schedule was updated since this file was saved.`
    );
  }
  if (unknownStarred.length > 0) {
    warnings.push(
      `${unknownStarred.length} starred course(s) could not be found and will be skipped.`
    );
  }

  // Filter to only known IDs for restore
  const safeAddedIds   = raw.addedCourseIds.filter((id) => coursesById.has(id));
  const safeStarredIds = (raw.starredCourseIds || []).filter((id) => coursesById.has(id));

  // Course group vs program compatibility check
  // Each added course should belong to a group associated with the program
  const groupsForProgram = getGroupsForProgram(raw.program.programKey);
  const wrongGroup = safeAddedIds.filter((id) => {
    const c = coursesById.get(id);
    return c && !groupsForProgram.includes(c.group) && c.group !== 'LANGUE' && c.group !== '2A_SEMINAIRE';
  });
  if (wrongGroup.length > 0) {
    warnings.push(
      `${wrongGroup.length} course(s) appear to belong to a different program track and may not match your requirements.`
    );
  }

  return {
    ok: true,
    warnings,
    safeAddedIds,
    safeStarredIds,
    savedAt: raw._savedAt,
    program: raw.program,
    majeureMineure: raw.majeureMineure || null,
    languageProfile: raw.languageProfile || null,
    totalOriginalAdded: raw.addedCourseIds.length,
    totalOriginalStarred: (raw.starredCourseIds || []).length,
    regStatuses:    raw.registration?.statuses    || {},
    regSecondaries: raw.registration?.secondaries || {},
    regOrder:       (raw.registration?.order || []).filter((id) => coursesById.has(id)),
    enFrPreference: raw.enFrPreference || null,
  };
}

// Maps program key → which course groups are expected
function getGroupsForProgram(programKey) {
  const map = {
    '1A_NA':        ['1A_NA'],
    '1A_AFRICA_EN': ['1A_AFRICA_EN'],
    '1A_AFRICA_FR': ['1A_AFRICA_FR'],
    '2A_NA':        ['2A_NA', '2A_SEMINAIRE'],
    '2A_AFRICA_EN': ['2A_NA', '2A_SEMINAIRE'],
    '2A_AFRICA_FR': ['2A_AFRICA_FR', '2A_SEMINAIRE'],
  };
  return map[programKey] || [];
}

export function parseSaveFile(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
