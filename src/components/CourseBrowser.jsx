import { useMemo, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { formatSchedule } from '../utils/schedule';

function getColumns(t, isLang) {
  if (isLang) return [
    { key: 'title',       label: t('colTitle') },
    { key: 'discipline',  label: t('language') },
    { key: 'niveau',      label: t('colNiveau') },
    { key: 'up',          label: t('colUp') },
    { key: 'codeMatiere', label: t('colCode') },
    { key: 'day1',        label: t('colJour1') },
    { key: 'time1',       label: t('colHoraire1') },
    { key: 'day2',        label: t('colJour2') },
    { key: 'time2',       label: t('colHoraire2') },
    { key: 'teacher1',    label: t('colEns1') },
    { key: 'teacher2',    label: t('colEns2') },
  ];
  return [
    { key: 'title',       label: t('colTitle') },
    { key: 'discipline',  label: t('colDiscipline') },
    { key: 'up',          label: t('colUp') },
    { key: 'codeMatiere', label: t('colCode') },
    { key: 'type',        label: t('colType') },
    { key: 'day1',        label: t('colJour1') },
    { key: 'time1',       label: t('colHoraire1') },
    { key: 'day2',        label: t('colJour2') },
    { key: 'time2',       label: t('colHoraire2') },
    { key: 'teacher1',    label: t('colEns1') },
    { key: 'teacher2',    label: t('colEns2') },
  ];
}

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

function buildSections(profile, allCourses) {
  if (!profile) return [];
  const sections = [];
  profile.categories.forEach((cat) => {
    if (cat.kind === 'mandatory') {
      const matchers = cat.items.map((i) => i.match);
      sections.push({
        id: cat.id,
        label: cat.label,
        note: cat.note || null,
        courses: allCourses.filter((c) => matchers.some((m) => m(c))),
        subsections: null,
      });
    } else if (cat.kind === 'choose-one-of') {
      const subsections = cat.options.map((opt) => {
        const matchers = opt.items.map((i) => i.match);
        return {
          id: opt.label,
          label: opt.label,
          note: opt.note || null,
          courses: allCourses.filter((c) => matchers.some((m) => m(c))),
        };
      });
      const allMatchers = cat.options.flatMap((o) => o.items.map((i) => i.match));
      sections.push({
        id: cat.id,
        label: cat.label,
        note: cat.note || null,
        courses: allCourses.filter((c) => allMatchers.some((m) => m(c))),
        subsections,
      });
    }
  });
  return sections;
}

function CourseTable({ courses, addedIds, onAdd, onRemove, columns }) {
  const [sortKey, setSortKey] = useState('title');
  const [sortDir, setSortDir] = useState('asc');
  const { t } = useLang();

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = useMemo(() => [...courses].sort((a, b) => {
    const av = (a[sortKey] ?? '').toString();
    const bv = (b[sortKey] ?? '').toString();
    const cmp = av.localeCompare(bv, undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  }), [courses, sortKey, sortDir]);

  if (sorted.length === 0) return <p className="empty-row">{t('noCourses')}</p>;

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
                    onClick={() => added ? onRemove(c.id) : onAdd(c.id)}
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
  const { t } = useLang();
  const cols = getColumns(t, false);
  const [activeSub, setActiveSub] = useState(null);

  const displayCourses = useMemo(() => {
    const pool = activeSub
      ? (section.subsections?.find((s) => s.id === activeSub)?.courses || [])
      : section.courses;
    return pool.map(withDisplayFields);
  }, [section, activeSub]);

  const addedCount = section.courses.filter((c) => addedIds.has(c.id)).length;

  return (
    <div className="section-panel">
      <div className="section-panel-header">
        <span className="section-count">
          {addedCount > 0 ? t('added', { n: addedCount }) : t('coursesCount', { n: section.courses.length, plural: section.courses.length !== 1 ? 's' : '' })}
        </span>
        {section.note && <span className="section-note">{section.note}</span>}
      </div>

      {section.subsections && (
        <div className="subtabs">
          <button className={activeSub === null ? 'subtab active' : 'subtab'} onClick={() => setActiveSub(null)}>
            {t('allOptions')}
          </button>
          {section.subsections.map((sub) => {
            const subAdded = sub.courses.filter((c) => addedIds.has(c.id)).length;
            return (
              <button
                key={sub.id}
                className={activeSub === sub.id ? 'subtab active' : 'subtab'}
                onClick={() => setActiveSub(sub.id)}
              >
                {sub.label}{subAdded > 0 ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
      )}

      <CourseTable courses={displayCourses} addedIds={addedIds} onAdd={onAdd} onRemove={onRemove} columns={cols} />
    </div>
  );
}

function LanguagePanel({ languageCourses, languageProfile, addedIds, onAdd, onRemove }) {
  const { t } = useLang();
  const cols = getColumns(t, true);

  const allowed = useMemo(() => {
    const set = new Set();
    if (languageProfile?.needsFrench)  set.add('french');
    if (languageProfile?.needsEnglish) set.add('english');
    if (languageProfile?.thirdLanguageUnlocked) set.add('third');
    return set;
  }, [languageProfile]);

  const visible = useMemo(() => languageCourses.filter((c) => {
    const l = (c.langue || '').toLowerCase();
    const isFr = l.includes('fle') || l.includes('français') || l.includes('francais');
    const isEn = l.includes('anglais') || l.includes('english');
    if (isFr) return allowed.has('french');
    if (isEn) return allowed.has('english');
    if (!allowed.has('third')) return false;
    if (languageProfile?.thirdLanguage) return l.includes(languageProfile.thirdLanguage.toLowerCase());
    return true;
  }).map(withDisplayFields), [languageCourses, allowed, languageProfile]);

  const languages = useMemo(() => ['All', ...Array.from(new Set(visible.map((c) => c.langue || '—'))).sort()], [visible]);
  const [langFilter, setLangFilter] = useState('All');
  const filtered = langFilter === 'All' ? visible : visible.filter((c) => (c.langue || '—') === langFilter);

  if (visible.length === 0) return <p className="empty-row hint">{t('noLangCourses')}</p>;

  return (
    <div className="section-panel">
      <div className="browser-toolbar">
        <label>
          {t('language')}:
          <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
            {languages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <span className="count">{filtered.length} {t('language').toLowerCase()}</span>
      </div>
      <CourseTable courses={filtered} addedIds={addedIds} onAdd={onAdd} onRemove={onRemove} columns={cols} />
    </div>
  );
}

export default function CourseBrowser({ courses, languageProfile, profile, addedIds, onAdd, onRemove }) {
  const { t } = useLang();
  const nonLangCourses = useMemo(() => courses.filter((c) => c.group !== 'LANGUE'), [courses]);
  const langCourses    = useMemo(() => courses.filter((c) => c.group === 'LANGUE'),  [courses]);

  const sections = useMemo(() => buildSections(profile, nonLangCourses), [profile, nonLangCourses]);

  const allTabs = useMemo(() => [
    ...sections.map((s) => ({ id: s.id, label: s.label })),
    { id: '__languages__', label: t('languagesTab') },
  ], [sections, t]);

  const [activeTab, setActiveTab] = useState(sections[0]?.id || '__languages__');
  const currentTabId = allTabs.some((tab) => tab.id === activeTab) ? activeTab : allTabs[0]?.id;
  const activeSection = sections.find((s) => s.id === currentTabId);

  return (
    <div className="course-browser">
      <div className="tabs">
        {allTabs.map((tab) => {
          const sec = sections.find((s) => s.id === tab.id);
          const addedInSection = sec ? sec.courses.filter((c) => addedIds.has(c.id)).length : 0;
          return (
            <button
              key={tab.id}
              className={tab.id === currentTabId ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {addedInSection > 0 && <span className="tab-badge">{addedInSection}</span>}
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
        <SectionPanel section={activeSection} addedIds={addedIds} onAdd={onAdd} onRemove={onRemove} />
      ) : (
        <p className="empty-row">{t('noCourses')}</p>
      )}
    </div>
  );
}
