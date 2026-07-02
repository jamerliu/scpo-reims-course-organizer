// Print-quality export: generates a purpose-built HTML document in a new tab
// and triggers the browser's native print dialog (vector quality, no screenshots).

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS_EN = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
const DAY_LABELS_FR = { Mon: 'Lundi', Tue: 'Mardi', Wed: 'Mercredi', Thu: 'Jeudi', Fri: 'Vendredi' };

const GRID_START = 8 * 60;  // 08:00
const GRID_END   = 21 * 60; // 21:00
const GRID_SPAN  = GRID_END - GRID_START;

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const PALETTE = ['#5b8def','#e07a5f','#81b29a','#c9a84c','#9b5de5','#1aa7c4','#e06090','#3aaa8b'];
function colorFor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % PALETTE.length;
  return PALETTE[hash];
}

function buildCalendarHTML(addedCourses, dayLabels) {
  const hours = [];
  for (let m = GRID_START; m <= GRID_END; m += 60) hours.push(m);

  const timeGutter = hours.map(m => {
    const pct = ((m - GRID_START) / GRID_SPAN) * 100;
    const label = `${String(Math.floor(m / 60)).padStart(2,'0')}:00`;
    return `<div class="hour-label" style="top:${pct}%">${label}</div>`;
  }).join('');

  const hourLines = hours.map(m => {
    const pct = ((m - GRID_START) / GRID_SPAN) * 100;
    return `<div class="hour-line" style="top:${pct}%"></div>`;
  }).join('');

  const dayColumns = DAYS.map(day => {
    const blocks = addedCourses.flatMap(c =>
      (c.schedule || [])
        .filter(s => s.day === day)
        .map((s, idx) => {
          const startMin = Math.max(toMin(s.start), GRID_START);
          const endMin   = Math.min(toMin(s.end),   GRID_END);
          const top    = ((startMin - GRID_START) / GRID_SPAN) * 100;
          const height = Math.max(((endMin - startMin) / GRID_SPAN) * 100, 1.5);
          const color  = colorFor(c.id);
          const note   = s.note ? `<div class="block-note">${s.note}</div>` : '';
          return `
            <div class="cal-block" style="top:${top}%;height:${height}%;background:${color}">
              <div class="block-title">${c.title}</div>
              <div class="block-sub">${s.start}–${s.end}</div>
              ${note}
            </div>`;
        })
    ).join('');

    return `<div class="day-col">${hourLines}${blocks}</div>`;
  }).join('');

  const dayHeaders = DAYS.map(d => `<div class="day-head">${dayLabels[d]}</div>`).join('');

  return `
    <div class="calendar-wrap">
      <div class="cal-header">
        <div class="gutter-head"></div>
        ${dayHeaders}
      </div>
      <div class="cal-grid">
        <div class="time-gutter">${timeGutter}</div>
        ${dayColumns}
      </div>
    </div>`;
}

