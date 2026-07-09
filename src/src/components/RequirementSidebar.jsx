import { useLang } from '../i18n/LangContext';
import { evaluateProfile, evaluateLanguages } from '../utils/requirementEngine';

function StatusDot({ fulfilled, optional }) {
  if (optional) return <span className="dot grey" />;
  return <span className={fulfilled ? 'dot green' : 'dot red'} />;
}

function ItemRow({ label, detail, fulfilled, optional, indent }) {
  return (
    <div className={`req-item${fulfilled ? ' fulfilled' : ''}${indent ? ' indented' : ''}`}>
      <StatusDot fulfilled={fulfilled} optional={optional} />
      <div className="req-item-text">
        <span className="req-item-label">{label}</span>
        {detail && <span className="req-item-detail">{detail}</span>}
      </div>
    </div>
  );
}

export default function RequirementSidebar({ profile, addedCourses, languageProfile }) {
  const { t } = useLang();
  const categories = evaluateProfile(profile, addedCourses);
  const languages  = evaluateLanguages(languageProfile, addedCourses, t);

  const totalCats = categories.length + (languages.length > 0 ? 1 : 0);
  const doneCats  = categories.filter((c) => c.fulfilled).length
    + (languages.every((l) => l.fulfilled || l.optional) ? 1 : 0);

  return (
    <div className="requirement-sidebar" id="requirements-export-target">
      <div className="req-header-bar">
        <h3>{t('requirements')}</h3>
        <span className="req-progress">{t('reqDone', { done: doneCats, total: totalCats })}</span>
      </div>
      <p className="req-program-label">{profile?.label}</p>
      {profile?.note && <p className="hint small">{profile.note}</p>}

      {languages.length > 0 && (
        <div className="req-category">
          <div className="req-section-head">
            <StatusDot fulfilled={languages.every((l) => l.fulfilled || l.optional)} />
            <strong>{t('langSection')}</strong>
            <span className="req-rule-hint">{t('minCredits')}</span>
          </div>
          {languages.map((l) => (
            <ItemRow key={l.id} label={l.label} detail={l.detail} fulfilled={l.fulfilled} optional={l.optional} indent />
          ))}
        </div>
      )}

      {categories.map((cat) => (
        <div className="req-category" key={cat.id}>
          <div className="req-section-head">
            <StatusDot fulfilled={cat.fulfilled} />
            <strong>{cat.label}</strong>
          </div>
          {cat.note && <p className="hint small">{cat.note}</p>}

          {cat.kind === 'mandatory' && cat.items.map((item, i) => {
            const detail = item.matchedCourse
              ? `✓ ${item.matchedCourse.title}${item.matchedCourse.teacher1 ? ' — ' + item.matchedCourse.teacher1 : ''}`
              : t('notYetAdded');
            return <ItemRow key={i} label={item.label} detail={detail} fulfilled={item.fulfilled} indent />;
          })}

          {cat.kind === 'choose-one-of' && (
            <>
              {cat.activeOption ? (
                <>
                  <ItemRow label={t('selectedOption', { label: cat.activeOption.label })} fulfilled={cat.fulfilled} indent />
                  {cat.activeOption.items.map((item, i) => {
                    const detail = item.matchedCourse
                      ? `✓ ${item.matchedCourse.title}${item.matchedCourse.teacher1 ? ' — ' + item.matchedCourse.teacher1 : ''}`
                      : t('notYetAdded');
                    return <ItemRow key={i} label={item.label} detail={detail} fulfilled={item.fulfilled} indent />;
                  })}
                  {cat.options.filter((o) => o.label !== cat.activeOption.label).length > 0 && (
                    <p className="req-other-options">
                      {t('otherOptions', { list: cat.options.filter((o) => o.label !== cat.activeOption.label).map((o) => o.label).join(', ') })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <ItemRow label={t('chooseOne')} fulfilled={false} indent />
                  {cat.options.map((opt, oi) => (
                    <div key={oi} className="req-option-block">
                      <div className="req-option-label">{opt.label}</div>
                      {opt.items.map((item, ii) => (
                        <ItemRow key={ii} label={item.label} fulfilled={false} indent />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
