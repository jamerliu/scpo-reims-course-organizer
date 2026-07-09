// parseIcal.js
// Fetches a Sciences Po iCal URL via the Vercel proxy and matches
// events to course IDs in courses.json using code + title fuzzy matching.

import coursesData from '../data/courses.json';

const byCode = new Map();
const byTitle = new Map();

// Build lookup indexes
coursesData.forEach(c => {
  if (c.codeMatiere) {
    const key = c.codeMatiere.trim().toUpperCase();
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key).push(c);
  }
  if (c.title) {
    const key = normalise(c.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(c);
  }
});

function normalise(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse raw iCal text into event objects
function parseIcalEvents(text) {
  const events = [];
  const lines = text.replace(/\r\n[ \t]/g, '').split(/\r\n|\n|\r/);
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      events.push(current);
      current = null;
    } else if (current) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key   = line.slice(0, colon).split(';')[0].trim().toUpperCase();
      const value = line.slice(colon + 1).trim();
      current[key] = value;
    }
  }
  return events;
}

// Try to extract a course code from SUMMARY or DESCRIPTION
// Sciences Po format examples:
//   "BMAT 17A01 - Introductory Math Gr1"
//   "Constitutional Law [ADRO 27A10]"
function extractCode(text) {
  if (!text) return null;
  // Pattern: 4 letters, space, 5 alphanums
  const m = text.match(/\b([A-Z]{2,5}\s+[0-9]{2}[A-Z][0-9]{2,3})\b/i);
  return m ? m[1].trim().toUpperCase() : null;
}

// Match a single iCal event to a course in courses.json
function matchEvent(event) {
  const summary     = event['SUMMARY']     || '';
  const description = event['DESCRIPTION'] || '';
  const combined    = `${summary} ${description}`;

  // 1. Try to extract code from text
  const code = extractCode(combined);
  if (code) {
    const normalCode = code.replace(/\s+/g, ' ');
    const matches = byCode.get(normalCode);
    if (matches?.length === 1) return matches[0];
    if (matches?.length > 1) {
      // Multiple groups — try to narrow by group number in summary
      const grpMatch = summary.match(/Gr(?:oupe?\s*)?(\d+)/i);
      if (grpMatch) {
        const grpNum = grpMatch[1];
        const grp = matches.find(c =>
          c.title?.includes(`Gr${grpNum}`) ||
          c.title?.includes(`Gr. ${grpNum}`) ||
          String(c.up || '').includes(grpNum)
        );
        if (grp) return grp;
      }
      return matches[0]; // fallback: first group
    }
  }

  // 2. Fuzzy title match
  const normSummary = normalise(summary);
  if (normSummary.length > 4) {
    // Try exact normalised title match
    const exact = byTitle.get(normSummary);
    if (exact?.length) return exact[0];

    // Try substring match — find courses whose normalised title is contained
    for (const [key, courses] of byTitle) {
      if (normSummary.includes(key) || key.includes(normSummary)) {
        return courses[0];
      }
    }
  }

  return null;
}

// Main function — call this with a Sciences Po calendar URL
export async function importFromIcalUrl(url) {
  // Fetch via proxy
  const proxyUrl = `/api/fetch-ical?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Failed to fetch calendar (${res.status})`);
  }

  const text = await res.text();

  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('URL does not appear to be a valid Sciences Po calendar link.');
  }

  const events  = parseIcalEvents(text);
  const matched = new Map(); // courseId → course
  const unmatched = [];

  for (const event of events) {
    const course = matchEvent(event);
    if (course) {
      matched.set(course.id, course);
    } else {
      const summary = event['SUMMARY'] || '(unnamed event)';
      if (summary && !summary.startsWith('VEVENT')) {
        unmatched.push(summary);
      }
    }
  }

  return {
    courseIds:   [...matched.keys()],
    courses:     [...matched.values()],
    unmatched:   [...new Set(unmatched)], // deduplicated
    totalEvents: events.length,
  };
}