function buildCourseTableHTML(addedCourses, lang) {
  const headers = lang === 'fr'
    ? ['Intitulé','Discipline','Type','UP','Code matière','Horaire','Enseignant 1','Enseignant 2']
    : ['Title','Discipline','Type','UP','Code','Schedule','Teacher 1','Teacher 2'];

  function formatSched(c) {
    if (!c.schedule || c.schedule.length === 0) return '—';
    const dl = lang === 'fr' ? DAY_LABELS_FR : DAY_LABELS_EN;
    return c.schedule.map(s => `${dl[s.day] || s.day} ${s.start}–${s.end}${s.note ? ` (${s.note})` : ''}`).join('<br>');
  }

  const rows = addedCourses.map((c, i) => {
    const stripe = i % 2 === 0 ? '' : 'class="alt"';
    return `
      <tr ${stripe}>
        <td><strong>${c.title || '—'}</strong></td>
        <td>${c.discipline || c.majeure || '—'}</td>
        <td>${c.type || '—'}</td>
        <td>${c.up || '—'}</td>
        <td><code>${c.codeMatiere || '—'}</code></td>
        <td>${formatSched(c)}</td>
        <td>${c.teacher1 || '—'}</td>
        <td>${c.teacher2 || '—'}</td>
      </tr>`;
  }).join('');

  return `
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildRequirementsHTML(requirementResults, langResults, programLabel, lang) {
  // requirementResults: array of evaluated categories from evaluateProfile
  // langResults: array from evaluateLanguages
  const tick  = `<span class="chk yes">✓</span>`;
  const cross = `<span class="chk no">✗</span>`;

  function itemRow(label, detail, fulfilled, optional) {
    const icon = optional ? `<span class="chk opt">○</span>` : (fulfilled ? tick : cross);
    return `
      <div class="req-row${fulfilled ? ' done' : ''}">
        ${icon}
        <div>
          <div class="req-label">${label}</div>
          ${detail ? `<div class="req-detail">${detail}</div>` : ''}
        </div>
      </div>`;
  }

  const langSection = langResults.length === 0 ? '' : `
    <div class="req-cat">
      <div class="req-cat-title">${lang === 'fr' ? 'Langues' : 'Languages'}</div>
      ${langResults.map(l => itemRow(l.label, l.detail, l.fulfilled, l.optional)).join('')}
    </div>`;

  const catSections = requirementResults.map(cat => {
    let rows = '';
    if (cat.kind === 'mandatory') {
      rows = cat.items.map(item => {
        const detail = item.matchedCourse
          ? `${item.matchedCourse.title}${item.matchedCourse.teacher1 ? ' — ' + item.matchedCourse.teacher1 : ''}`
          : (lang === 'fr' ? 'Non ajouté' : 'Not yet added');
        return itemRow(item.label, detail, item.fulfilled, false);
      }).join('');
    } else if (cat.kind === 'choose-one-of') {
      if (cat.activeOption) {
        rows = `<div class="req-selected">${lang === 'fr' ? 'Sélectionné' : 'Selected'}: ${cat.activeOption.label}</div>`;
        rows += cat.activeOption.items.map(item => {
          const detail = item.matchedCourse
            ? `${item.matchedCourse.title}${item.matchedCourse.teacher1 ? ' — ' + item.matchedCourse.teacher1 : ''}`
            : (lang === 'fr' ? 'Non ajouté' : 'Not yet added');
          return itemRow(item.label, detail, item.fulfilled, false);
        }).join('');
      } else {
        rows = cat.options.map(opt =>
          `<div class="req-option-group">
            <div class="req-option-label">${opt.label}</div>
            ${opt.items.map(item => itemRow(item.label, null, false, false)).join('')}
          </div>`
        ).join('');
      }
    }
    const allFulfilled = cat.fulfilled;
    return `
      <div class="req-cat">
        <div class="req-cat-title${allFulfilled ? ' done' : ''}">
          ${allFulfilled ? '✓ ' : ''}${cat.label}
        </div>
        ${rows}
      </div>`;
  }).join('');

  return langSection + catSections;
}

export function exportReport({ addedCourses, requirementResults, langResults, programLabel, lang }) {
  const dayLabels  = lang === 'fr' ? DAY_LABELS_FR : DAY_LABELS_EN;
  const dateStr    = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const title      = lang === 'fr' ? 'Rapport de sélection de cours' : 'Course Selection Report';
  const calTitle   = lang === 'fr' ? 'Emploi du temps hebdomadaire' : 'Weekly Schedule';
  const listTitle  = lang === 'fr' ? 'Cours sélectionnés' : 'Selected Courses';
  const reqTitle   = lang === 'fr' ? 'Liste des exigences' : 'Requirement Checklist';
  const genBy      = lang === 'fr' ? `Généré le ${dateStr}` : `Generated ${dateStr}`;
  const madeBy     = 'Made by James Liu | @jamerliu';

  const calHTML   = buildCalendarHTML(addedCourses, dayLabels);
  const tableHTML = buildCourseTableHTML(addedCourses, lang);
  const reqHTML   = requirementResults ? buildRequirementsHTML(requirementResults, langResults || [], programLabel, lang) : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${title} — ${programLabel}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  /* ---- Base ---- */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 11pt;
    color: #2d3748;
    background: #fff;
    padding: 0;
  }
  h1, h2, h3 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; letter-spacing: -0.02em; }

  /* ---- Cover header ---- */
  .doc-header {
    padding: 32px 40px 28px;
    border-bottom: 3px solid #6C63FF;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 0;
    background: #f8f8ff;
  }
  .doc-header-left h1 { font-size: 22pt; color: #3D4852; margin-bottom: 4px; }
  .doc-header-left .program { font-size: 12pt; color: #6B7280; font-weight: 500; }
  .doc-header-right { text-align: right; font-size: 9pt; color: #9CA3AF; line-height: 1.6; }
  .doc-header-right .made-by { color: #6C63FF; font-weight: 600; }

  /* ---- Section breaks ---- */
  .section { padding: 28px 40px; }
  .section + .section { border-top: 1px solid #E5E7EB; }
  .section-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13pt;
    font-weight: 700;
    color: #3D4852;
    margin-bottom: 18px;
    padding-bottom: 8px;
    border-bottom: 2px solid #E0E5EC;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .section-title .count {
    font-size: 9pt;
    font-weight: 600;
    background: #6C63FF;
    color: white;
    padding: 2px 9px;
    border-radius: 20px;
    letter-spacing: 0;
  }

  /* ---- CALENDAR ---- */
  .calendar-wrap { width: 100%; }
  .cal-header {
    display: grid;
    grid-template-columns: 48px repeat(5, 1fr);
    margin-bottom: 0;
  }
  .gutter-head { }
  .day-head {
    text-align: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6B7280;
    padding: 6px 0 8px;
    border-bottom: 2px solid #E5E7EB;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: 48px repeat(5, 1fr);
    height: 660px;
    position: relative;
  }
  .time-gutter { position: relative; }
  .hour-label {
    position: absolute;
    font-size: 7.5pt;
    color: #9CA3AF;
    transform: translateY(-6px);
    right: 6px;
    font-weight: 500;
    white-space: nowrap;
  }
  .day-col {
    position: relative;
    border-left: 1px solid #E5E7EB;
  }
  .hour-line {
    position: absolute;
    left: 0; right: 0;
    border-top: 1px solid #F3F4F6;
  }
  .cal-block {
    position: absolute;
    left: 2px; right: 2px;
    border-radius: 6px;
    color: white;
    padding: 4px 6px;
    overflow: hidden;
    font-size: 7.5pt;
  }
  .block-title { font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.25; }
  .block-sub   { opacity: 0.88; font-size: 7pt; margin-top: 1px; }
  .block-note  { opacity: 0.8;  font-size: 6.5pt; font-style: italic; }

  /* ---- COURSE TABLE ---- */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    table-layout: fixed;
  }
  col.col-title    { width: 19%; }
  col.col-disc     { width: 13%; }
  col.col-type     { width: 13%; }
  col.col-up       { width: 5%; }
  col.col-code     { width: 9%; }
  col.col-sched    { width: 15%; }
  col.col-t1       { width: 13%; }
  col.col-t2       { width: 13%; }

  thead tr {
    background: #3D4852;
    color: white;
  }
  thead th {
    padding: 9px 10px;
    text-align: left;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  tbody td {
    padding: 8px 10px;
    vertical-align: top;
    border-bottom: 1px solid #F3F4F6;
    line-height: 1.45;
    word-break: break-word;
    white-space: normal;
  }
  tbody tr.alt td { background: #FAFAFA; }
  tbody tr:hover td { background: #F0F0FF; }
  code {
    font-family: 'Courier New', monospace;
    font-size: 8.5pt;
    background: #F3F4F6;
    padding: 1px 4px;
    border-radius: 3px;
  }

  /* ---- REQUIREMENTS ---- */
  .req-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
  .req-cat { margin-bottom: 20px; break-inside: avoid; }
  .req-cat-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10pt;
    font-weight: 700;
    color: #3D4852;
    margin-bottom: 8px;
    padding: 5px 10px;
    background: #F3F4F6;
    border-radius: 6px;
    border-left: 3px solid #6C63FF;
  }
  .req-cat-title.done { border-left-color: #38B2AC; color: #38B2AC; }
  .req-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 8px;
    font-size: 8.5pt;
    border-radius: 4px;
    color: #6B7280;
    margin-bottom: 2px;
  }
  .req-row.done { color: #2d3748; }
  .chk { font-size: 9pt; flex-shrink: 0; margin-top: 1px; font-weight: 700; }
  .chk.yes  { color: #38B2AC; }
  .chk.no   { color: #E05252; }
  .chk.opt  { color: #9CA3AF; }
  .req-label { font-weight: 500; line-height: 1.3; }
  .req-detail { font-size: 7.5pt; color: #38B2AC; margin-top: 1px; }
  .req-row:not(.done) .req-detail { color: #9CA3AF; font-style: italic; }
  .req-selected { font-size: 8pt; color: #6C63FF; font-weight: 600; margin: 4px 8px 6px; }
  .req-option-group { margin: 4px 0 8px 8px; }
  .req-option-label { font-size: 8pt; font-weight: 700; color: #6B7280; margin-bottom: 3px; }

  /* ---- PRINT RULES ---- */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section { padding: 20px 32px; }
    .section.page-break { page-break-before: always; }
    .doc-header { padding: 24px 32px 20px; }
    .no-print { display: none !important; }
  }

  /* ---- Print button (screen only) ---- */
  .print-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #3D4852;
    padding: 10px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .print-bar p { color: #E5E7EB; font-size: 9pt; margin: 0; }
  .print-btn {
    background: #6C63FF;
    color: white;
    border: none;
    padding: 9px 22px;
    border-radius: 10px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700;
    font-size: 10pt;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .print-btn:hover { background: #8B84FF; }
  @media print { .print-bar { display: none; } }
</style>
</head>
<body>

<div class="print-bar no-print">
  <p>📄 Your course selection report — click Print to save as PDF</p>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>

<div class="doc-header">
  <div class="doc-header-left">
    <h1>${title}</h1>
    <div class="program">${programLabel}</div>
  </div>
  <div class="doc-header-right">
    <div>${genBy}</div>
    <div>Sciences Po Reims — 202610</div>
    <div class="made-by">${madeBy}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">${calTitle}</div>
  ${calHTML}
</div>

<div class="section page-break">
  <div class="section-title">
    ${listTitle}
    <span class="count">${addedCourses.length} ${lang === 'fr' ? 'cours' : 'courses'}</span>
  </div>
  <table>
    <colgroup>
      <col class="col-title"><col class="col-disc"><col class="col-type">
      <col class="col-up"><col class="col-code"><col class="col-sched">
      <col class="col-t1"><col class="col-t2">
    </colgroup>
    ${tableHTML.replace(/^<table>|<\/table>$/g, '')}
  </table>
</div>

${reqHTML ? `
<div class="section page-break">
  <div class="section-title">${reqTitle}</div>
  <div class="req-columns">${reqHTML}</div>
</div>` : ''}

</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups for this site to export the report.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
