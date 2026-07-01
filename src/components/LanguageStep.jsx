import { useState } from 'react';

const THIRD_LANGUAGES = ['German', 'Spanish', 'Italian', 'Portuguese', 'Arabic', 'Swahili', 'Latin'];

export default function LanguageStep({ onContinue, onBack }) {
  const [frenchFluent, setFrenchFluent] = useState(null);
  const [englishFluent, setEnglishFluent] = useState(null);
  const [thirdLanguage, setThirdLanguage] = useState('');

  const bothFluent = frenchFluent === true && englishFluent === true;
  const canContinue = frenchFluent !== null && englishFluent !== null;

  function handleContinue() {
    onContinue({
      frenchFluent,
      englishFluent,
      needsFrench: frenchFluent === false,
      needsEnglish: englishFluent === false,
      thirdLanguageUnlocked: bothFluent,
      thirdLanguage: bothFluent ? thirdLanguage : null,
    });
  }

  return (
    <div className="screen center-screen">
      <button className="link-back" onClick={onBack}>&larr; Back</button>
      <h1>Language Requirements</h1>
      <p className="subtitle">
        All tracks & years need language credits. Third languages are only unlocked once you're
        fluent in both French (B1+) and English (B2+).
      </p>

      <div className="lang-question">
        <p>Are you already fluent in <strong>French</strong> (B1 or higher)? You will not need to take a French language course.</p>
        <div className="option-row">
          <button className={frenchFluent === true ? 'toggle active' : 'toggle'} onClick={() => setFrenchFluent(true)}>Yes, fluent</button>
          <button className={frenchFluent === false ? 'toggle active' : 'toggle'} onClick={() => setFrenchFluent(false)}>No, need French courses</button>
        </div>
      </div>

      <div className="lang-question">
        <p>Are you already fluent in <strong>English</strong> (B2 or higher)? You will not need to take an English language course.</p>
        <div className="option-row">
          <button className={englishFluent === true ? 'toggle active' : 'toggle'} onClick={() => setEnglishFluent(true)}>Yes, fluent</button>
          <button className={englishFluent === false ? 'toggle active' : 'toggle'} onClick={() => setEnglishFluent(false)}>No, need English courses</button>
        </div>
      </div>

      {bothFluent && (
        <div className="lang-question">
          <p>You're eligible for a <strong>third language</strong>. Pick one to unlock it in the course browser (optional):</p>
          <div className="option-row">
            {THIRD_LANGUAGES.map((l) => (
              <button key={l} className={thirdLanguage === l ? 'toggle active' : 'toggle'} onClick={() => setThirdLanguage(l === thirdLanguage ? '' : l)}>
                {l}
              </button>
            ))}
          </div>
          <p className="hint">Note: Mandarin/Chinese is not offered on the current schedule. Max 2 foreign languages total.</p>
        </div>
      )}

      <button className="primary-btn" disabled={!canContinue} onClick={handleContinue}>
        Continue to course selection
      </button>
    </div>
  );
}
