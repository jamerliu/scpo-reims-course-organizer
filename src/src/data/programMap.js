export const GRADE_PROGRAMS = {
  '1A': [
    { key: '1A_NA', label: 'North America Minor' },
    { key: '1A_AFRICA_EN', label: 'Africa Minor — English Track' },
    { key: '1A_AFRICA_FR', label: 'Africa Minor — French Track (METIS)' },
  ],
  '2A': [
    { key: '2A_NA', label: 'North America Minor' },
    { key: '2A_AFRICA_EN', label: 'Africa Minor — English Track' },
    { key: '2A_AFRICA_FR', label: 'Africa Minor — French Track (METIS)' },
  ],
};

// Which course.group values (from courses.json) are visible for each program key.
export const PROGRAM_COURSE_GROUPS = {
  '1A_NA': ['1A_NA'],
  '1A_AFRICA_EN': ['1A_AFRICA_EN'],
  '1A_AFRICA_FR': ['1A_AFRICA_FR'],
  '2A_NA': ['2A_NA', '2A_SEMINAIRE'],
  '2A_AFRICA_EN': ['2A_NA', '2A_SEMINAIRE'], // Africa English track shares the NA course sheet
  '2A_AFRICA_FR': ['2A_AFRICA_FR', '2A_SEMINAIRE'],
};

export function typeCategory(rawType) {
  if (!rawType) return 'Other';
  const t = rawType.replace(/\s+/g, ' ').trim().toLowerCase();
  if (t.includes('quadruplette')) return 'Quadruplette';
  if (t.includes('cours magistral') || t === 'lecture') return 'Lecture';
  if (t.includes('conférence de méthode') || t.includes('conference de methode')) return 'Conférence de Méthode';
  if (t.includes('conférence de lecture') || t.includes('conference de lecture') || t.includes('conférences de lecture')) return 'Conférence de Lecture';
  if (t.includes('atelier')) return 'Atelier';
  if (t.includes('séminaire') || t.includes('seminaire')) return 'Séminaire';
  if (t.includes('discussion')) return 'Discussion';
  if (t.includes('langue')) return 'Langue';
  if (t.includes('introductory') || t.includes('intermediate') || t.includes('advanced')) return 'Mathématiques';
  return 'Other';
}
