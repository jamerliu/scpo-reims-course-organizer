import { useState } from 'react';
import { useLang } from '../i18n/LangContext';

const LANG_RULES = {
  '1A_NA':        { englishTarget: 'C1', frenchTarget: 'B2' },
  '2A_NA':        { englishTarget: 'C1', frenchTarget: 'B2' },
  '2A_AFRICA_EN': { englishTarget: 'C1', frenchTarget: 'B2' },
  '1A_AFRICA_EN': { englishTarget: 'C1', frenchTarget: 'B2' },
  '1A_AFRICA_FR': { englishTarget: 'C2', frenchTarget: null },
  '2A_AFRICA_FR': { englishTarget: 'C2', frenchTarget: null },
};

const FRENCH_LEVELS    = ['Below B1', 'B1', 'B2', 'C1', 'C2', 'Native / Fluent'];
const FRENCH_LEVELS_FR = ['En dessous du B1', 'B1', 'B2', 'C1', 'C2', 'Langue maternelle / Courant'];
const ENGLISH_LEVELS    = ['Below B2', 'B2', 'C1', 'C2', 'Native / Fluent'];
const ENGLISH_LEVELS_FR = ['En dessous du B2', 'B2', 'C1', 'C2', 'Langue maternelle / Courant'];

const NATIVE_VALUES = new Set(['Native / Fluent', 'Langue maternelle / Courant']);
const BELOW_B1_VALUES = new Set(['Below B1', 'En dessous du B1']);
const BELOW_B2_VALUES = new Set(['Below B2', 'En dessous du B2']);

export default function LanguageStep({ programKey, onContinue, onBack, langToggle }) {
  const { t, lang } = useLang();
  const rules = LANG_RULES[programKey] || { englishTarget: 'C1', frenchTarget: 'B2' };

  const [frenchLevel,  setFrenchLevel]  = useState('');
  const [englishLevel, setEnglishLevel] = useState('');

  const frenchValues  = lang === 'fr' ? FRENCH_LEVELS_FR  : FRENCH_LEVELS;
  const englishValues = lang === 'fr' ? ENGLISH_LEVELS_FR : ENGLISH_LEVELS;

  const frenchNative  = NATIVE_VALUES.has(frenchLevel);
  const englishNative = NATIVE_VALUES.has(englishLevel);
  const frenchAtB1Plus  = frenchLevel !== '' && !BELOW_B1_VALUES.has(frenchLevel);
  const englishAtB2Plus = englishLevel !== '' && !BELOW_B2_VALUES.has(englishLevel);
  const thirdUnlocked   = frenchAtB1Plus && englishAtB2Plus;

  const showFrench  = rules.frenchTarget !== null;
  const canContinue = englishLevel !== '' && (!showFrench || frenchLevel !== '');

  const needsFrench  = showFrench && !frenchNative;
  const needsEnglish = !englishNative;

  const subtitle = showFrench
    ? t('langSetupSubEN', { englishTarget: rules.englishTarget, frenchTarget: rules.frenchTarget })
    : t('langSetupSubFR', { englishTarget: rules.englishTarget });

  function handleContinue() {
    onContinue({
      frenchLevel:  showFrench ? frenchLevel : 'N/A',
      englishLevel,
      englishTarget: rules.englishTarget,
      frenchTarget:  rules.frenchTarget,
      needsFrench,
      needsEnglish,
      frenchNative,
      englishNative,
      thirdLanguageUnlocked: thirdUnlocked,
      thirdLanguage: null,
    });
  }

  return (
    <div className="screen center-screen">
      <div className="top-bar-floating">{langToggle}</div>
      <button className="link-back" onClick={onBack}>{t('back')}</button>
      <h1>{t('langSetupTitle')}</h1>
      <p className="subtitle">{subtitle}</p>

      {showFrench && (
        <div className="lang-question">
          <p>
            <strong>{t('frenchLevelQ')}</strong>
            {' '}<span className="hint inline">({t('target', { level: rules.frenchTarget })})</span>
          </p>
          <div className="option-row">
            {frenchValues.map((val) => (
              <button key={val} className={frenchLevel === val ? 'toggle active' : 'toggle'} onClick={() => setFrenchLevel(val)}>
                {val}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="lang-question">
        <p>
          <strong>{t('englishLevelQ')}</strong>
          {' '}<span className="hint inline">({t('target', { level: rules.englishTarget })})</span>
        </p>
        <div className="option-row">
          {englishValues.map((val) => (
            <button key={val} className={englishLevel === val ? 'toggle active' : 'toggle'} onClick={() => setEnglishLevel(val)}>
              {val}
            </button>
          ))}
        </div>
      </div>

      {canContinue && (
        <div className={`lang-eligibility ${thirdUnlocked ? 'eligible' : 'ineligible'}`}>
          {thirdUnlocked
            ? <p>✓ {lang === 'fr'
                ? "Vous êtes éligible à une troisième langue. Vous pourrez en ajouter une depuis l'onglet Langues dans le planificateur."
                : "You are eligible for a third language. You can add one from the Languages tab in the planner."}</p>
            : <p>{lang === 'fr'
                ? "Une troisième langue nécessite B1 en français et B2 en anglais (48h/semestre chacun). Les cours de troisième langue ne seront pas disponibles."
                : "A third language requires B1 in French and B2 in English (both 48h/semester). Third-language courses will not be available in the planner."}</p>
          }
        </div>
      )}

      <button className="primary-btn" disabled={!canContinue} onClick={handleContinue}>
        {t('continueToCourses')}
      </button>
    </div>
  );
}
