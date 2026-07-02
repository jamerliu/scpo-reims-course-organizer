import { useMemo, useState } from 'react';
import { formatSchedule } from '../utils/schedule';

// Standard columns shown in every course table
const BASE_COLUMNS = [
  { key: 'title',       label: 'Title' },
  { key: 'discipline',  label: 'Discipline' },
  { key: 'up',          label: 'UP' },
  { key: 'codeMatiere', label: 'Code matière' },
  { key: 'type',        label: 'Type' },
  { key: 'day1',        label: 'Jour 1' },
  { key: 'time1',       label: 'Horaire 1' },
  { key: 'day2',        label: 'Jour 2' },
  { key: 'time2',       label: 'Horaire 2' },
  { key: 'teacher1',    label: 'Enseignant 1' },
  { key: 'teacher2',    label: 'Enseignant 2' },
];
const LANG_COLUMNS = [
  { key: 'title',       label: 'Title' },
  { key: 'discipline',  label: 'Language' },
  { key: 'niveau',      label: 'Niveau' },
  { key: 'up',          label: 'UP' },
  { key: 'codeMatiere', label: 'Code matière' },
  { key: 'day1',        label: 'Jour 1' },
  { key: 'time1',       label: 'Horaire 1' },
  { key: 'day2',        label: 'Jour 2' },
  { key: 'time2',       label: 'Horaire 2' },
  { key: 'teacher1',    label: 'Enseignant 1' },
  { key: 'teacher2',    label: 'Enseignant 2' },
];

function withDisplayFields(c) {
  const s0 = c.schedule[0], s1 = c.schedule[1];
  return {
    ...c,
    day1:  s0 ? s0.day : '',
    time1: s0 ? `${s0.start}–${s0.end}` : '',
    day2:  s1 ? s1.day : '',
    time2: s1 ? `${s1.start}–${s1.end}` : '',
  };
}

// Build section tabs from the requirement profile.
// Each category in the profile becomes a top-level section.
// For choose-one-of categories (majeure, mineure), each option also gets
// its own sub-section so the student can browse courses for that option specifically.
// A catch-all "Other / Elective" section shows courses that don't match any requirement item.
function buildSections(profile, allCourses, languageProfile) {
  if (!profile) return [];

  // Collect all matcher functions and which section they belong to
  const sections = [];

  profile.categories.forEach((cat) => {
    if (cat.kind === 'mandatory') {
      // Each item within the category becomes a sub-bucket inside one section
      const matchers = cat.items.map((item) => item.match);
      const poolCourses = allCourses.filter((c) => matchers.some((m) => m(c)));
      sections.push({
        id: cat.id,
        label: cat.label,
        note: cat.note || null,
        courses: poolCourses,
        subsections: null,
      });
    } else if (cat.kind === 'choose-one-of') {
      // Build one subsection per option
      const subsections = cat.options.map((opt) => {
        const matchers = opt.items.map((item) => item.match);
        return {
          id: opt.label,
          label: opt.label,
          note: opt.note || null,
          courses: allCourses.filter((c) => matchers.some((m) => m(c))),
        };
      });
      // Also build a union pool for the top-level tab
      const allMatchers = cat.options.flatMap((o) => o.items.map((i) => i.match));
      const poolCourses = allCourses.filter((c) => allMatchers.some((m) => m(c)));
      sections.push({
        id: cat.id,
        label: cat.label,
        note: cat.note || null,
        courses: poolCourses,
        subsections,
      });
    }
  });

  // Language section (always last in non-language browsers, handled separately)
  return sections;
}

