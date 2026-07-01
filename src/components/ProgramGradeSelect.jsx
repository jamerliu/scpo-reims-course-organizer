import { GRADE_PROGRAMS } from '../data/programMap';

export default function ProgramGradeSelect({ onSelect }) {
  return (
    <div className="screen center-screen">
      <h1>Course Selection Planner</h1>
      <p className="subtitle">Sciences Po Reims — 202610 Schedule</p>

      {Object.entries(GRADE_PROGRAMS).map(([grade, programs]) => (
        <div className="grade-block" key={grade}>
          <h2>{grade}</h2>
          <div className="option-row">
            {programs.map((p) => (
              <button
                key={p.key}
                className="option-card"
                onClick={() => onSelect({ grade, programKey: p.key, programLabel: p.label })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
