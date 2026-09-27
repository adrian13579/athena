import { BookOpen, CircleHelp, Network } from 'lucide-react';

export type AppSection = 'studies' | 'graph';

export default function AppHeader({
  section,
  studyCount,
  onNavigate,
  onHelp,
}: {
  section: AppSection;
  studyCount: number;
  onNavigate: (section: AppSection) => void;
  onHelp: () => void;
}) {
  return (
    <header>
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('studies');
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
          onClick={() => onNavigate('studies')}
        >
          <BookOpen size={18} />
          Studies<span className="count">{studyCount}</span>
        </button>
        <button className={section === 'graph' ? 'active' : ''} onClick={() => onNavigate('graph')}>
          <Network size={18} />
          Knowledge Graph
        </button>
      </nav>
      <div className="header-right">
        <button className="icon-button" aria-label="Help" onClick={onHelp}>
          <CircleHelp size={20} />
        </button>
        <span className="avatar" title="Personal workspace">
          A
        </span>
      </div>
    </header>
  );
}
