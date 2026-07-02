import { useMemo, useRef, useState } from 'react';
import coursesData from './data/courses.json';
import { REQUIREMENTS } from './data/requirements';
import { PROGRAM_COURSE_GROUPS } from './data/programMap';
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

  function collectFromItems(items) {
    items.forEach((item) => {
      if (item.autoAdd) {
        const match = pool.find((c) => item.match(c));
        if (match) toAdd.add(match.id);
      }
    });
  }
  profile.categories.forEach((cat) => {
    if (cat.kind === 'mandatory') collectFromItems(cat.items);
    // choose-one-of lectures (majeure/mineure) are left for the student to pick manually
  });
  return Array.from(toAdd);
}

export default function App() {
  const [step, setStep] = useState('select'); // select | language | build
  const [program, setProgram] = useState(null); // { grade, programKey, programLabel }
  const [languageProfile, setLanguageProfile] = useState(null);
  const [addedIds, setAddedIds] = useState([]);
  const [exporting, setExporting] = useState(false);

  const calendarRef = useRef(null);
  const listRef = useRef(null);
  const requirementsRef = useRef(null);

  const courses = useMemo(() => {
    if (!program) return [];
    const groups = PROGRAM_COURSE_GROUPS[program.programKey] || [];
    return coursesData.filter((c) => groups.includes(c.group) || c.group === 'LANGUE');
  }, [program]);

  const addedIdSet = useMemo(() => new Set(addedIds), [addedIds]);
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
        calendarEl: calendarRef.current,
        listEl: listRef.current,
        requirementsEl: requirementsRef.current,
        programLabel: program?.programLabel ? `${program.grade} ${program.programLabel}` : 'Course Plan',
      });
    } finally {
      setExporting(false);
    }
  }

  if (step === 'select') {
    return <ProgramGradeSelect onSelect={handleProgramSelect} />;
  }

  if (step === 'language') {
    return <LanguageStep programKey={program.programKey} onContinue={handleLanguageContinue} onBack={() => setStep('select')} />;
  }

  return (
    <div className="build-screen">
      <header className="build-header">
        <div>
          <h1>{program.grade} — {program.programLabel}</h1>
        </div>
        <div className="header-actions">
          <button onClick={() => setStep('select')}>Change program</button>
          <button onClick={() => setStep('language')}>Language settings</button>
          <button className="primary-btn" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Exporting…' : 'Export PDF report'}
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
