// Requirement rules, derived from Course_Requirements_2026-2027_Corrected.docx
// cross-checked against the 202610 schedule.
//
// Matching a course to a requirement "item" is done via matchers evaluated
// against a course object from data/courses.json. A category is "fulfilled"
// when every one of its items has at least one matching course present on
// the user's calendar.
//
// kind: 'mandatory'      -> every item in `items` must be satisfied
// kind: 'choose-one-of'  -> satisfying ALL items inside ANY one `options[i]` satisfies the category

const byCode = (...codes) => (c) => codes.includes(c.codeMatiere);
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const lecture = (c) => /lecture|cours magistral/i.test(norm(c.type));
const conference = (c) =>
  /conf[ée]rence de m[ée]thode|quadruplette|conf[ée]rences? de lecture/i.test(norm(c.type));
const atelier = (c) => /atelier/i.test(norm(c.type)) || /atelier/i.test(norm(c.discipline));

function withCode(codes, extra) {
  const codeMatch = byCode(...codes);
  return (c) => codeMatch(c) && (!extra || extra(c));
}

// ---------- 1A - North America ----------
const req_1A_NA = {
  key: '1A_NA',
  label: '1A — North America Minor',
  quadrupletteLinked: true, // Law/PoliSci/History/PolTheory quadruplette numbers should match
  categories: [
    {
      id: 'law', label: 'Constitutional Law & Political Institutions', kind: 'mandatory',
      items: [
        { label: 'Lecture', autoAdd: true, match: withCode(['ADRO 17A00'], lecture) },
        { label: 'Quadruplette conference', match: withCode(['ADRO 17A00'], conference) },
      ],
    },
    {
      id: 'polsci', label: 'Political Science', kind: 'mandatory',
      items: [
        { label: 'Lecture', autoAdd: true, match: withCode(['ASPO 17A00'], lecture) },
        { label: 'Quadruplette conference', match: withCode(['ASPO 17A00'], conference) },
      ],
    },
    {
      id: 'history', label: 'History', kind: 'mandatory',
      items: [
        { label: 'Lecture', autoAdd: true, match: withCode(['AHIS 17A00'], lecture) },
        { label: 'Quadruplette conference', match: withCode(['AHIS 17A00'], conference) },
      ],
    },
    {
      id: 'poltheory', label: 'Political Theory (Classical Texts)', kind: 'mandatory', note: 'Campus Minor lecture confirmed on schedule [CORRECTED]',
      items: [
        { label: 'Lecture (CAMPUS MINOR)', autoAdd: true, match: withCode(['AHUM 17A00'], lecture) },
        { label: 'Quadruplette conference', match: withCode(['BHUM 17A00'], conference) },
      ],
    },
    {
      id: 'math', label: 'Mathematics (choose one level)', kind: 'choose-one-of',
      options: [
        { label: 'Introductory', items: [{ label: 'Introductory Math', match: withCode(['BMAT 17A01']) }] },
        { label: 'Intermediate', items: [{ label: 'Intermediate Math', match: withCode(['BMAT 17A02']) }] },
        { label: 'Advanced', items: [{ label: 'Advanced Math', match: withCode(['BMAT 17A03']) }] },
      ],
    },
    {
      id: 'academic-writing', label: 'Academic Writing', kind: 'mandatory',
      items: [{ label: 'Discussion session', match: withCode(['BMET 17A00']) }],
    },
  ],
};

