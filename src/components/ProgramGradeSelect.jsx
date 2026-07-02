import { useLang } from '../i18n/LangContext';
import { GRADE_PROGRAMS } from '../data/programMap';

export default function ProgramGradeSelect({ onSelect, langToggle }) {
  const { t } = useLang();

  return (
    <div className="screen center-screen">
      <div className="top-bar-floating">{langToggle}</div>
      <h1>{t('selectTitle')}</h1>
      <p className="subtitle">{t('selectSubtitle')}</p>

      {Object.entries(GRADE_PROGRAMS).map(([grade, programs]) => (
        <div className="grade-block" key={grade}>
          <h2>{grade}</h2>
          <div className="option-row">
            {programs.map((p) => (
              <button
                key={p.key}
                className="option-card"
                onClick={() => onSelect({ grade, programKey: p.key, programLabel: t(`prog.${p.key}`) })}
              >
                {t(`prog.${p.key}`)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
