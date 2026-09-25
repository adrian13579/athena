import React, { Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  Globe2,
  GraduationCap,
  Grid2X2,
  Layers,
  Leaf,
  List,
  Network,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import './styles.css';

export type Study = {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  sources: number;
  date: string;
  notes: string;
};
const initial: Study[] = [
  {
    id: '1',
    title: 'The science of learning',
    description: 'How we learn, remember, and make ideas stick.',
    category: 'Psychology',
    color: 'lavender',
    sources: 8,
    date: '2026-09-25',
    notes:
      'Explore active recall, spaced repetition, and the role of sleep in memory consolidation.',
  },
  {
    id: '2',
    title: 'A more sustainable world',
    description: 'Small ideas. Meaningful change. A better future.',
    category: 'Environment',
    color: 'green',
    sources: 12,
    date: '2026-09-24',
    notes: 'Investigate circular economies, renewable energy, and everyday sustainable choices.',
  },
  {
    id: '3',
    title: 'Design that makes sense',
    description: 'Understanding the people behind the products.',
    category: 'Design',
    color: 'peach',
    sources: 6,
    date: '2026-09-23',
    notes: 'Study human-centered design, accessibility, and the principles of visual hierarchy.',
  },
  {
    id: '4',
    title: 'A brief history of everything',
    description: 'Connecting the moments that shaped our world.',
    category: 'History',
    color: 'blue',
    sources: 15,
    date: '2026-09-22',
    notes:
      'Connect the scientific revolution, industrialization, and the emergence of modern societies.',
  },
  {
    id: '5',
    title: 'The creative mind',
    description: 'Find inspiration at the intersection of ideas.',
    category: 'Creativity',
    color: 'pink',
    sources: 4,
    date: '2026-09-21',
    notes:
      'Collect observations about divergent thinking, creative habits, and cross-disciplinary inspiration.',
  },
];
const KnowledgeGraph = React.lazy(() => import('./KnowledgeGraph'));
const icons = [GraduationCap, Leaf, Layers, Globe2, Sparkles];
function readStudies(): Study[] {
  try {
    const saved = JSON.parse(localStorage.getItem('athena-studies') || 'null');
    return Array.isArray(saved) &&
      saved.every(
        (s) =>
          typeof s.title === 'string' && typeof s.notes === 'string' && typeof s.id === 'string',
      )
      ? saved
      : initial;
  } catch {
    return initial;
  }
}
function App() {
  const [section, setSection] = useState<'studies' | 'graph'>('studies');
  const [studies, setStudies] = useState<Study[]>(readStudies);
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('All studies');
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Study | null>(null);
  const [help, setHelp] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem('athena-studies', JSON.stringify(studies));
    } catch {
      setStorageError(true);
    }
  }, [studies]);
  useEffect(() => {
    let active = true;

    async function loadStudies() {
      try {
        const response = await fetch('/api/studies');
        if (!response.ok) throw new Error('Could not load studies.');

        let persisted: Study[] = await response.json();
        if (persisted.length === 0) {
          const syncResponse = await fetch('/api/studies/sync', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(readStudies()),
          });
          if (!syncResponse.ok) throw new Error('Could not import local studies.');
          persisted = await syncResponse.json();
        }

        if (active) {
          setStudies(persisted);
          setStorageError(false);
        }
      } catch {
        if (active) setStorageError(true);
      } finally {
        if (active) setApiReady(true);
      }
    }

    void loadStudies();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!apiReady) return;

    const timeout = window.setTimeout(async () => {
      setSaving(true);
      try {
        const response = await fetch('/api/studies/sync', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studies),
        });
        if (!response.ok) throw new Error('Could not save studies.');
        setStorageError(false);
      } catch {
        setStorageError(true);
      } finally {
        setSaving(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [studies, apiReady]);
  useEffect(() => {
    if (modal || selected || help) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal, selected, help]);
  function close() {
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
      sort === 'name' ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date),
    );
  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setStudies([
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        category: 'Personal',
        color: ['lavender', 'green', 'peach', 'blue', 'pink'][studies.length % 5],
        sources: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      },
      ...studies,
    ]);
    setTitle('');
    setDescription('');
    close();
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
              <button className="primary-button" onClick={() => setModal(true)}>
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
                const Icon = icons[initial.findIndex((s) => s.id === study.id)] || BookOpen;
                return (
                  <button className="study-card" key={study.id} onClick={() => setSelected(study)}>
                    <div className="card-top">
                      <span className="study-icon">
                        <Icon size={25} strokeWidth={1.5} />
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
          {section === 'studies' && visible.length === 0 && (
            <p className="empty">No studies match your search. Try another keyword or category.</p>
          )}
        </section>
        {storageError && (
          <p className="storage-error" role="status">
            Changes could not be saved in this browser.
          </p>
        )}
      </main>
      <dialog
        ref={dialog}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <button className="dialog-close icon-button" aria-label="Close dialog" onClick={close}>
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
                maxLength={90}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Study title"
              />
            </label>
            <label>
              Description (optional)
              <textarea
                maxLength={220}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description"
              />
            </label>
            <button className="primary-button" type="submit">
              <Plus size={17} />
              Create study
            </button>
          </form>
        ) : selected ? (
          <div>
            <span className={`detail-category ${selected.color}`}>{selected.category}</span>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <label className="notes-label">
              Your notes
              <textarea
                className="notes"
                placeholder="Write a note…"
                value={selected.notes}
                onChange={(e) => {
                  const updated = { ...selected, notes: e.target.value };
                  setSelected(updated);
                  setStudies(studies.map((s) => (s.id === updated.id ? updated : s)));
                }}
              />
            </label>
            <span className="saved">
              <Check size={14} />
              {storageError
                ? 'Database offline · saved in this browser'
                : !apiReady || saving
                  ? 'Saving…'
                  : 'Saved to PostgreSQL'}
            </span>
          </div>
        ) : help ? (
          <div>
            <span className="modal-icon">
              <FlaskConical size={26} />
            </span>
            <h2>Help</h2>
            <p>
              Create studies to organize topics you’re exploring. Open any study to write notes, or
              use the Knowledge Graph to browse your collection.
            </p>
            <p>
              Your studies and notes are saved to PostgreSQL, with a browser copy for offline
              access. Starting studies and source counts are examples.
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
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