// ---------- 1A - Africa Minor, English Track ----------
const req_1A_AFRICA_EN = {
  key: '1A_AFRICA_EN',
  label: '1A — Africa Minor, English Track',
  quadrupletteLinked: false,
  categories: [
    {
      id: 'humanities', label: 'Africa & the World (Humanities)', kind: 'mandatory',
      items: [{ label: 'Lecture', autoAdd: true, match: withCode(['AHUM 17A01'], lecture) }],
    },
    {
      id: 'law', label: 'Constitutional Law & Political Institutions', kind: 'mandatory',
      note: 'Two lecture components required [CORRECTED]',
      items: [
        { label: 'Constitutional Law Lecture (shared, 24h)', autoAdd: true, match: withCode(['ADRO 17A00'], lecture) },
        { label: 'Political Institutions Africa Lecture (12h)', autoAdd: true, match: withCode(['ADRO 17A05'], lecture) },
        { label: 'Conférence de méthode', match: withCode(['ADRO 17A00', 'ADRO 17A05'], conference) },
      ],
    },
    {
      id: 'polsci', label: 'Political Science (Africa Minor)', kind: 'mandatory',
      items: [
        { label: 'Lecture', autoAdd: true, match: withCode(['ASPO 17A05'], lecture) },
        { label: 'Conférence de méthode', match: withCode(['ASPO 17A05'], conference) },
      ],
    },
    {
      id: 'history', label: 'History (The Long 19th Century)', kind: 'mandatory',
      items: [
        { label: 'Lecture (shared w/ North America)', autoAdd: true, match: withCode(['AHIS 17A00'], lecture) },
        { label: 'Conférence de méthode', match: withCode(['AHIS 17A00'], conference) },
      ],
    },
    {
      id: 'math', label: 'Mathematics (choose one level)', kind: 'choose-one-of',
      options: [
        { label: 'Introductory', items: [{ label: 'Introductory Math', match: withCode(['BMAT 17A04']) }] },
        { label: 'Intermediate / Advanced', items: [{ label: 'Intermediate/Advanced Math', match: withCode(['BMAT 17A05']) }] },
      ],
    },
    {
      id: 'poltheory', label: 'Political Theory (Text & Political Thought Africa)', kind: 'mandatory',
      items: [{ label: 'Conférence de lecture', match: withCode(['BHUM 17A44']) }],
    },
    {
      id: 'academic-writing', label: 'Academic Writing (Africa groups)', kind: 'mandatory',
      items: [{ label: 'Conférence de méthode', match: withCode(['BMET 17A02']) }],
    },
  ],
};

// ---------- 1A - Africa Minor, French Track (METIS) ----------
const req_1A_AFRICA_FR = {
  key: '1A_AFRICA_FR',
  label: '1A — Africa Minor, French Track (METIS)',
  quadrupletteLinked: false,
  categories: [
    {
      id: 'humanites', label: 'Grands cours spé zone Afrique', kind: 'mandatory',
      note: 'Missing from original notes; confirmed required [CORRECTED]',
      items: [{ label: 'Lecture', autoAdd: true, match: withCode(['AHUM 17F03'], lecture) }],
    },
    {
      id: 'droit', label: 'Institutions Politiques et Droit Constitutionnel', kind: 'mandatory',
      items: [
        { label: 'Lecture', autoAdd: true, match: withCode(['ADRO 17F00'], lecture) },
        { label: 'Conférence de méthode', match: withCode(['ADRO 17F00'], conference) },
      ],
    },
    {
      id: 'sciencepo', label: 'Science Politique', kind: 'mandatory',
      items: [
        { label: 'Lecture', autoAdd: true, match: withCode(['ASPO 17F00'], lecture) },
        { label: 'Conférence de méthode', match: withCode(['ASPO 17F00'], conference) },
      ],
    },
    {
      id: 'histoire', label: 'Histoire du XIXè siècle', kind: 'mandatory',
      items: [
        { label: 'Lecture', autoAdd: true, match: withCode(['AHIS 17F00'], lecture) },
        { label: 'Conférence de méthode', match: withCode(['AHIS 17F00'], conference) },
      ],
    },
    {
      id: 'theorie', label: 'Théorie politique Afr', kind: 'mandatory',
      items: [{ label: 'Conférence de lecture', match: withCode(['BHUM 17F19']) }],
    },
    {
      id: 'math', label: 'Mathématiques (choisir un niveau)', kind: 'choose-one-of',
      options: [
        { label: 'Introductif', items: [{ label: 'Introductif', match: withCode(['BMAT 17F01']) }] },
        { label: 'Intermédiaire', items: [{ label: 'Intermédiaire', match: withCode(['BMAT 17F02']) }] },
        { label: 'Avancé', items: [{ label: 'Avancé', match: withCode(['BMAT 17F03']) }] },
      ],
    },
    {
      id: 'ecriture', label: 'Écriture académique Afr', kind: 'mandatory',
      items: [{ label: 'Conférence de lecture', match: withCode(['BMET 17F00']) }],
    },
  ],
};