function CourseTable({ courses, addedIds, onAdd, onRemove, columns }) {
  const [sortKey, setSortKey] = useState('title');
  const [sortDir, setSortDir] = useState('asc');

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = useMemo(() => {
    return [...courses].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString();
      const bv = (b[sortKey] ?? '').toString();
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [courses, sortKey, sortDir]);

  if (sorted.length === 0) {
    return <p className="empty-row">No courses in this section.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            {columns.map((col) => (
              <th key={col.key} className="sortable" onClick={() => toggleSort(col.key)}>
                {col.label}{sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const added = addedIds.has(c.id);
            return (
              <tr
                key={c.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/course-id', c.id)}
                className={added ? 'added-row' : ''}
                title={formatSchedule(c)}
              >
                <td>
                  <button
                    className={added ? 'add-btn added' : 'add-btn'}
                    onClick={() => (added ? onRemove(c.id) : onAdd(c.id))}
                  >
                    {added ? '✓' : '+'}
                  </button>
                </td>
                {columns.map((col) => (
                  <td key={col.key}>{c[col.key] ?? ''}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionPanel({ section, addedIds, onAdd, onRemove }) {
  const [activeSub, setActiveSub] = useState(null);
  const cols = BASE_COLUMNS;

  const displayCourses = useMemo(() => {
    const pool = activeSub
      ? (section.subsections.find((s) => s.id === activeSub)?.courses || [])
      : section.courses;
    return pool.map(withDisplayFields);
  }, [section, activeSub]);

  const addedCount = section.courses.filter((c) => addedIds.has(c.id)).length;

  return (
    <div className="section-panel">
      <div className="section-panel-header">
        <span className="section-count">{addedCount > 0 ? `${addedCount} added` : `${section.courses.length} courses`}</span>
        {section.note && <span className="section-note">{section.note}</span>}
      </div>

      {section.subsections && (
        <div className="subtabs">
          <button
            className={activeSub === null ? 'subtab active' : 'subtab'}
            onClick={() => setActiveSub(null)}
          >
            All options
          </button>
          {section.subsections.map((sub) => (
            <button
              key={sub.id}
              className={activeSub === sub.id ? 'subtab active' : 'subtab'}
              onClick={() => setActiveSub(sub.id)}
            >
              {sub.label}
              {sub.courses.filter((c) => addedIds.has(c.id)).length > 0
                ? ` ✓` : ''}
            </button>
          ))}
        </div>
      )}

      <CourseTable
        courses={displayCourses}
        addedIds={addedIds}
        onAdd={onAdd}
        onRemove={onRemove}
        columns={cols}
      />
    </div>
  );
}

function LanguagePanel({ languageCourses, languageProfile, addedIds, onAdd, onRemove }) {
  const allowed = useMemo(() => {
    const set = new Set();
    if (languageProfile?.needsFrench)  set.add('french');
    if (languageProfile?.needsEnglish) set.add('english');
    if (languageProfile?.thirdLanguageUnlocked) set.add('third');
    return set;
  }, [languageProfile]);

  const visible = useMemo(() => {
    return languageCourses.filter((c) => {
      const l = (c.langue || '').toLowerCase();
      const isFr = l.includes('fle') || l.includes('français') || l.includes('francais');
      const isEn = l.includes('anglais') || l.includes('english');
      if (isFr) return allowed.has('french');
      if (isEn) return allowed.has('english');
      if (!allowed.has('third')) return false;
      if (languageProfile?.thirdLanguage) return l.includes(languageProfile.thirdLanguage.toLowerCase());
      return true;
    }).map(withDisplayFields);
  }, [languageCourses, allowed, languageProfile]);

  const languages = useMemo(() => ['All', ...Array.from(new Set(visible.map((c) => c.langue || '—'))).sort()], [visible]);
  const [langFilter, setLangFilter] = useState('All');

  const filtered = langFilter === 'All' ? visible : visible.filter((c) => (c.langue || '—') === langFilter);

  if (visible.length === 0) {
    return (
      <p className="empty-row hint">
        No language courses available based on your language setup. Go back to change your language settings.
      </p>
    );
  }

  return (
    <div className="section-panel">
      <div className="browser-toolbar">
        <label>
          Language:
          <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
            {languages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <span className="count">{filtered.length} courses</span>
      </div>
      <CourseTable courses={filtered} addedIds={addedIds} onAdd={onAdd} onRemove={onRemove} columns={LANG_COLUMNS} />
    </div>
  );
}

export default function CourseBrowser({ courses, languageProfile, profile, addedIds, onAdd, onRemove }) {
  const nonLangCourses = useMemo(() => courses.filter((c) => c.group !== 'LANGUE'), [courses]);
  const langCourses    = useMemo(() => courses.filter((c) => c.group === 'LANGUE'),  [courses]);

  const sections = useMemo(
    () => buildSections(profile, nonLangCourses, languageProfile),
    [profile, nonLangCourses, languageProfile]
  );

  // Add Languages as a fixed last section
  const allTabs = useMemo(() => [
    ...sections.map((s) => ({ id: s.id, label: s.label })),
    { id: '__languages__', label: 'Languages' },
  ], [sections]);

  const [activeTab, setActiveTab] = useState(allTabs[0]?.id || '');
  const currentTabId = allTabs.some((t) => t.id === activeTab) ? activeTab : allTabs[0]?.id;

  const activeSection = sections.find((s) => s.id === currentTabId);

  return (
    <div className="course-browser">
      <div className="tabs">
        {allTabs.map((t) => {
          const isLang = t.id === '__languages__';
          const sec = sections.find((s) => s.id === t.id);
          const addedInSection = sec ? sec.courses.filter((c) => addedIds.has(c.id)).length : 0;
          return (
            <button
              key={t.id}
              className={t.id === currentTabId ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {!isLang && addedInSection > 0 && <span className="tab-badge">{addedInSection}</span>}
            </button>
          );
        })}
      </div>

      {currentTabId === '__languages__' ? (
        <LanguagePanel
          languageCourses={langCourses}
          languageProfile={languageProfile}
          addedIds={addedIds}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ) : activeSection ? (
        <SectionPanel
          section={activeSection}
          addedIds={addedIds}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ) : (
        <p className="empty-row">No courses available for this section.</p>
      )}
    </div>
  );
}
