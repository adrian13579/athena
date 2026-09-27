import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, FlaskConical, Plus, X } from 'lucide-react';
import { StudyRequestError, type CreateStudy, type Study } from '../studies';
import type { StudyLoadState } from '../hooks/useStudies';

type DialogMode = 'create' | 'help' | null;

export default function StudyDialog({
  mode,
  studyCount,
  canCreate,
  loadState,
  online,
  onClose,
  onRetry,
  onCreate,
  onCreated,
  onUncertainFailure,
}: {
  mode: DialogMode;
  studyCount: number;
  canCreate: boolean;
  loadState: StudyLoadState;
  online: boolean;
  onClose: () => void;
  onRetry: () => void;
  onCreate: (study: CreateStudy) => Promise<Study>;
  onCreated: () => void;
  onUncertainFailure: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const pendingCreate = useRef<CreateStudy | null>(null);
  const submitting = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (mode) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mode]);

  function close() {
    if (submitting.current) return;
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canCreate || submitting.current || !title.trim()) return;
    pendingCreate.current ??= {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      color: ['lavender', 'green', 'peach', 'blue', 'pink'][studyCount % 5],
    };
    submitting.current = true;
    setSaving(true);
    setSaveError('');
    try {
      await onCreate(pendingCreate.current);
      pendingCreate.current = null;
      setTitle('');
      setDescription('');
      onCreated();
    } catch (error) {
      if (error instanceof StudyRequestError && (error.status === 400 || error.status === 409)) {
        setSaveError(error.message);
        pendingCreate.current = null;
      } else {
        setSaveError('The save could not be confirmed. Reconnect, then retry this study.');
        onUncertainFailure();
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
    >
      <button
        className="dialog-close icon-button"
        aria-label="Close dialog"
        disabled={saving}
        onClick={close}
      >
        <X size={20} />
      </button>
      {mode === 'create' ? (
        <form onSubmit={submit}>
          <span className="modal-icon">
            <BookOpen size={25} />
          </span>
          <h2>New study</h2>
          <label>
            Study name
            <input
              autoFocus
              required
              disabled={saving || !canCreate || pendingCreate.current !== null}
              maxLength={90}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Study title"
            />
          </label>
          <label>
            Description (optional)
            <textarea
              disabled={saving || !canCreate || pendingCreate.current !== null}
              maxLength={220}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a description"
            />
          </label>
          <button className="primary-button" type="submit" disabled={saving || !canCreate}>
            <Plus size={17} />
            {saving ? 'Creating...' : pendingCreate.current ? 'Retry create' : 'Create study'}
          </button>
          {saveError && (
            <p className="storage-error" role="alert">
              {saveError}
            </p>
          )}
          {!canCreate && (
            <p role="status">
              Connect to the server before creating a study.{' '}
              <button type="button" disabled={!online || loadState === 'loading'} onClick={onRetry}>
                Retry connection
              </button>
            </p>
          )}
        </form>
      ) : mode === 'help' ? (
        <div>
          <span className="modal-icon">
            <FlaskConical size={26} />
          </span>
          <h2>Help</h2>
          <p>
            Create studies to organize topics you’re exploring. Use the Knowledge Graph to browse
            your collection.
          </p>
          <p>
            Your studies are saved to PostgreSQL. A server connection is required to load and create
            studies.
          </p>
          <button className="primary-button" onClick={close}>
            Got it
            <Check size={16} />
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
