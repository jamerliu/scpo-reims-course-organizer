import { evaluateProfile, evaluateLanguages } from '../utils/requirementEngine';

export default function RequirementSidebar({ profile, addedCourses, languageProfile }) {
  const categories = evaluateProfile(profile, addedCourses);
  const languages = evaluateLanguages(languageProfile, addedCourses);

  return (
    <div className="requirement-sidebar" id="requirements-export-target">
      <h3>Requirements — {profile?.label}</h3>
      {profile?.note && <p className="hint">{profile.note}</p>}

      {languages.length > 0 && (
        <div className="req-category">
          <div className="req-header">
            <span>Language</span>
          </div>
          {languages.map((l) => (
            <div key={l.id} className={l.fulfilled ? 'req-item fulfilled' : 'req-item'}>
              <span className={l.fulfilled ? 'dot green' : 'dot red'} />
              {l.label}
            </div>
          ))}
        </div>
      )}

      {categories.map((cat) => (
        <div className="req-category" key={cat.id}>
          <div className="req-header">
            <span className={cat.fulfilled ? 'dot green' : 'dot red'} />
            <strong>{cat.label}</strong>
          </div>
          {cat.note && <p className="hint small">{cat.note}</p>}

          {cat.kind === 'mandatory' && cat.items.map((item, i) => (
            <div key={i} className={item.fulfilled ? 'req-item fulfilled' : 'req-item'}>
              <span className={item.fulfilled ? 'dot green' : 'dot red'} />
              {item.label}
            </div>
          ))}

          {cat.kind === 'choose-one-of' && (
            <div className="req-options">
              {cat.activeOption ? (
                <div className="req-item fulfilled">
                  <span className="dot green" /> Selected: {cat.activeOption.label}
                </div>
              ) : (
                <div className="req-item">
                  <span className="dot red" /> Choose one: {cat.options.map((o) => o.label).join(' / ')}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
