// All UI strings in English and French.
// Usage: t('key') where t comes from useLang()

export const STRINGS = {
  // App header
  appTitle: {
    en: 'Course Selection Planner',
    fr: 'Planificateur de cours',
  },
  changeProgram: {
    en: 'Change program',
    fr: 'Changer de programme',
  },
  languageSettings: {
    en: 'Language settings',
    fr: 'Paramètres de langue',
  },
  exportPdf: {
    en: 'Export PDF report',
    fr: 'Exporter le rapport PDF',
  },
  exporting: {
    en: 'Exporting…',
    fr: 'Export en cours…',
  },

  // Program/grade select screen
  selectTitle: {
    en: 'Course Selection Planner',
    fr: 'Planificateur de cours',
  },
  selectSubtitle: {
    en: 'Sciences Po Reims — 202610 Schedule',
    fr: 'Sciences Po Reims — Emploi du temps 202610',
  },

  // Grade labels
  grade1A: { en: '1A', fr: '1A' },
  grade2A: { en: '2A', fr: '2A' },

  // Program labels
  'prog.1A_NA':        { en: 'North America Minor',              fr: 'Mineure Amérique du Nord' },
  'prog.1A_AFRICA_EN': { en: 'Africa Minor — English Track',     fr: 'Mineure Afrique — Filière anglophone' },
  'prog.1A_AFRICA_FR': { en: 'Africa Minor — French Track (METIS)', fr: 'Mineure Afrique — Filière francophone (METIS)' },
  'prog.2A_NA':        { en: 'North America Minor',              fr: 'Mineure Amérique du Nord' },
  'prog.2A_AFRICA_EN': { en: 'Africa Minor — English Track',     fr: 'Mineure Afrique — Filière anglophone' },
  'prog.2A_AFRICA_FR': { en: 'Africa Minor — French Track (METIS)', fr: 'Mineure Afrique — Filière francophone (METIS)' },

  // Language step
  langSetupTitle: {
    en: 'Language Setup',
    fr: 'Configuration des langues',
  },
  langSetupSubEN: {
    en: 'Your track requires studying English to {englishTarget} and/or French to {frenchTarget}. You may not register in a third language until you are at B1 in French and B2 in English (both 48h/semester).',
    fr: 'Votre filière exige l\'étude de l\'anglais jusqu\'au niveau {englishTarget} et/ou du français jusqu\'au niveau {frenchTarget}. Vous ne pouvez pas vous inscrire à une troisième langue avant d\'atteindre B1 en français et B2 en anglais (48h/semestre chacun).',
  },
  langSetupSubFR: {
    en: 'Your track requires studying English to {englishTarget}. You may not register in a third language until you are at B1 in French and B2 in English (both 48h/semester).',
    fr: 'Votre filière exige l\'étude de l\'anglais jusqu\'au niveau {englishTarget}. Vous ne pouvez pas vous inscrire à une troisième langue avant d\'atteindre B1 en français et B2 en anglais (48h/semestre chacun).',
  },
  frenchLevelQ: {
    en: 'French — what level are you currently at?',
    fr: 'Français — quel est votre niveau actuel ?',
  },
  englishLevelQ: {
    en: 'English — what level are you currently at?',
    fr: 'Anglais — quel est votre niveau actuel ?',
  },
  target: {
    en: 'Target: {level}',
    fr: 'Objectif : {level}',
  },
  thirdLangTitle: {
    en: 'Third language',
    fr: 'Troisième langue',
  },
  thirdLangAvailable: {
    en: 'You meet the B1 French + B2 English requirement, so a third language is available. Pick one to unlock it in the course browser (optional).',
    fr: 'Vous remplissez les conditions B1 français + B2 anglais, une troisième langue est donc disponible. Choisissez-en une pour la débloquer dans le navigateur de cours (facultatif).',
  },
  thirdLangLocked: {
    en: 'Third languages are not available until you reach B1 in French and B2 in English (both 48h/semester).',
    fr: 'Les troisièmes langues ne sont pas disponibles tant que vous n\'avez pas atteint le niveau B1 en français et B2 en anglais (48h/semestre chacun).',
  },
  continueToCourses: {
    en: 'Continue to course selection',
    fr: 'Continuer vers la sélection de cours',
  },
  back: {
    en: '← Back',
    fr: '← Retour',
  },
  nativeFluent: {
    en: 'Native / Fluent',
    fr: 'Langue maternelle / Courant',
  },

  // Course browser
  allOptions: {
    en: 'All options',
    fr: 'Toutes les options',
  },
  languagesTab: {
    en: 'Languages',
    fr: 'Langues',
  },
  noCourses: {
    en: 'No courses in this section.',
    fr: 'Aucun cours dans cette section.',
  },
  noCoursesFilter: {
    en: 'No courses match this filter.',
    fr: 'Aucun cours ne correspond à ce filtre.',
  },
  noLangCourses: {
    en: 'No language courses available based on your language setup. Go back to change your language settings.',
    fr: 'Aucun cours de langue disponible selon votre configuration. Revenez en arrière pour modifier vos paramètres de langue.',
  },
  language: {
    en: 'Language',
    fr: 'Langue',
  },
  added: {
    en: '{n} added',
    fr: '{n} ajouté(s)',
  },
  coursesCount: {
    en: '{n} course{plural}',
    fr: '{n} cours',
  },

  // Table columns
  colTitle:       { en: 'Title',          fr: 'Intitulé' },
  colDiscipline:  { en: 'Discipline',     fr: 'Discipline' },
  colUp:          { en: 'UP',             fr: 'UP' },
  colCode:        { en: 'Code matière',   fr: 'Code matière' },
  colType:        { en: 'Type',           fr: 'Type' },
  colJour1:       { en: 'Jour 1',         fr: 'Jour 1' },
  colHoraire1:    { en: 'Horaire 1',      fr: 'Horaire 1' },
  colJour2:       { en: 'Jour 2',         fr: 'Jour 2' },
  colHoraire2:    { en: 'Horaire 2',      fr: 'Horaire 2' },
  colEns1:        { en: 'Enseignant 1',   fr: 'Enseignant 1' },
  colEns2:        { en: 'Enseignant 2',   fr: 'Enseignant 2' },
  colNiveau:      { en: 'Niveau',         fr: 'Niveau' },

  // Calendar
  calDays: {
    en: { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' },
    fr: { Mon: 'Lundi',  Tue: 'Mardi',   Wed: 'Mercredi',  Thu: 'Jeudi',    Fri: 'Vendredi' },
  },
  conflictNote: {
    en: '⚠ Overlapping time slots detected — highlighted in red.',
    fr: '⚠ Chevauchements horaires détectés — surlignés en rouge.',
  },

  // Added list
  selectedCourses: {
    en: 'Selected Courses ({n})',
    fr: 'Cours sélectionnés ({n})',
  },
  addHint: {
    en: 'Drag or click "+" on courses to add them here.',
    fr: 'Glissez ou cliquez sur "+" pour ajouter des cours ici.',
  },
  colSchedule: { en: 'Schedule', fr: 'Horaire' },
  remove: { en: 'Remove', fr: 'Retirer' },

  // Requirements sidebar
  requirements: { en: 'Requirements', fr: 'Exigences' },
  reqDone: { en: '{done}/{total} done', fr: '{done}/{total} complété(s)' },
  langSection: { en: 'Languages', fr: 'Langues' },
  minCredits: { en: 'min. 4 credits/semester', fr: 'min. 4 crédits/semestre' },
  notYetAdded: { en: 'Not yet added', fr: 'Pas encore ajouté' },
  chooseOne: { en: 'Choose one option below:', fr: 'Choisir une option ci-dessous :' },
  selectedOption: { en: 'Selected: {label}', fr: 'Sélectionné : {label}' },
  otherOptions: { en: 'Other options: {list}', fr: 'Autres options : {list}' },

  // Lang target labels for sidebar
  langStudyTo: { en: '{lang} (study to {level})', fr: '{lang} (étudier jusqu\'au {level})' },
  langOptional: { en: '{lang} (third language — optional)', fr: '{lang} (troisième langue — facultatif)' },
  langAddFrom:  { en: 'Add a {lang} course from the Languages tab', fr: 'Ajouter un cours de {lang} depuis l\'onglet Langues' },
  langNoReq:    { en: 'You have reached your target levels. No language course required, but you may still add one.', fr: 'Vous avez atteint vos objectifs de niveau. Aucun cours de langue requis, mais vous pouvez en ajouter un.' },

  // PDF export
  pdfTitle:        { en: 'Course Selection Report', fr: 'Rapport de sélection de cours' },
  pdfCalendar:     { en: 'Weekly Calendar',         fr: 'Emploi du temps hebdomadaire' },
  pdfCourseList:   { en: 'Selected Courses',        fr: 'Cours sélectionnés' },
  pdfRequirements: { en: 'Requirement Checklist',   fr: 'Liste des exigences' },
  pdfGenerated:    { en: 'Generated {date}',        fr: 'Généré le {date}' },
};

// Simple interpolation: t('key', { n: 3 }) replaces {n} with 3
export function translate(strings, lang, key, vars = {}) {
  const entry = strings[key];
  if (!entry) return key;
  let str = entry[lang] || entry.en || key;
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return str;
}
