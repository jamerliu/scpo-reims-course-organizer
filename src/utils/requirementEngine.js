export function evaluateCategory(category, addedCourses) {
  if (category.kind === 'mandatory') {
    const items = category.items.map((item) => ({
      ...item,
      fulfilled: addedCourses.some((c) => item.match(c)),
      matchedCourse: addedCourses.find((c) => item.match(c)) || null,
    }));
    const fulfilled = items.every((i) => i.fulfilled);
    return { ...category, items, fulfilled };
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

export function evaluateLanguages(languageProfile, addedCourses) {
  if (!languageProfile) return [];
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

  if (languageProfile.needsFrench) {
    const target = languageProfile.frenchTarget || 'B2';
    const matched = langCourses.find((c) => {
      const l = (c.langue || '').toLowerCase();
      return l.includes('fle') || l.includes('français') || l.includes('francais');
    });
    results.push({
      id: 'lang-french',
      label: `French (study to ${target})`,
      detail: matched ? `✓ ${matched.title} (${matched.niveau || ''})` : `Add a French course from the Languages tab`,
      fulfilled: hasFrench,
    });
  }

  if (languageProfile.needsEnglish) {
    const target = languageProfile.englishTarget || 'C1';
    const matched = langCourses.find((c) => {
      const l = (c.langue || '').toLowerCase();
      return l.includes('anglais') || l.includes('english');
    });
    results.push({
      id: 'lang-english',
      label: `English (study to ${target})`,
      detail: matched ? `✓ ${matched.title} (${matched.niveau || ''})` : `Add an English course from the Languages tab`,
      fulfilled: hasEnglish,
    });
  }

  if (!languageProfile.needsFrench && !languageProfile.needsEnglish && langCourses.length === 0) {
    results.push({
      id: 'lang-note',
      label: 'Language credits',
      detail: 'You have reached your target levels. No language course required, but you may still add one for extra credits.',
      fulfilled: true,
    });
  }

  if (languageProfile.thirdLanguageUnlocked && languageProfile.thirdLanguage) {
    const l = languageProfile.thirdLanguage.toLowerCase();
    const matched = langCourses.find((c) => c.langue && c.langue.toLowerCase().includes(l));
    results.push({
      id: 'lang-third',
      label: `${languageProfile.thirdLanguage} (third language — optional)`,
      detail: matched ? `✓ ${matched.title}` : 'Add from the Languages tab if desired',
      fulfilled: matched != null,
      optional: true,
    });
  }

  return results;
}
