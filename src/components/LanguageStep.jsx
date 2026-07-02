import { useState } from 'react';
import { useLang } from '../i18n/LangContext';

const THIRD_LANGUAGES = ['German', 'Spanish', 'Italian', 'Portuguese', 'Arabic', 'Swahili', 'Latin'];

const LANG_RULES = {
  '1A_NA':        { englishTarget: 'C1', frenchTarget: 'B2' },
  '2A_NA':        { englishTarget: 'C1', frenchTarget: 'B2' },
  '2A_AFRICA_EN': { englishTarget: 'C1', frenchTarget: 'B2' },
  '1A_AFRICA_EN': { englishTarget: 'C1', frenchTarget: 'B2' },
  '1A_AFRICA_FR': { englishTarget: 'C2', frenchTarget: null },
  '2A_AFRICA_FR': { englishTarget: 'C2', frenchTarget: null },
};

const FRENCH_LEVELS  = ['Below B1', 'B1', 'B2', 'C1', 'C2'];
const FRENCH_LEVELS_FR = ['En dessous du B1', 'B1', 'B2', 'C1', 'C2'];
const ENGLISH_LEVELS = ['Below B2', 'B2', 'C1', 'C2'];
const ENGLISH_LEVELS_FR = ['En dessous du B2', 'B2', 'C1', 'C2'];

export default function LanguageStep({ programKey, onContinue, onBack, langToggle }) {
  const { t, lang } = useLang();
  const rules = LANG_RULES[programKey] || { englishTarget: 'C1', frenchTarget: 'B2' };

  const [frenchLevel,   setFrenchLevel]   = useState('');
  const [englishLevel,  setEnglishLevel]  = useState('');
  const [thirdLanguage, setThirdLanguage] = useState('');

  const nativeFluent = lang === 'fr' ? 'Langue maternelle / Courant' : 'Native / Fluent';

  const frenchValues  = [...(lang === 'fr' ? FRENCH_LEVELS_FR  : FRENCH_LEVELS),  nativeFluent];
  const englishValues = [...(lang === 'fr' ? ENGLISH_LEVELS_FR : ENGLISH_LEVELS), nativeFluent];

  const frenchAtB1Plus  = frenchLevel  !== '' && frenchLevel  !== 'Below B1' && frenchLevel !== 'En dessous du B1';
  const englishAtB2Plus = englishLevel !== '' && englishLevel !== 'Below B2' && englishLevel !== 'En dessous du B2';
  const thirdUnlocked   = frenchAtB1Plus && englishAtB2Plus;

  const showFrench  = rules.frenchTarget !== null;
  const canContinue = englishLevel !== '' && (!showFrench || frenchLevel !== '');

  const subtitle = showFrench
    ? t('langSetupSubEN', { englishTarget: rules.englishTarget, frenchTarget: rules.frenchTarget })
    : t('langSetupSubFR', { englishTarget: rules.englishTarget });

  function handleContinue() {
    onContinue({
      frenchLevel:  showFrench ? frenchLevel : 'N/A',
      englishLevel,
      englishTarget: rules.englishTarget,
      frenchTarget:  rules.frenchTarget,
      needsFrench:   showFrench,
      needsEnglish:  true,
      thirdLanguageUnlocked: thirdUnlocked,
      thirdLanguage: thirdUnlocked ? thirdLanguage : null,
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
              <button
                key={val}
                className={frenchLevel === val ? 'toggle active' : 'toggle'}
                onClick={() => setFrenchLevel(val)}
              >
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
            <button
              key={val}
              className={englishLevel === val ? 'toggle active' : 'toggle'}
              onClick={() => setEnglishLevel(val)}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {thirdUnlocked ? (
        <div className="lang-question">
          <p><strong>{t('thirdLangTitle')}</strong> — {t('thirdLangAvailable')}</p>
          <div className="option-row">
            {THIRD_LANGUAGES.map((l) => (
              <button
                key={l}
                className={thirdLanguage === l ? 'toggle active' : 'toggle'}
                onClick={() => setThirdLanguage(l === thirdLanguage ? '' : l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      ) : (canContinue && (
        <p className="hint warn">{t('thirdLangLocked')}</p>
      ))}

      <button className="primary-btn" disabled={!canContinue} onClick={handleContinue}>
        {t('continueToCourses')}
      </button>
    </div>
  );
}