// ---------- 2A shared building blocks (North America track codes) ----------
const majeureOptionsNA = [
  {
    label: 'Majeure Economie et Sociétés',
    items: [
      { label: 'Microeconomics Lecture', autoAdd: true, match: withCode(['AECO 27A10'], lecture) },
      { label: 'Microeconomics CdM', match: withCode(['AECO 27A10'], conference) },
      { label: 'Inquiries in Sociology Lecture', autoAdd: true, match: withCode(['ASOC 27A14'], lecture) },
      { label: 'Inquiries in Sociology CdM', match: withCode(['ASOC 27A14'], conference) },
      { label: 'Atelier Méthodologie (choose one)', match: withCode(['BMET 27A40','BMET 27A71','BMET 27A39','BMET 27F54','BMET 27A81','BMET 27A22']) },
    ],
  },
  {
    label: 'Majeure Humanités Politiques',
    items: [
      { label: 'The ABCs of Politics Lecture', autoAdd: true, match: withCode(['AHUM 27A10'], lecture) },
      { label: 'The ABCs of Politics CdM', match: withCode(['AHUM 27A10'], conference) },
      { label: 'Narrat., Uses & Rep. of the Past Lecture', autoAdd: true, match: withCode(['AHIS 27A10'], lecture) },
      { label: 'Narrat., Uses & Rep. of the Past CdM', match: withCode(['AHIS 27A10'], conference) },
      { label: 'Atelier Méthodologie (choose one)', match: withCode(['BMET 27A23','BMET 27A41','BMET 27A61','BMET 27A37','BMET 27A35']) },
    ],
  },
  {
    label: 'Majeure Politique et Gouvernement',
    items: [
      { label: 'Constitutional Law Lecture', autoAdd: true, match: withCode(['ADRO 27A10'], lecture) },
      { label: 'Constitutional Law CdM', match: withCode(['ADRO 27A10'], conference) },
      { label: 'Comparative Politics Lecture', autoAdd: true, match: withCode(['ASPO 27A10'], lecture) },
      { label: 'Comparative Politics CdM', match: withCode(['ASPO 27A10'], conference) },
      { label: 'Atelier Méthodologie (choose one)', match: withCode(['BMET 27A38','BMET 27A83','BMET 27F38','BMET 27A04','BMET 27F23','BMET 27A03','BMET 27A24']) },
    ],
  },
];

const majeureOptionsAfricaFR = [
  majeureOptionsNA[0], // Economie et Sociétés is shared verbatim
  {
    label: 'Majeure Humanités Politiques',
    items: [
      { label: 'Abécédaire politique Lecture', autoAdd: true, match: withCode(['AHUM 27F10'], lecture) },
      { label: 'Abécédaire politique CdM', match: withCode(['AHUM 27F10'], conference) },
      { label: 'Récits, représentations et usages du passé Lecture', autoAdd: true, match: withCode(['AHIS 27F10'], lecture) },
      { label: 'Récits, représentations et usages du passé CdM', match: withCode(['AHIS 27F10'], conference) },
      { label: 'Atelier Méthodologie (choose one)', match: withCode(['BMET 27F06','BMET 27F49']) },
    ],
  },
  {
    label: 'Majeure Politique et Gouvernement',
    note: 'Droit constitutionnel + Politique comparée are the core Lecture+CdM pair [CORRECTED]',
    items: [
      { label: 'Droit constitutionnel Lecture', autoAdd: true, match: withCode(['ADRO 27F10'], lecture) },
      { label: 'Droit constitutionnel CdM', match: withCode(['ADRO 27F10'], conference) },
      { label: 'Politique comparée Lecture', autoAdd: true, match: withCode(['ASPO 27F10'], lecture) },
      { label: 'Politique comparée CdM', match: withCode(['ASPO 27F10'], conference) },
      { label: 'Atelier Méthodologie (choose one)', match: withCode(['BMET 27F42','BMET 27F45','BMET 27F48']) },
    ],
  },
];

