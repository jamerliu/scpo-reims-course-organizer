// parseIcal.js — Sciences Po iCal parser
// Matches events to courses.json by UP number (most precise),
// then course code + exact group number, then title.
// Excludes August orientation events.
// Returns both matched courseIds AND raw events for calendar display.

import coursesData from '../data/courses.json';

// ── Indexes ───────────────────────────────────────────────────────────────────

// by UP number (e.g. 12619) — most reliable Sciences Po identifier
const byUp = new Map();
// by code → array of courses (multiple groups share same code)
const byCode = new Map();
// by normalised title → array
const byTitle = new Map();

coursesData.forEach(c => {
  if (c.up != null) {
    byUp.set(String(Math.round(c.up)), c);
  }
  if (c.codeMatiere) {
    const key = c.codeMatiere.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key).push(c);
  }
  if (c.title) {
    const key = norm(c.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(c);
  }
});

function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── iCal line unfolding + parsing ─────────────────────────────────────────────

function unfold(text) {
  // iCal lines may be folded (continued with CRLF + whitespace)
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function parseIcalEvents(text) {
  const unfolded = unfold(text);
  const lines    = unfolded.split(/\r\n|\n|\r/);
  const events   = [];
  let cur        = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
    } else if (line === 'END:VEVENT' && cur) {
      events.push(cur);
      cur = null;
    } else if (cur) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      // Key may have parameters: DTSTART;TZID=Europe/Paris:20251001T...
      const rawKey = line.slice(0, colon);
      const key    = rawKey.split(';')[0].trim().toUpperCase();
      const val    = line.slice(colon + 1).trim();
      cur[key]     = val;
      // Preserve the full raw key for DTSTART timezone params
      if (key === 'DTSTART' || key === 'DTEND') cur[`_RAW_${key}`] = rawKey;
    }
  }
  return events;
}

// ── Date parsing ──────────────────────────────────────────────────────────────

function parseIcalDate(val) {
  if (!val) return null;
  // Full datetime: 20251001T120000 or 20251001T120000Z
  const m = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) {
    return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
  }
  // Date only: 20251001
  const d = val.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (d) return new Date(+d[1], +d[2]-1, +d[3]);
  return null;
}

function fmtTime(date) {
  if (!date) return '';
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

function fmtDate(date) {
  if (!date) return '';
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

// ── Course matching ───────────────────────────────────────────────────────────

function extractUp(text) {
  // UP numbers are 5-digit numbers like 12619, 13297
  // They often appear at the start of SUMMARY or in DESCRIPTION
  const m = text.match(/\b(1[0-9]{4})\b/g);
  return m || [];
}

function extractCode(text) {
  // Pattern: 4 letters, space, 5+ alphanums e.g. "BMAT 17A01"
  const m = text.match(/\b([A-Z]{2,5}\s+[0-9]{2}[A-Z][0-9]{2,3})\b/gi);
  return m ? m.map(s => s.trim().toUpperCase().replace(/\s+/g,' ')) : [];
}

function extractGroupNum(text) {
  // Match "Gr11", "Gr. 11", "Groupe 11", "Group 11" — require word boundary after
  // Use specific pattern to avoid Gr1 matching inside Gr11
  const m = text.match(/\bGr(?:oupe?\.?\s*)?(\d+)\b/i);
  return m ? m[1] : null;
}

function matchEvent(event) {
  const summary = (event['SUMMARY']     || '').replace(/\\n/g, ' ').replace(/\\,/g, ',');
  const desc    = (event['DESCRIPTION'] || '').replace(/\\n/g, ' ').replace(/\\,/g, ',');
  const loc     = (event['LOCATION']    || '');
  const all     = `${summary} ${desc} ${loc}`;

  // 1. Match by UP number — most precise
  const ups = extractUp(all);
  for (const up of ups) {
    const c = byUp.get(up);
    if (c) return c;
  }

  // 2. Match by code + exact group number
  const codes = extractCode(all);
  const grpNum = extractGroupNum(all);

  for (const code of codes) {
    const candidates = byCode.get(code);
    if (!candidates?.length) continue;

    if (candidates.length === 1) return candidates[0];

    if (grpNum) {
      // Exact match: title ends with "Gr11" not "Gr1" or "Gr111"
      // Use word-boundary regex to avoid Gr1 matching Gr11
      const exact = candidates.find(c => {
        const t = c.title || '';
        // Match "Gr11" as a whole word/at end of string
        return new RegExp(`\\bGr\\.?\\s*${grpNum}\\b`, 'i').test(t);
      });
      if (exact) return exact;
    }

    // No group match — don't fall back to first, return null to avoid wrong match
    // (better to show as unmatched than to show wrong group)
    return null;
  }

  // 3. Normalised title match — exact only, no substring (too error-prone)
  const normSum = norm(summary);
  if (normSum.length > 6) {
    const exact = byTitle.get(normSum);
    if (exact?.length === 1) return exact[0];
  }

  return null;
}

// ── August / orientation filter ───────────────────────────────────────────────

function isOrientationEvent(event, startDate) {
  if (!startDate) return false;
  // Exclude anything in August
  if (startDate.getMonth() === 7) return true; // August = month 7

  const summary = (event['SUMMARY'] || '').toLowerCase();
  // Exclude common orientation keywords
  const orientationKeywords = [
    'orientation', 'accueil', 'welcome', 'rentrée', 'rentree',
    'integration', 'intégration', 'student life', 'info session',
    'séance d\'information', 'seance d\'information'
  ];
  return orientationKeywords.some(k => summary.includes(k));
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function importFromIcalUrl(url) {
  const proxyUrl = `/api/fetch-ical?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Failed to fetch calendar (${res.status})`);
  }

  const text = await res.text();

  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('URL does not appear to be a valid Sciences Po calendar link. Make sure you copied the full URL from Sciences Po scolarité.');
  }

  const rawEvents = parseIcalEvents(text);

  // Build rich event objects for the calendar view
  const calendarEvents = [];
  const matched  = new Map(); // courseId → course
  const unmatched = [];

  for (const event of rawEvents) {
    const startDate = parseIcalDate(event['DTSTART']);
    const endDate   = parseIcalDate(event['DTEND']);

    // Filter out August / orientation
    if (isOrientationEvent(event, startDate)) continue;

    const summary = (event['SUMMARY'] || '').replace(/\\n/g,' ').replace(/\\,/g,',').trim();
    const loc     = (event['LOCATION']|| '').replace(/\\,/g,',').trim();

    const richEvent = {
      summary,
      location: loc,
      startDate,
      endDate,
      startStr: fmtDate(startDate),
      timeStr:  startDate && endDate ? `${fmtTime(startDate)}–${fmtTime(endDate)}` : '',
      dayOfWeek: startDate ? startDate.getDay() : null, // 0=Sun,1=Mon...
    };
    calendarEvents.push(richEvent);

    // Match to course
    const course = matchEvent(event);
    if (course) {
      matched.set(course.id, course);
      richEvent.courseId    = course.id;
      richEvent.courseTitle = course.title;
    } else if (summary) {
      unmatched.push(summary);
      richEvent.courseId = null;
    }
  }

  return {
    courseIds:     [...matched.keys()],
    courses:       [...matched.values()],
    calendarEvents,                          // for the visual calendar
    unmatched:     [...new Set(unmatched)],
    totalEvents:   rawEvents.length,
    filtered:      rawEvents.length - calendarEvents.length,
  };
}
