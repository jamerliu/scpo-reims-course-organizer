import { useLang } from '../i18n/LangContext';
import { formatSchedule } from '../utils/schedule';

export default function AddedList({ addedCourses, onRemove }) {
  const { t } = useLang();
  return (
    <div className="added-list" id="list-export-target">
      <h3>{t('selectedCourses', { n: addedCourses.length })}</h3>
      {addedCourses.length === 0 && <p className="hint">{t('addHint')}</p>}
      <table>
        <thead>
          <tr>
            <th>{t('colTitle')}</th>
            <th>{t('colDiscipline')}</th>
            <th>{t('colUp')}</th>
            <th>{t('colCode')}</th>
            <th>{t('colSchedule')}</th>
            <th>{t('colEns1')}</th>
            <th>{t('colEns2')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {addedCourses.map((c) => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td>{c.discipline || c.majeure || '—'}</td>
              <td>{c.up}</td>
              <td>{c.codeMatiere}</td>
              <td>{formatSchedule(c)}</td>
              <td>{c.teacher1 || ''}</td>
              <td>{c.teacher2 || ''}</td>
              <td><button className="remove-link" onClick={() => onRemove(c.id)}>{t('remove')}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