function mineureOptions(mineureDroitCode) {
  return [
    { label: 'Thinking like a Lawyer / Comment pensent les juristes', items: [
      { label: 'Lecture', autoAdd: true, match: withCode([mineureDroitCode], lecture) },
      { label: 'CdM', match: withCode([mineureDroitCode], conference) },
    ]},
    { label: 'Trade & International Finance', items: [
      { label: 'Lecture', autoAdd: true, match: withCode(['AECO 27A00'], lecture) },
      { label: 'CdM', match: withCode(['AECO 27A00'], conference) },
    ]},
    { label: 'Thinking IR Globally', items: [
      { label: 'Lecture', autoAdd: true, match: withCode(['ASPO 27A00'], lecture) },
      { label: 'CdM', match: withCode(['ASPO 27A00'], conference) },
    ]},
    { label: 'Global Socio. Debates', items: [
      { label: 'Lecture', autoAdd: true, match: withCode(['ASOC 27A01'], lecture) },
      { label: 'CdM', match: withCode(['ASOC 27A01'], conference) },
    ]},
  ];
}

function commonTroncCommunCategories(bexpCode, capstoneCodes) {
  return [
    {
      id: 'digital-culture', label: 'Culture et Enjeux du Numérique (Digital Culture)', kind: 'mandatory',
      note: 'Offered in English & French; confirm mandatory status [CORRECTED]',
      items: [{ label: 'Group (EN or FR)', match: withCode([bexpCode]) }],
    },
    {
      id: 'capstone', label: 'Capstone Project / Grand Écrit', kind: 'mandatory',
      note: 'Not in original notes; appears required on schedule [CORRECTED]',
      items: [{ label: 'Group', match: withCode(capstoneCodes) }],
    },
    {
      id: 'seminar', label: '2A Seminar (choose one elective)', kind: 'mandatory',
      items: [{ label: 'Seminar', match: (c) => c.group === '2A_SEMINAIRE' }],
    },
  ];
}

const req_2A_NA = {
  key: '2A_NA',
  label: '2A — North America Minor (incl. Africa English Track & PE)',
  quadrupletteLinked: false,
  categories: [
    { id: 'majeure', label: 'Majeure (choose one)', kind: 'choose-one-of', options: majeureOptionsNA },
    { id: 'mineure', label: 'Mineure / Tronc Commun (choose one)', kind: 'choose-one-of', options: mineureOptions('ADRO 27A00') },
    ...commonTroncCommunCategories('BEXP 27F00', ['ECEF 27A00', 'ECEF 27F00']),
  ],
};

const req_2A_AFRICA_FR = {
  key: '2A_AFRICA_FR',
  label: '2A — Africa Minor, French Track (Métis)',
  quadrupletteLinked: false,
  categories: [
    { id: 'majeure', label: 'Majeure (choose one)', kind: 'choose-one-of', options: majeureOptionsAfricaFR },
    { id: 'mineure', label: 'Mineure / Tronc Commun (choose one, French labels)', kind: 'choose-one-of', options: mineureOptions('ADRO 27F00') },
    ...commonTroncCommunCategories('BEXP 27F00', ['ECEF 27F00']),
  ],
};

const req_2A_AFRICA_EN = {
  key: '2A_AFRICA_EN',
  label: '2A — Africa Minor, English Track',
  quadrupletteLinked: false,
  note: 'Shares Majeure/Mineure structure with the North America 2A track.',
  categories: [
    { id: 'majeure', label: 'Majeure (choose one)', kind: 'choose-one-of', options: majeureOptionsNA },
    { id: 'mineure', label: 'Mineure / Tronc Commun (choose one)', kind: 'choose-one-of', options: mineureOptions('ADRO 27A00') },
    ...commonTroncCommunCategories('BEXP 27F00', ['ECEF 27A00', 'ECEF 27F00']),
  ],
};

export const REQUIREMENTS = {
  '1A_NA': req_1A_NA,
  '1A_AFRICA_EN': req_1A_AFRICA_EN,
  '1A_AFRICA_FR': req_1A_AFRICA_FR,
  '2A_NA': req_2A_NA,
  '2A_AFRICA_FR': req_2A_AFRICA_FR,
  '2A_AFRICA_EN': req_2A_AFRICA_EN,
};

// Language requirement is handled separately (see LanguageEligibility) since it
// depends on the student's current French/English levels, not just program/grade.
export const LANGUAGE_RULES = {
  note: 'Minimum 4 credits/semester (8/year) in languages. May not register in more than 2 foreign languages. Mandarin/Chinese is not offered on the current schedule. [CORRECTED]',
};
