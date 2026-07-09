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
import LoadModal from './components/LoadModal';
import ComparePage from './components/ComparePage';
import RegistrationTab from './components/RegistrationTab';
import { exportReport } from './utils/exportPdf';
import { buildSaveData, downloadSave } from './utils/saveLoad';
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
  const [step, setStep] = useState('select'); // select | majeure | language | build | compare
  const [buildTab, setBuildTab] = useState('planner'); // planner | registration
  const [program, setProgram] = useState(null);
  const [majeureMineure, setMajeureMineure] = useState(null);
  const [languageProfile, setLanguageProfile] = useState(null);
  const [addedIds, setAddedIds] = useState([]);
  const [starredIds, setStarredIds] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [showLoad, setShowLoad] = useState(false);

  const calendarRef     = useRef(null);
  const listRef         = useRef(null);
  const requirementsRef = useRef(null);

  const courses = useMemo(() => {
    if (!program) return [];
    const groups = PROGRAM_COURSE_GROUPS[program.programKey] || [];
    return coursesData.filter((c) => groups.includes(c.group) || c.group === 'LANGUE');
  }, [program]);

  const addedIdSet   = useMemo(() => new Set(addedIds), [addedIds]);
  const starredIdSet = useMemo(() => new Set(starredIds), [starredIds]);
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

  function toggleStar(id) {
    setStarredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSave() {
    const data = buildSaveData({
      program,
      majeureMineure,
      languageProfile,
      addedIds,
      starredIds,
      coursesById: byId,
    });
    const slug = program?.programKey?.toLowerCase().replace(/_/g, '-') || 'schedule';
    const date = new Date().toISOString().slice(0, 10);
    downloadSave(data, `course-plan-${slug}-${date}.json`);
  }

  function handleRestore(result) {
    // Restore full program/language/course state from validated save data
    setProgram(result.program);
    setMajeureMineure(result.majeureMineure);
    setLanguageProfile(result.languageProfile);
    setAddedIds(result.safeAddedIds);
    setStarredIds(result.safeStarredIds);
    setStep('build');
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

  // Build the current stack object for passing to ComparePage
  const currentStackForCompare = program ? {
    label: `${program.grade} — ${program.programLabel}`,
    programKey: program.programKey,
    savedAt: null,
    courses: addedCourses,
    addedIds,
    languageProfile,
    majeureMineure,
  } : null;

  if (step === 'compare') {
    return (
      <>
        <ComparePage
          onBack={() => setStep('build')}
          currentStack={currentStackForCompare}
        />
        <Watermark />
      </>
    );
  }

  if (step === 'select') {
    return (
      <>
        <ProgramGradeSelect onSelect={handleProgramSelect} langToggle={<LangToggle />} onLoad={() => setShowLoad(true)} />
        {showLoad && <LoadModal onClose={() => setShowLoad(false)} onRestore={handleRestore} />}
        <Watermark />
      </>
    );
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
        <div className="build-header-left">
          <h1>{program.grade} — {program.programLabel}</h1>
          <div className="build-tabs">
            <button
              className={buildTab === 'planner' ? 'build-tab active' : 'build-tab'}
              onClick={() => setBuildTab('planner')}
            >
              {lang === 'fr' ? '📅 Planificateur' : '📅 Planner'}
            </button>
            <button
              className={buildTab === 'registration' ? 'build-tab active' : 'build-tab'}
              onClick={() => setBuildTab('registration')}
            >
              {lang === 'fr' ? '📝 Inscription' : '📝 Registration'}
              {addedCourses.length > 0 && <span className="build-tab-badge">{addedCourses.length}</span>}
            </button>
          </div>
        </div>
        <div className="header-actions">
          <LangToggle />
          <button onClick={() => setStep('select')}>{t('changeProgram')}</button>
          {program?.grade === '2A' && (
            <button onClick={() => setStep('majeure')}>
              {lang === 'fr' ? 'Changer Majeure/Mineure' : 'Change Majeure/Mineure'}
            </button>
          )}
          <button onClick={() => setStep('language')}>{t('languageSettings')}</button>
          <button className="save-btn" onClick={handleSave} title={lang === 'fr' ? 'Sauvegarder l\'emploi du temps' : 'Save schedule to file'}>
            {lang === 'fr' ? '💾 Sauvegarder' : '💾 Save'}
          </button>
          <button className="load-btn" onClick={() => setShowLoad(true)} title={lang === 'fr' ? 'Charger un emploi du temps' : 'Load a saved schedule'}>
            {lang === 'fr' ? '📂 Charger' : '📂 Load'}
          </button>
          <button className="compare-btn" onClick={() => setStep('compare')}>
            {lang === 'fr' ? '⚖ Comparer' : '⚖ Compare'}
          </button>
          <button className="primary-btn" disabled={exporting} onClick={handleExport}>
            {exporting ? t('exporting') : t('exportPdf')}
          </button>
        </div>
      </header>

      {showLoad && <LoadModal onClose={() => setShowLoad(false)} onRestore={handleRestore} />}

      <div className="build-layout">
        {buildTab === 'planner' ? (
          <>
            <div className="left-col">
              <CourseBrowser
                courses={courses}
                profile={REQUIREMENTS[program.programKey]}
                languageProfile={languageProfile}
                addedIds={addedIdSet}
                starredIds={starredIdSet}
                onAdd={addCourse}
                onRemove={removeCourse}
                onStar={toggleStar}
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
          </>
        ) : (
          <div className="reg-full-col">
            <RegistrationTab
              addedCourses={addedCourses}
              allProgramCourses={courses}
              onUpdateIds={(newIds) => setAddedIds(newIds)}
            />
          </div>
        )}
      </div>
      <Watermark />
    </div>
  );
}
