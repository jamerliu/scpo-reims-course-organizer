import { formatSchedule } from '../utils/schedule';

export default function AddedList({ addedCourses, onRemove }) {
  return (
    <div className="added-list" id="list-export-target">
      <h3>Selected Courses ({addedCourses.length})</h3>
      {addedCourses.length === 0 && <p className="hint">Drag or click "+" on courses to add them here.</p>}
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Discipline</th>
            <th>UP</th>
            <th>Code matière</th>
            <th>Schedule</th>
            <th>Enseignant 1</th>
            <th>Enseignant 2</th>
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
              <td><button className="remove-link" onClick={() => onRemove(c.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
