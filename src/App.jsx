import { useMemo, useRef, useState } from 'react';
import coursesData from './data/courses.json';
import { REQUIREMENTS } from './data/requirements';
import { PROGRAM_COURSE_GROUPS } from './data/programMap';
import { useLang } from './i18n/LangContext';
import ProgramGradeSelect from './components/ProgramGradeSelect';
import LanguageStep from './components/LanguageStep';
import CourseBrowser from './components/CourseBrowser';
import CalendarView from './components/CalendarView';
import RequirementSidebar from './components/RequirementSidebar';
import AddedList from './components/AddedList';
import { exportReport } from './utils/exportPdf';
import './App.css';

const byId = new Map(coursesData.map((c) => [c.id, c]));

function autoLectures(programKey) {
  const profile = REQUIREMENTS[programKey];
  if (!profile) return [];
  const groups = PROGRAM_COURSE_GROUPS[programKey] || [];
  const pool = coursesData.filter((c) => groups.includes(c.group));
  const toAdd = new Set();
  profile.categories.forEach((cat) => {
    if (cat.kind === 'mandatory') {
      cat.items.forEach((item) => {
        if (item.autoAdd) {
          const match = pool.find((c) => item.match(c));
          if (match) toAdd.add(match.id);
        }
      });
    }
  });
  return Array.from(toAdd);
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
      title={lang === 'en' ? 'Passer en français' : 'Switch to English'}
    >
      {lang === 'en' ? '🇫🇷 FR' : '🇬🇧 EN'}
    </button>
  );
}

export default function App() {
  const { t } = useLang();
  const [step, setStep] = useState('select');
  const [program, setProgram] = useState(null);
  const [languageProfile, setLanguageProfile] = useState(null);
  const [addedIds, setAddedIds] = useState([]);
  const [exporting, setExporting] = useState(false);

  const calendarRef     = useRef(null);
  const listRef         = useRef(null);
  const requirementsRef = useRef(null);

  const courses = useMemo(() => {
    if (!program) return [];
    const groups = PROGRAM_COURSE_GROUPS[program.programKey] || [];
    return coursesData.filter((c) => groups.includes(c.group) || c.group === 'LANGUE');
  }, [program]);

  const addedIdSet   = useMemo(() => new Set(addedIds), [addedIds]);
  const addedCourses = useMemo(() => addedIds.map((id) => byId.get(id)).filter(Boolean), [addedIds]);

  function handleProgramSelect(sel) {
    setProgram(sel);
    setStep('language');
  }

  function handleLanguageContinue(langProfile) {
    setLanguageProfile(langProfile);
    setAddedIds(autoLectures(program.programKey));
    setStep('build');
  }

  function addCourse(id) {
    setAddedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function removeCourse(id) {
    setAddedIds((prev) => prev.filter((x) => x !== id));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportReport({
        calendarEl:     calendarRef.current,
        listEl:         listRef.current,
        requirementsEl: requirementsRef.current,
        programLabel:   program?.programLabel ? `${program.grade} ${program.programLabel}` : 'Course Plan',
        t,
      });
    } finally {
      setExporting(false);
    }
  }

  if (step === 'select') {
    return <ProgramGradeSelect onSelect={handleProgramSelect} langToggle={<LangToggle />} />;
  }

  if (step === 'language') {
    return (
      <LanguageStep
        programKey={program.programKey}
        onContinue={handleLanguageContinue}
        onBack={() => setStep('select')}
        langToggle={<LangToggle />}
      />
    );
  }

  return (
    <div className="build-screen">
      <header className="build-header">
        <div>
          <h1>{program.grade} — {program.programLabel}</h1>
        </div>
        <div className="header-actions">
          <LangToggle />
          <button onClick={() => setStep('select')}>{t('changeProgram')}</button>
          <button onClick={() => setStep('language')}>{t('languageSettings')}</button>
          <button className="primary-btn" disabled={exporting} onClick={handleExport}>
            {exporting ? t('exporting') : t('exportPdf')}
          </button>
        </div>
      </header>

      <div className="build-layout">
        <div className="left-col">
          <CourseBrowser
            courses={courses}
            profile={REQUIREMENTS[program.programKey]}
            languageProfile={languageProfile}
            addedIds={addedIdSet}
            onAdd={addCourse}
            onRemove={removeCourse}
          />
        </div>

        <div className="mid-col">
          <div ref={calendarRef}>
            <CalendarView addedCourses={addedCourses} onDrop={addCourse} onRemove={removeCourse} />
          </div>
          <div ref={listRef}>
            <AddedList addedCourses={addedCourses} onRemove={removeCourse} />
          </div>
        </div>

        <div className="right-col" ref={requirementsRef}>
          <RequirementSidebar
            profile={REQUIREMENTS[program.programKey]}
            addedCourses={addedCourses}
            languageProfile={languageProfile}
          />
        </div>
      </div>
    </div>
  );
}
