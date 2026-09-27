import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  Grid2X2,
  List,
  Network,
  Plus,
  Search,
  X,
} from 'lucide-react';

import {
  createStudy,
  loadStudies,
  StudyRequestError,
  type Study,
  type CreateStudy,
} from './studies';

const KnowledgeGraph = React.lazy(() => import('./KnowledgeGraph'));
export default function App() {
  const [section, setSection] = useState<'studies' | 'graph'>('studies');
  const [studies, setStudies] = useState<Study[]>([]);
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('All studies');
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Study | null>(null);
  const [help, setHelp] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const pendingCreate = useRef<CreateStudy | null>(null);
  const submitting = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const canCreate = online && loadState === 'ready';
  useEffect(() => {
    try {
      localStorage.removeItem('athena-studies');
    } catch {
      /* Storage is optional. */
    }
    const disconnected = () => {
      setOnline(false);
      setLoadState('error');
    };
    const connected = () => {
      setOnline(true);
      setReload((value) => value + 1);
    };
    window.addEventListener('offline', disconnected);
    window.addEventListener('online', connected);
    return () => {
      window.removeEventListener('offline', disconnected);
      window.removeEventListener('online', connected);
    };
  }, []);
  useEffect(() => {
    if (!online) {
      setLoadState('error');
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoadState('loading');
    void loadStudies(AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then((saved) => {
        if (active) {
          setStudies(saved);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [reload, online]);
  useEffect(() => {
    if (modal || selected || help) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal, selected, help]);
  function close() {
    if (submitting.current) return;
    setModal(false);
    setSelected(null);
    setHelp(false);
  }
  const visible = studies
    .filter(
      (s) =>
        `${s.title} ${s.description} ${s.category}`.toLowerCase().includes(query.toLowerCase()) &&
        (filter === 'All studies' || s.category === filter),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title)
        : b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
    );
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate || submitting.current || !title.trim()) return;
    // Preserve the exact request across uncertain failures so retry cannot duplicate a study.
    pendingCreate.current ??= {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      color: ['lavender', 'green', 'peach', 'blue', 'pink'][studies.length % 5],
    };
    submitting.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const saved = await createStudy(pendingCreate.current);
      setStudies((current) => [saved, ...current.filter((study) => study.id !== saved.id)]);
      pendingCreate.current = null;
      setTitle('');
      setDescription('');
      setModal(false);
    } catch (error) {
      if (error instanceof StudyRequestError && (error.status === 400 || error.status === 409)) {
        setSaveError(error.message);
        pendingCreate.current = null;
      } else {
        setSaveError('The save could not be confirmed. Reconnect, then retry this study.');
        setLoadState('error');
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <div className="app">
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSection('studies');
          }}
          aria-label="Athena home"
        >
          <span className="brand-mark">
            a<span>✦</span>
          </span>
          athena<span className="brand-dot">.</span>
        </a>
        <nav className="section-tabs" aria-label="Main sections">
          <button
            className={section === 'studies' ? 'active' : ''}
            onClick={() => setSection('studies')}
          >
            <BookOpen size={18} />
            Studies<span className="count">{studies.length}</span>
          </button>
          <button
            className={section === 'graph' ? 'active' : ''}
            onClick={() => setSection('graph')}
          >
            <Network size={18} />
            Knowledge Graph
          </button>
        </nav>
        <div className="header-right">
          <button className="icon-button" aria-label="Help" onClick={() => setHelp(true)}>
            <CircleHelp size={20} />
          </button>
          <span className="avatar" title="Personal workspace">
            A
          </span>
        </div>
      </header>
      <main className={section === 'graph' ? 'graph-main' : ''}>
        <section className={`workspace ${section === 'graph' ? 'graph-workspace' : ''}`}>
          {section === 'studies' && (
            <div className="section-heading">
              <h1>Your studies</h1>
              <button
                className="primary-button"
                disabled={!canCreate}
                onClick={() => setModal(true)}
              >
                <Plus size={18} />
                New study
              </button>
            </div>
          )}
          {section === 'studies' && (
            <div className="toolbar">
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Search studies"
                  placeholder="Search your studies"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    className="clear-search"
                    aria-label="Clear search"
                    onClick={() => setQuery('')}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <div className="toolbar-right">
                <label className="select-wrap">
                  <select
                    aria-label="Filter by category"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    {['All studies', ...new Set(studies.map((s) => s.category))].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
                <label className="select-wrap sort">
                  <ArrowDownUp size={15} />
                  <select
                    aria-label="Sort studies"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recent">Most recent</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </label>
                {section === 'studies' && (
                  <div className="view-toggle">
                    <button
                      aria-label="Grid view"
                      aria-pressed={layout === 'grid'}
                      className={layout === 'grid' ? 'chosen' : ''}
                      onClick={() => setLayout('grid')}
                    >
                      <Grid2X2 size={17} />
                    </button>
                    <button
                      aria-label="List view"
                      aria-pressed={layout === 'list'}
                      className={layout === 'list' ? 'chosen' : ''}
                      onClick={() => setLayout('list')}
                    >
                      <List size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {section === 'studies' ? (
            <div className={`study-grid ${layout === 'list' ? 'list-layout' : ''}`}>
              {visible.map((study) => {
                return (
                  <button className="study-card" key={study.id} onClick={() => setSelected(study)}>
                    <div className="card-top">
                      <span className="study-icon">
                        <BookOpen size={25} strokeWidth={1.5} />
                      </span>
                      <ArrowRight size={19} className="card-arrow" />
                    </div>
                    <span className="category">{study.category}</span>
                    <h3>{study.title}</h3>
                    <div className="card-footer">
                      <span>
                        <BookOpen size={13} />
                        {study.sources} sources
                      </span>
                      <span>
                        {new Date(study.date + 'T12:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Suspense fallback={null}>
              <KnowledgeGraph studies={studies} onSelect={setSelected} />
            </Suspense>
          )}
          {section === 'studies' && loadState === 'ready' && visible.length === 0 && (
            <p className="empty">
              {studies.length === 0
                ? 'No studies yet. Create your first study to get started.'
                : 'No studies match your search. Try another keyword or category.'}
            </p>
          )}
        </section>
        {loadState === 'loading' && <p role="status">Loading studies...</p>}
        {loadState === 'error' && (
          <p className="storage-error" role="alert">
            Studies are unavailable. Connect to the server to create studies.{' '}
            <button onClick={() => setReload((value) => value + 1)} disabled={!online}>
              Retry connection
            </button>
          </p>
        )}
      </main>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
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
        {modal ? (
          <form onSubmit={create}>
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Study title"
              />
            </label>
            <label>
              Description (optional)
              <textarea
                disabled={saving || !canCreate || pendingCreate.current !== null}
                maxLength={220}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                <button
                  type="button"
                  disabled={!online || loadState === 'loading'}
                  onClick={() => setReload((value) => value + 1)}
                >
                  Retry connection
                </button>
              </p>
            )}
          </form>
        ) : selected ? (
          <div>
            <span className={`detail-category ${selected.color}`}>{selected.category}</span>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
          </div>
        ) : help ? (
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
              Your studies are saved to PostgreSQL. A server connection is required to load and
              create studies.
            </p>
            <button className="primary-button" onClick={close}>
              Got it
              <Check size={16} />
            </button>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
