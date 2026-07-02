import { useState } from 'react';

const THIRD_LANGUAGES = ['German', 'Spanish', 'Italian', 'Portuguese', 'Arabic', 'Swahili', 'Latin'];

// Per-program target levels
const LANG_RULES = {
  '1A_NA':         { englishTarget: 'C1', frenchTarget: 'B2' },
  '2A_NA':         { englishTarget: 'C1', frenchTarget: 'B2' },
  '2A_AFRICA_EN':  { englishTarget: 'C1', frenchTarget: 'B2' },
  '1A_AFRICA_EN':  { englishTarget: 'C1', frenchTarget: 'B2' },
  '1A_AFRICA_FR':  { englishTarget: 'C2', frenchTarget: null },
  '2A_AFRICA_FR':  { englishTarget: 'C2', frenchTarget: null },
};

export default function LanguageStep({ programKey, onContinue, onBack }) {
  const rules = LANG_RULES[programKey] || { englishTarget: 'C1', frenchTarget: 'B2' };

  // Current levels the student is at already
  const [frenchLevel, setFrenchLevel]   = useState('');   // '', 'below-B1', 'B1', 'B2+'
  const [englishLevel, setEnglishLevel] = useState('');   // '', 'below-B2', 'B2', 'C1', 'C2'
  const [secondaryOverride, setSecondaryOverride] = useState(false);
  const [thirdLanguage, setThirdLanguage] = useState('');

  // Third language is unlocked when: at B1 in French AND B2 in English (or override)
  const frenchOk  = frenchLevel === 'B1' || frenchLevel === 'B2+';
  const englishOk = englishLevel === 'B2' || englishLevel === 'C1' || englishLevel === 'C2';
  const thirdUnlocked = (frenchOk && englishOk) || secondaryOverride;

  // Whether each language course browser should be shown
  // French: shown if frenchTarget exists AND student hasn't reached it yet
  const needsFrench  = rules.frenchTarget !== null && frenchLevel !== 'B2+';
  // English: shown if student hasn't reached the target level yet
  const needsEnglish = englishLevel !== rules.englishTarget && !(
    rules.englishTarget === 'C1' && englishLevel === 'C2'
  );

  const canContinue = frenchLevel !== '' && englishLevel !== '';

  function handleContinue() {
    onContinue({
      frenchLevel,
      englishLevel,
      needsFrench: rules.frenchTarget ? needsFrench : false,
      needsEnglish,
      englishTarget: rules.englishTarget,
      frenchTarget: rules.frenchTarget,
      thirdLanguageUnlocked: thirdUnlocked,
      thirdLanguage: thirdUnlocked ? thirdLanguage : null,
      secondaryOverride,
    });
  }

  const isFRtrack = programKey === '1A_AFRICA_FR' || programKey === '2A_AFRICA_FR';

  return (
    <div className="screen center-screen">
      <button className="link-back" onClick={onBack}>&larr; Back</button>
      <h1>Language Setup</h1>
      <p className="subtitle">
        {isFRtrack
          ? 'Africa Minor French Track: you must study English until level C2 is validated.'
          : 'English & North America tracks: study English to C1 and/or French to B2.'}
        {' '}Third languages require B1 French + B2 English first.
      </p>

      {/* French level — only shown for tracks where French is required */}
      {rules.frenchTarget && (
        <div className="lang-question">
          <p>
            <strong>French</strong> — what level are you currently at?
            {' '}<span className="hint inline">(Target: {rules.frenchTarget}. Once you reach B2 you no longer need to register for French.)</span>
          </p>
          <div className="option-row">
            {[
              { val: 'below-B1', label: 'Below B1' },
              { val: 'B1',       label: 'B1' },
              { val: 'B2+',      label: 'B2 or above (no French course needed)' },
            ].map(({ val, label }) => (
              <button
                key={val}
                className={frenchLevel === val ? 'toggle active' : 'toggle'}
                onClick={() => setFrenchLevel(val)}
              >
                {label}
              </button>
            ))}
          </div>
          {frenchLevel === 'below-B1' && (
            <p className="hint warn">
              ⚠ You cannot register in any language other than French and/or English until you reach B1 in French (48h/semester) — unless you're continuing a language begun in secondary school (see override below).
            </p>
          )}
        </div>
      )}

      {/* English level */}
      <div className="lang-question">
        <p>
          <strong>English</strong> — what level are you currently at?
          {' '}<span className="hint inline">(Target: {rules.englishTarget}.)</span>
        </p>
        <div className="option-row">
          {[
            { val: 'below-B2', label: 'Below B2' },
            { val: 'B2',       label: 'B2' },
            { val: 'C1',       label: 'C1' },
            { val: 'C2',       label: 'C2 (native/advanced)' },
          ].map(({ val, label }) => (
            <button
              key={val}
              className={englishLevel === val ? 'toggle active' : 'toggle'}
              onClick={() => setEnglishLevel(val)}
            >
              {label}
            </button>
          ))}
        </div>
        {englishLevel === 'below-B2' && (
          <p className="hint warn">
            ⚠ You cannot register in languages other than French/English until you reach B2 in English (48h/semester) — unless the secondary school override applies.
          </p>
        )}
      </div>

      {/* Secondary school override */}
      {(!frenchOk || !englishOk) && (
        <div className="lang-question">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={secondaryOverride}
              onChange={(e) => setSecondaryOverride(e.target.checked)}
            />
            <span>
              <strong>Secondary school override:</strong> I am continuing a foreign language begun during secondary education (generally B1–C1 level, never A1). This unlocks third-language courses even if B1 French / B2 English is not yet reached.
            </span>
          </label>
        </div>
      )}

      {/* Third language picker */}
      {thirdUnlocked && (
        <div className="lang-question">
          <p>
            <strong>Third language</strong> — pick one to unlock it in the course browser (optional).{' '}
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
      )}

      <button className="primary-btn" disabled={!canContinue} onClick={handleContinue}>
        Continue to course selection
      </button>
    </div>
  );
}
