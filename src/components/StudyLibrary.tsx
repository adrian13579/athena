import { useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Grid2X2,
  List,
  ListFilter,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { Study } from '../studies';

export default function StudyLibrary({
  studies,
  canCreate,
  onCreate,
  onSelect,
}: {
  studies: Study[];
  canCreate: boolean;
  onCreate: () => void;
  onSelect: (study: Study) => void;
}) {
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('All studies');
  const normalizedQuery = query.trim().toLowerCase();
  const categories = ['All studies', ...new Set(studies.map((study) => study.category))];
  const visible = studies
    .filter(
      (study) =>
        `${study.title} ${study.description} ${study.category}`
          .toLowerCase()
          .includes(normalizedQuery) &&
        (filter === 'All studies' || study.category === filter),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title)
        : b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
    );

  return (
    <section className="workspace">
      <div className="section-heading">
        <h1>Your studies</h1>
        <button className="primary-button" disabled={!canCreate} onClick={onCreate}>
          <Plus size={18} />
          New study
        </button>
      </div>
      <div className="toolbar">
        <label className={`search ${normalizedQuery ? 'has-query' : ''}`}>
          <Search size={18} />
          <input
            aria-label="Search studies"
            placeholder="Search your studies"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {normalizedQuery && (
            <span className="search-active-indicator" role="status">
              <span aria-hidden="true" />
              Filtering
            </span>
          )}
          {query && (
            <button className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={15} />
            </button>
          )}
        </label>
        <div className="toolbar-right">
          <label className="select-wrap">
            <ListFilter size={16} className="select-icon" aria-hidden="true" />
            <select
              aria-label="Filter by category"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <span className="select-value" aria-hidden="true">
              {filter}
            </span>
            <ChevronDown size={14} className="select-chevron" aria-hidden="true" />
          </label>
          <label className="select-wrap sort">
            <ArrowDownUp size={16} className="select-icon" aria-hidden="true" />
            <select
              aria-label="Sort studies"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Most recent</option>
              <option value="name">Name A–Z</option>
            </select>
            <span className="select-value" aria-hidden="true">
              {sort === 'name' ? 'Name A–Z' : 'Most recent'}
            </span>
            <ChevronDown size={14} className="select-chevron" aria-hidden="true" />
          </label>
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
        </div>
      </div>
      <div className={`study-grid ${layout === 'list' ? 'list-layout' : ''}`}>
        {visible.map((study) => (
          <button className="study-card" key={study.id} onClick={() => onSelect(study)}>
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
        ))}
      </div>
      {visible.length === 0 && (
        <p className="empty">
          {studies.length === 0
            ? 'No studies yet. Create your first study to get started.'
            : 'No studies match your search. Try another keyword or category.'}
        </p>
      )}
    </section>
  );
}
