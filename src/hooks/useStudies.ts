import { useEffect, useState } from 'react';
import { createStudy, loadStudies, type CreateStudy, type Study } from '../studies';

export type StudyLoadState = 'loading' | 'ready' | 'error';

export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loadState, setLoadState] = useState<StudyLoadState>('loading');
  const [reload, setReload] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
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

  async function addStudy(study: CreateStudy) {
    const saved = await createStudy(study);
    setStudies((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved;
  }

  return {
    studies,
    loadState,
    online,
    canCreate,
    addStudy,
    retry: () => setReload((value) => value + 1),
    markUnavailable: () => setLoadState('error'),
  };
}
