import { useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { MAJEURE_OPTIONS, MINEURE_OPTIONS } from '../data/requirements';

// Full display names with translations
const MAJEURE_LABELS = {
  'Majeure Economie et Sociétés': {
    en: 'Majeure Économie et Sociétés (Economics & Society)',
    fr: 'Majeure Économie et Sociétés',
  },
  'Majeure Humanités Politiques': {
    en: 'Majeure Humanités Politiques (Political Humanities)',
    fr: 'Majeure Humanités Politiques',
  },
  'Majeure Politique et Gouvernement': {
    en: 'Majeure Politique et Gouvernement (Politics & Government)',
    fr: 'Majeure Politique et Gouvernement',
  },
};

const MINEURE_LABELS = {
  'Thinking like a Lawyer / Comment pensent les juristes': {
    en: 'Thinking like a Lawyer',
    fr: 'Comment pensent les juristes ?',
  },
  'Trade & International Finance': {
    en: 'Trade & International Finance',
    fr: 'Commerce et finance internationale',
  },
  'Thinking IR Globally': {
    en: 'Thinking IR Globally',
    fr: 'Penser les relations internationales globalement',
  },
  'Global Socio. Debates': {
    en: 'Global Sociological Debates',
    fr: 'Débats sociologiques mondiaux',
  },
};

export default function MajeureMineurSelect({ programKey, onSelect, onBack, langToggle }) {
  const { lang } = useLang();
  const [majeure, setMajeure] = useState('');
  const [mineure, setMineure] = useState('');

  const majeureOptions = MAJEURE_OPTIONS[programKey] || [];
  const mineureOptions = MINEURE_OPTIONS[programKey] || [];

  const canContinue = majeure !== '' && mineure !== '';

  function labelFor(obj, key) {
    return obj[key]?.[lang] || obj[key]?.en || key;
  }

  return (
    <div className="screen center-screen">
      <div className="top-bar-floating">{langToggle}</div>
      <button className="link-back" onClick={onBack}>← {lang === 'fr' ? 'Retour' : 'Back'}</button>

      <h1>{lang === 'fr' ? 'Majeure et Mineure' : 'Majeure & Mineure'}</h1>
      <p className="subtitle">
        {lang === 'fr'
          ? 'Choisissez votre majeure et votre mineure. Les cours magistraux correspondants seront automatiquement ajoutés au calendrier.'
          : 'Choose your Majeure and Mineure. The corresponding mandatory lectures will be auto-added to your calendar.'}
      </p>

      <div className="grade-block">
        <h2>{lang === 'fr' ? 'Majeure' : 'Majeure'}</h2>
        <div className="option-col">
          {majeureOptions.map((opt) => (
            <button
              key={opt.label}
              className={majeure === opt.label ? 'option-card selected' : 'option-card'}
              onClick={() => setMajeure(opt.label)}
            >
              <span className="option-card-title">{labelFor(MAJEURE_LABELS, opt.label)}</span>
              <span className="option-card-items">
                {opt.items.filter((i) => i.autoAdd).map((i) => i.label).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grade-block">
        <h2>{lang === 'fr' ? 'Mineure / Tronc Commun' : 'Mineure / Tronc Commun'}</h2>
        <div className="option-col">
          {mineureOptions.map((opt) => (
            <button
              key={opt.label}
              className={mineure === opt.label ? 'option-card selected' : 'option-card'}
              onClick={() => setMineure(opt.label)}
            >
              <span className="option-card-title">{labelFor(MINEURE_LABELS, opt.label)}</span>
              <span className="option-card-items">
                {opt.items.filter((i) => i.autoAdd).map((i) => i.label).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        className="primary-btn"
        disabled={!canContinue}
        onClick={() => onSelect({ majeure, mineure })}
      >
        {lang === 'fr' ? 'Continuer vers la configuration des langues' : 'Continue to language setup'}
      </button>
    </div>
  );
}
