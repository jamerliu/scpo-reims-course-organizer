// Given a requirement profile (from data/requirements.js) and the list of
// courses currently on the calendar, compute fulfillment status per category.

export function evaluateCategory(category, addedCourses) {
  if (category.kind === 'mandatory') {
    const items = category.items.map((item) => ({
      ...item,
      fulfilled: addedCourses.some((c) => item.match(c)),
    }));
    const fulfilled = items.every((i) => i.fulfilled);
    return { ...category, items, fulfilled };
  }
  if (category.kind === 'choose-one-of') {
    const options = category.options.map((opt) => {
      const items = opt.items.map((item) => ({
        ...item,
        fulfilled: addedCourses.some((c) => item.match(c)),
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
  const results = [];
  const langCourses = (lang) => addedCourses.filter((c) => c.group === 'LANGUE' && c.langue && c.langue.toLowerCase().includes(lang));
  if (languageProfile.needsFrench) {
    results.push({ id: 'lang-french', label: 'French', fulfilled: langCourses('fle').length > 0 || langCourses('french').length > 0 });
  }
  if (languageProfile.needsEnglish) {
    results.push({ id: 'lang-english', label: 'English', fulfilled: langCourses('anglais').length > 0 || langCourses('english').length > 0 });
  }
  if (languageProfile.thirdLanguageUnlocked && languageProfile.thirdLanguage) {
    const l = languageProfile.thirdLanguage.toLowerCase();
    results.push({ id: 'lang-third', label: languageProfile.thirdLanguage, fulfilled: addedCourses.some((c) => c.group === 'LANGUE' && c.langue && c.langue.toLowerCase().includes(l)) });
  }
  return results;
}
