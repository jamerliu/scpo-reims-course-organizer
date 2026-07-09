import { useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { parseSaveFile, validateSaveData } from '../utils/saveLoad';
import { Modal } from './Modal';
import coursesData from '../data/courses.json';
import { PROGRAM_COURSE_GROUPS } from '../data/programMap';

const byId = new Map(coursesData.map((c) => [c.id, c]));
const validProgramKeys = Object.keys(PROGRAM_COURSE_GROUPS);

const PROGRAM_LABELS = {
  '1A_NA':        '1A — North America Minor',
  '1A_AFRICA_EN': '1A — Africa Minor, English Track',
  '1A_AFRICA_FR': '1A — Africa Minor, French Track (METIS)',
  '2A_NA':        '2A — North America Minor',
  '2A_AFRICA_EN': '2A — Africa Minor, English Track',
  '2A_AFRICA_FR': '2A — Africa Minor, French Track (METIS)',
};

export default function LoadModal({ onClose, onRestore }) {
  const { lang } = useLang();
  const fileRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | validating | valid | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const s = (en, fr) => lang === 'fr' ? fr : en;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState('validating');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = parseSaveFile(ev.target.result);
      if (!raw) {
        setState('error');
        setErrorMsg(s('Could not parse file. Make sure it is a valid .json schedule file.', 'Impossible de lire le fichier. Assurez-vous qu\'il s\'agit d\'un fichier .json valide.'));
        return;
      }
      const validation = validateSaveData(raw, { validProgramKeys, coursesById: byId });
      if (!validation.ok) {
        setState('error');
        setErrorMsg(validation.detail);
        return;
      }
      setState('valid');
      setResult(validation);
    };
    reader.onerror = () => {
      setState('error');
      setErrorMsg(s('Failed to read file.', 'Échec de la lecture du fichier.'));
    };
    reader.readAsText(file);
  }

  function handleRestore() {
    onRestore(result);
    onClose();
  }

  const programLabel = result ? (PROGRAM_LABELS[result.program.programKey] || result.program.programKey) : '';
  const savedDate = result?.savedAt
    ? new Date(result.savedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Modal onClose={onClose}>
      <div className="load-modal">
        <h2>{s('Load Schedule', 'Charger un emploi du temps')}</h2>
        <p className="load-subtitle">
          {s(
            'Upload a previously saved .json schedule file to restore your course selection.',
            'Chargez un fichier .json sauvegardé pour restaurer votre sélection de cours.'
          )}
        </p>

        {/* File drop zone */}
        <div
          className={`drop-zone ${state === 'valid' ? 'drop-valid' : ''} ${state === 'error' ? 'drop-error' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              fileRef.current.files = e.dataTransfer.files;
              handleFile({ target: { files: e.dataTransfer.files } });
            }
          }}
        >
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFile} />
          {state === 'idle' && (
            <>
              <div className="drop-icon">📂</div>
              <div className="drop-text">{s('Click to choose file or drag & drop', 'Cliquez pour choisir ou glissez-déposez')}</div>
              <div className="drop-hint">.json {s('schedule files only', 'fichiers de cours uniquement')}</div>
            </>
          )}
          {state === 'validating' && <div className="drop-text">{s('Checking file…', 'Vérification du fichier…')}</div>}
          {state === 'error' && (
            <>
              <div className="drop-icon">⚠️</div>
              <div className="drop-text drop-err-text">{errorMsg}</div>
              <div className="drop-hint">{s('Click to try a different file', 'Cliquez pour essayer un autre fichier')}</div>
            </>
          )}
          {state === 'valid' && (
            <>
              <div className="drop-icon">✅</div>
              <div className="drop-text">{s('File looks good', 'Fichier valide')}</div>
              <div className="drop-hint">{s('Click to choose a different file', 'Cliquez pour choisir un autre fichier')}</div>
            </>
          )}
        </div>

        {/* Validation result */}
        {state === 'valid' && result && (
          <div className="load-result">
            <div className="load-summary">
              <div className="load-summary-row">
                <span className="load-label">{s('Program', 'Programme')}</span>
                <span className="load-value">{programLabel}</span>
              </div>
              {result.majeureMineure && (
                <>
                  <div className="load-summary-row">
                    <span className="load-label">{s('Majeure', 'Majeure')}</span>
                    <span className="load-value">{result.majeureMineure.majeure}</span>
                  </div>
                  <div className="load-summary-row">
                    <span className="load-label">{s('Mineure', 'Mineure')}</span>
                    <span className="load-value">{result.majeureMineure.mineure}</span>
                  </div>
                </>
              )}
              {result.languageProfile && (
                <div className="load-summary-row">
                  <span className="load-label">{s('Languages', 'Langues')}</span>
                  <span className="load-value">
                    {[
                      result.languageProfile.frenchLevel && result.languageProfile.frenchLevel !== 'N/A'
                        ? `FR: ${result.languageProfile.frenchLevel}` : null,
                      result.languageProfile.englishLevel
                        ? `EN: ${result.languageProfile.englishLevel}` : null,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
              <div className="load-summary-row">
                <span className="load-label">{s('Courses added', 'Cours ajoutés')}</span>
                <span className="load-value">
                  {result.safeAddedIds.length}
                  {result.safeAddedIds.length < result.totalOriginalAdded && (
                    <span className="load-skipped"> ({result.totalOriginalAdded - result.safeAddedIds.length} {s('skipped — not found in current schedule', 'ignoré(s) — absents du calendrier actuel')})</span>
                  )}
                </span>
              </div>
              <div className="load-summary-row">
                <span className="load-label">{s('Starred', 'Favoris')}</span>
                <span className="load-value">{result.safeStarredIds.length}</span>
              </div>
              <div className="load-summary-row">
                <span className="load-label">{s('Saved on', 'Sauvegardé le')}</span>
                <span className="load-value">{savedDate}</span>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="load-warnings">
                <div className="load-warn-title">⚠ {s('Compatibility notices', 'Avertissements de compatibilité')}</div>
                {result.warnings.map((w, i) => (
                  <div key={i} className="load-warn-item">{w}</div>
                ))}
              </div>
            )}

            <div className="load-actions">
              <button className="load-cancel-btn" onClick={onClose}>
                {s('Cancel', 'Annuler')}
              </button>
              <button className="load-restore-btn" onClick={handleRestore}>
                {s('Restore this schedule', 'Restaurer cet emploi du temps')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
