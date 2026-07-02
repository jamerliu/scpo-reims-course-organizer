import { useState } from 'react';

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
const ENGLISH_LEVELS = ['Below B2', 'B2', 'C1', 'C2'];

export default function LanguageStep({ programKey, onContinue, onBack }) {
  const rules = LANG_RULES[programKey] || { englishTarget: 'C1', frenchTarget: 'B2' };

  const [frenchLevel,  setFrenchLevel]  = useState('');
  const [englishLevel, setEnglishLevel] = useState('');
  const [thirdLanguage, setThirdLanguage] = useState('');

  // Third language requires BOTH French ≥ B1 AND English ≥ B2
  const frenchAtB1Plus  = ['B1','B2','C1','C2'].includes(frenchLevel);
  const englishAtB2Plus = ['B2','C1','C2'].includes(englishLevel);
  const thirdUnlocked   = frenchAtB1Plus && englishAtB2Plus;

  // For FR track, French target is null so we skip the French question
  const showFrench = rules.frenchTarget !== null;

  const canContinue = englishLevel !== '' && (!showFrench || frenchLevel !== '');

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
      <button className="link-back" onClick={onBack}>&larr; Back</button>
      <h1>Language Setup</h1>
      <p className="subtitle">
        {rules.frenchTarget
          ? `Your track requires studying English to ${rules.englishTarget} and/or French to ${rules.frenchTarget}.`
          : `Your track requires studying English to ${rules.englishTarget}.`
        }{' '}
        You may not register in a third language until you are at B1 in French and B2 in English (both 48h/semester).
      </p>

      {showFrench && (
        <div className="lang-question">
          <p>
            <strong>French</strong> — what level are you currently at?
            {' '}<span className="hint inline">(Target: {rules.frenchTarget})</span>
          </p>
          <div className="option-row">
            {FRENCH_LEVELS.map((val) => (
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
          <strong>English</strong> — what level are you currently at?
          {' '}<span className="hint inline">(Target: {rules.englishTarget})</span>
        </p>
        <div className="option-row">
          {ENGLISH_LEVELS.map((val) => (
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
          <p>
            <strong>Third language</strong> — you meet the B1 French + B2 English requirement, so a third language is available.
            Pick one to unlock it in the course browser (optional).{' '}
            <span className="hint inline">Max 2 foreign languages total. Mandarin/Chinese not offered this year.</span>
          </p>
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
        <p className="hint warn">
          Third languages are not available until you reach B1 in French and B2 in English (both 48h/semester).
        </p>
      ))}

      <button className="primary-btn" disabled={!canContinue} onClick={handleContinue}>
        Continue to course selection
      </button>
    </div>
  );
}
