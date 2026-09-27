import { useEffect, useRef } from 'react';
import { BookOpen, CircleHelp, Moon, Network, Settings2, Sun } from 'lucide-react';
import AthenaMark from './AthenaMark';

export type AppSection = 'studies' | 'graph';

export default function AppHeader({
  section,
  studyCount,
  onNavigate,
  onHelp,
  theme,
  onThemeChange,
}: {
  section: AppSection;
  studyCount: number;
  onNavigate: (section: AppSection) => void;
  onHelp: () => void;
  theme: 'dark' | 'white';
  onThemeChange: (theme: 'dark' | 'white') => void;
}) {
  const settingsMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!settingsMenu.current?.contains(event.target as Node)) {
        settingsMenu.current?.removeAttribute('open');
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  return (
    <header className="app-header">
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('studies');
        }}
        aria-label="Athena home"
      >
        <AthenaMark className="brand-mark" />
        athena<span className="brand-dot">.</span>
      </a>
      <nav className="section-tabs" aria-label="Main sections">
        <button
          className={section === 'studies' ? 'active' : ''}
          aria-current={section === 'studies' ? 'page' : undefined}
          onClick={() => onNavigate('studies')}
        >
          <BookOpen size={18} aria-hidden="true" />
          Studies<span className="count">{studyCount}</span>
        </button>
        <button
          className={section === 'graph' ? 'active' : ''}
          aria-current={section === 'graph' ? 'page' : undefined}
          onClick={() => onNavigate('graph')}
        >
          <Network size={18} aria-hidden="true" />
          Knowledge
        </button>
      </nav>
      <div className="header-right">
        <details className="settings-menu" ref={settingsMenu}>
          <summary className="icon-button" aria-label="Settings" title="Settings">
            <Settings2 size={20} aria-hidden="true" />
          </summary>
          <div className="settings-popover">
            <p className="settings-title">Settings</p>
            <div className="theme-setting" role="group" aria-label="Theme">
              <span>Theme</span>
              <div className="theme-options">
                <button
                  type="button"
                  aria-pressed={theme === 'dark'}
                  className={theme === 'dark' ? 'selected' : ''}
                  onClick={() => onThemeChange('dark')}
                >
                  <Moon size={16} aria-hidden="true" />
                  Dark
                </button>
                <button
                  type="button"
                  aria-pressed={theme === 'white'}
                  className={theme === 'white' ? 'selected' : ''}
                  onClick={() => onThemeChange('white')}
                >
                  <Sun size={16} aria-hidden="true" />
                  White
                </button>
              </div>
            </div>
          </div>
        </details>
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
