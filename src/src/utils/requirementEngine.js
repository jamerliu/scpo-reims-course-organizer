export function evaluateCategory(category, addedCourses) {
  if (category.kind === 'mandatory') {
    const items = category.items.map((item) => ({
      ...item,
      fulfilled: addedCourses.some((c) => item.match(c)),
      matchedCourse: addedCourses.find((c) => item.match(c)) || null,
    }));
    return { ...category, items, fulfilled: items.every((i) => i.fulfilled) };
  }
  if (category.kind === 'choose-one-of') {
    const options = category.options.map((opt) => {
      const items = opt.items.map((item) => ({
        ...item,
        fulfilled: addedCourses.some((c) => item.match(c)),
        matchedCourse: addedCourses.find((c) => item.match(c)) || null,
      }));
      return { ...opt, items, fulfilled: items.every((i) => i.fulfilled) };
    });
    const fulfilled = options.some((o) => o.fulfilled);
    const activeOption = options.find((o) => o.items.some((i) => i.fulfilled)) || null;
    return { ...category, options, fulfilled, activeOption };
  }
  return { ...category, fulfilled: false };
}

export function evaluateProfile(profile, addedCourses) {
  if (!profile) return [];
  return profile.categories.map((cat) => evaluateCategory(cat, addedCourses));
}

export function evaluateLanguages(languageProfile, addedCourses, t) {
  if (!languageProfile) return [];
  const s = (key, vars = {}) => (t ? t(key, vars) : key);

  const results = [];
  const langCourses = addedCourses.filter((c) => c.group === 'LANGUE');

  const hasFrench = langCourses.some((c) => {
    const l = (c.langue || '').toLowerCase();
    return l.includes('fle') || l.includes('français') || l.includes('francais');
  });
  const hasEnglish = langCourses.some((c) => {
    const l = (c.langue || '').toLowerCase();
    return l.includes('anglais') || l.includes('english');
  });

  // French: only show if student needs to study it (not native)
  if (languageProfile.needsFrench) {
    const target = languageProfile.frenchTarget || 'B2';
    const matched = langCourses.find((c) => {
      const l = (c.langue || '').toLowerCase();
      return l.includes('fle') || l.includes('français') || l.includes('francais');
    });
    // Show "study to X to unlock third language" hint only if not yet eligible for third language
    const showThirdHint = !languageProfile.thirdLanguageUnlocked;
    results.push({
      id: 'lang-french',
      label: showThirdHint
        ? `French / Français (study to ${target} to qualify for a third language)`
        : `French / Français`,
      detail: matched
        ? `✓ ${matched.title}${matched.niveau ? ` (${matched.niveau})` : ''}`
        : s('langAddFrom', { lang: 'French / Français' }),
      fulfilled: hasFrench,
    });
  }

  // English: only show if student needs to study it (not native)
  if (languageProfile.needsEnglish) {
    const target = languageProfile.englishTarget || 'C1';
    const matched = langCourses.find((c) => {
      const l = (c.langue || '').toLowerCase();
      return l.includes('anglais') || l.includes('english');
    });
    const showThirdHint = !languageProfile.thirdLanguageUnlocked;
    results.push({
      id: 'lang-english',
      label: showThirdHint
        ? `English / Anglais (study to ${target} to qualify for a third language)`
        : `English / Anglais`,
      detail: matched
        ? `✓ ${matched.title}${matched.niveau ? ` (${matched.niveau})` : ''}`
        : s('langAddFrom', { lang: 'English / Anglais' }),
      fulfilled: hasEnglish,
    });
  }

  // If both are native/fluent, show a single fulfilled note
  if (!languageProfile.needsFrench && !languageProfile.needsEnglish) {
    results.push({
      id: 'lang-native',
      label: 'French & English',
      detail: 'Native / Fluent in both — no language courses required.',
      fulfilled: true,
    });
  }

  // Third language: only show section if eligible
  if (languageProfile.thirdLanguageUnlocked) {
    const thirdCourses = langCourses.filter((c) => {
      const l = (c.langue || '').toLowerCase();
      const isFr = l.includes('fle') || l.includes('français') || l.includes('francais');
      const isEn = l.includes('anglais') || l.includes('english');
      return !isFr && !isEn;
    });
    results.push({
      id: 'lang-third',
      label: 'Third language (optional)',
      detail: thirdCourses.length > 0
        ? `✓ ${thirdCourses.map((c) => c.title).join(', ')}`
        : 'Add from the Languages tab if desired.',
      fulfilled: thirdCourses.length > 0,
      optional: true,
    });
  }

  return results;
}
