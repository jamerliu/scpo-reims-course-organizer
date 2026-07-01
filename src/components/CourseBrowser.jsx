import { useMemo, useState } from 'react';
import { typeCategory } from '../data/programMap';
import { formatSchedule } from '../utils/schedule';

const COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'up', label: 'UP' },
  { key: 'codeMatiere', label: 'Code matière' },
  { key: 'day1', label: 'Jour 1' },
  { key: 'time1', label: 'Horaire 1' },
  { key: 'day2', label: 'Jour 2' },
  { key: 'time2', label: 'Horaire 2' },
  { key: 'teacher1', label: 'Enseignant 1' },
  { key: 'teacher2', label: 'Enseignant 2' },
];

function withDisplayFields(c) {
  const s0 = c.schedule[0], s1 = c.schedule[1];
  return {
    ...c,
    day1: s0 ? s0.day : '',
    time1: s0 ? `${s0.start}-${s0.end}` : '',
    day2: s1 ? s1.day : '',
    time2: s1 ? `${s1.start}-${s1.end}` : '',
  };
}

export default function CourseBrowser({ courses, languageProfile, addedIds, onAdd, onRemove }) {
  const isLangMode = courses.length > 0 && courses[0].group === 'LANGUE';

  const allowedLanguages = useMemo(() => {
    if (!isLangMode) return null;
    const allowed = new Set();
    if (languageProfile?.needsFrench) allowed.add('french');
    if (languageProfile?.needsEnglish) allowed.add('english');
    if (languageProfile?.thirdLanguageUnlocked) allowed.add('third');
    return allowed;
  }, [isLangMode, languageProfile]);

  const visibleCourses = useMemo(() => {
    if (!isLangMode) return courses;
    return courses.filter((c) => {
      const langue = (c.langue || '').toLowerCase();
      const isFrench = langue.includes('fle') || langue.includes('français') || langue.includes('francais');
      const isEnglish = langue.includes('anglais') || langue.includes('english');
      if (isFrench) return allowedLanguages.has('french');
      if (isEnglish) return allowedLanguages.has('english');
      // any other language = "third language" pool
      if (!allowedLanguages.has('third')) return false;
      if (languageProfile?.thirdLanguage) {
        return langue.includes(languageProfile.thirdLanguage.toLowerCase());
      }
      return true;
    });
  }, [courses, isLangMode, allowedLanguages, languageProfile]);

  const tabs = useMemo(() => {
    const set = new Set(visibleCourses.map((c) => typeCategory(c.type)));
    return Array.from(set).sort();
  }, [visibleCourses]);

  const [activeTab, setActiveTab] = useState(tabs[0] || '');
  const currentTab = tabs.includes(activeTab) ? activeTab : tabs[0];

  const tabCourses = useMemo(
    () => visibleCourses.filter((c) => typeCategory(c.type) === currentTab).map(withDisplayFields),
    [visibleCourses, currentTab]
  );

  const disciplines = useMemo(() => {
    const set = new Set(tabCourses.map((c) => c.discipline || c.majeure || '—'));
    return ['All', ...Array.from(set).sort()];
  }, [tabCourses]);
  const [disciplineFilter, setDisciplineFilter] = useState('All');

  const [sortKey, setSortKey] = useState('title');
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    let rows = tabCourses;
    if (disciplineFilter !== 'All') {
      rows = rows.filter((c) => (c.discipline || c.majeure || '—') === disciplineFilter);
    }
    rows = [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString();
      const bv = (b[sortKey] ?? '').toString();
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [tabCourses, disciplineFilter, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const columns = isLangMode ? [...COLUMNS.slice(0, 2), { key: 'niveau', label: 'Niveau' }, ...COLUMNS.slice(2)] : COLUMNS;

  return (
    <div className="course-browser">
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} className={t === currentTab ? 'tab active' : 'tab'} onClick={() => { setActiveTab(t); setDisciplineFilter('All'); }}>
            {t}
          </button>
        ))}
      </div>

      <div className="browser-toolbar">
        <label>
          Discipline:
          <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)}>
            {disciplines.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <span className="count">{filtered.length} course{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              {columns.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)} className="sortable">
                  {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
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
                    <button className={added ? 'add-btn added' : 'add-btn'} onClick={() => (added ? onRemove(c.id) : onAdd(c.id))}>
                      {added ? '✓' : '+'}
                    </button>
                  </td>
                  {columns.map((col) => (
                    <td key={col.key}>{c[col.key] ?? ''}</td>
                  ))}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="empty-row">No courses match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
