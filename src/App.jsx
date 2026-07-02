import { useMemo, useRef, useState } from 'react';
import coursesData from './data/courses.json';
import { REQUIREMENTS, MAJEURE_OPTIONS, MINEURE_OPTIONS } from './data/requirements';
import { PROGRAM_COURSE_GROUPS } from './data/programMap';
import { useLang } from './i18n/LangContext';
import ProgramGradeSelect from './components/ProgramGradeSelect';
import MajeureMineurSelect from './components/MajeureMineurSelect';
import LanguageStep from './components/LanguageStep';
import CourseBrowser from './components/CourseBrowser';
import CalendarView from './components/CalendarView';
import RequirementSidebar from './components/RequirementSidebar';
import AddedList from './components/AddedList';
import { exportReport } from './utils/exportPdf';
import './App.css';

const byId = new Map(coursesData.map((c) => [c.id, c]));

function autoLectures(programKey, majeureMineure) {
  const profile = REQUIREMENTS[programKey];
  if (!profile) return [];
  const groups = PROGRAM_COURSE_GROUPS[programKey] || [];
  const pool = coursesData.filter((c) => groups.includes(c.group));
  const toAdd = new Set();

  // For 1A: auto-add from mandatory categories only
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

  // For 2A: also auto-add from the chosen majeure and mineure options
  if (majeureMineure) {
    const { majeure, mineure } = majeureMineure;

    const majeureOpts = MAJEURE_OPTIONS[programKey] || [];
    const mineureOpts = MINEURE_OPTIONS[programKey] || [];

    const majeureOpt = majeureOpts.find((o) => o.label === majeure);
    const mineureOpt = mineureOpts.find((o) => o.label === mineure);

    [majeureOpt, mineureOpt].forEach((opt) => {
      if (!opt) return;
      opt.items.forEach((item) => {
        if (item.autoAdd) {
          const match = pool.find((c) => item.match(c));
          if (match) toAdd.add(match.id);
        }
      });
    });
  }

  return Array.from(toAdd);
}

// For 1A_NA: all quadruplette courses share group numbers 1-19 across
// ADRO 17A00, AHIS 17A00, ASPO 17A00, BHUM 17A00.
// Adding any one auto-adds all 3 siblings with the same quadGroup number.
const QUAD_CODES = new Set(['ADRO 17A00', 'AHIS 17A00', 'ASPO 17A00', 'BHUM 17A00']);

function getQuadSiblings(courseId) {
  const c = byId.get(courseId);
  if (!c || c.group !== '1A_NA' || !c.quadGroup || !QUAD_CODES.has(c.codeMatiere)) return [];
  return coursesData.filter(
    (s) => s.group === '1A_NA' && s.quadGroup === c.quadGroup && QUAD_CODES.has(s.codeMatiere) && s.id !== courseId
  ).map((s) => s.id);
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

function Watermark() {
  return (
    <div className="watermark">
      Made by James Liu&nbsp;|&nbsp;
      <a href="https://www.instagram.com/jamerliu/" target="_blank" rel="noopener noreferrer">
        @jamerliu
      </a>
    </div>
  );
}

export default function App() {
  const { t, lang } = useLang();
  const [step, setStep] = useState('select'); // select | majeure | language | build
  const [program, setProgram] = useState(null);
  const [majeureMineure, setMajeureMineure] = useState(null);
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
    setMajeureMineure(null);
    // 2A programs need majeure/mineure selection first
    if (sel.grade === '2A') {
      setStep('majeure');
    } else {
      setStep('language');
    }
  }

  function handleMajeureMineurSelect(sel) {
    setMajeureMineure(sel);
    setStep('language');
  }

  function handleLanguageContinue(langProfile) {
    setLanguageProfile(langProfile);
    setAddedIds(autoLectures(program.programKey, majeureMineure));
    setStep('build');
  }

  function addCourse(id) {
    const siblings = getQuadSiblings(id);
    setAddedIds((prev) => {
      const set = new Set(prev);
      set.add(id);
      siblings.forEach((s) => set.add(s));
      return Array.from(set);
    });
  }
  function removeCourse(id) {
    const siblings = getQuadSiblings(id);
    setAddedIds((prev) => prev.filter((x) => x !== id && !siblings.includes(x)));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const profile = REQUIREMENTS[program.programKey];
      const { evaluateProfile, evaluateLanguages } = await import('./utils/requirementEngine');
      const requirementResults = evaluateProfile(profile, addedCourses);
      const langResults = evaluateLanguages(languageProfile, addedCourses, t);
      exportReport({
        addedCourses,
        requirementResults,
        langResults,
        programLabel: program?.programLabel ? `${program.grade} — ${program.programLabel}` : 'Course Plan',
        lang,
      });
    } finally {
      setExporting(false);
    }
  }

  if (step === 'select') {
    return <><ProgramGradeSelect onSelect={handleProgramSelect} langToggle={<LangToggle />} /><Watermark /></>;
  }

  if (step === 'majeure') {
    return (
      <>
        <MajeureMineurSelect
          programKey={program.programKey}
          onSelect={handleMajeureMineurSelect}
          onBack={() => setStep('select')}
          langToggle={<LangToggle />}
        />
        <Watermark />
      </>
    );
  }

  if (step === 'language') {
    return (
      <>
        <LanguageStep
          programKey={program.programKey}
          onContinue={handleLanguageContinue}
          onBack={() => setStep('select')}
          langToggle={<LangToggle />}
        />
        <Watermark />
      </>
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
          {program?.grade === '2A' && (
            <button onClick={() => setStep('majeure')}>
              {t('languageSettings') === 'Language settings' ? 'Change Majeure/Mineure' : 'Changer Majeure/Mineure'}
            </button>
          )}
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
      <Watermark />
    </div>
  );
}
