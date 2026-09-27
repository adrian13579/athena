import React, { Suspense, useState } from 'react';
import type { Study } from './studies';
import AppHeader, { type AppSection } from './components/AppHeader';
import StudyChat, { welcomeMessage, type ChatMessage } from './components/StudyChat';
import StudyDialog from './components/StudyDialog';
import StudyLibrary from './components/StudyLibrary';
import { useStudies } from './hooks/useStudies';
import { sendStudyMessage } from './chat';

const KnowledgeGraph = React.lazy(() => import('./KnowledgeGraph'));
type DialogMode = 'create' | 'help' | null;

export default function App() {
  const [section, setSection] = useState<AppSection>('studies');
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [chatPending, setChatPending] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const { studies, loadState, online, canCreate, addStudy, retry, markUnavailable } = useStudies();

  function navigate(nextSection: AppSection) {
    setSection(nextSection);
    setSelectedStudy(null);
  }

  function openStudy(study: Study) {
    setSelectedStudy(study);
    setConversations((current) =>
      current[study.id] ? current : { ...current, [study.id]: [welcomeMessage(study)] },
    );
  }

  async function sendMessage(text: string) {
    if (!selectedStudy || !text.trim()) return;
    const study = selectedStudy;
    const existingMessages = conversations[study.id] ?? [welcomeMessage(study)];
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'you',
      text: text.trim(),
    };
    setConversations((current) => ({
      ...current,
      [study.id]: [...existingMessages, message],
    }));
    setChatPending(true);
    try {
      const history = existingMessages
        .filter((item) => !item.id.startsWith('welcome-'))
        .map((item) => ({
          role: item.role === 'you' ? ('user' as const) : ('assistant' as const),
          content: item.text,
        }))
        .slice(-40);
      const answer = await sendStudyMessage(study, history, message.text);
      setConversations((current) => ({
        ...current,
        [study.id]: [
          ...(current[study.id] ?? []),
          { id: crypto.randomUUID(), role: 'guide', text: answer },
        ],
      }));
    } catch (error) {
      setConversations((current) => ({
        ...current,
        [study.id]: [
          ...(current[study.id] ?? []),
          {
            id: crypto.randomUUID(),
            role: 'guide',
            text:
              error instanceof Error
                ? error.message
                : 'The study assistant could not respond. Try again shortly.',
          },
        ],
      }));
    } finally {
      setChatPending(false);
    }
  }

  return (
    <div className="app">
      {!selectedStudy && (
        <AppHeader
          section={section}
          studyCount={studies.length}
          onNavigate={navigate}
          onHelp={() => setDialogMode('help')}
        />
      )}
      <main className={selectedStudy ? 'study-chat-main' : section === 'graph' ? 'graph-main' : ''}>
        {selectedStudy ? (
          <StudyChat
            study={selectedStudy}
            messages={conversations[selectedStudy.id] ?? [welcomeMessage(selectedStudy)]}
            onBack={() => setSelectedStudy(null)}
            onSend={sendMessage}
            isThinking={chatPending}
          />
        ) : (
          <>
            <div hidden={section !== 'studies'}>
              <StudyLibrary
                studies={studies}
                canCreate={canCreate}
                onCreate={() => setDialogMode('create')}
                onSelect={openStudy}
              />
            </div>
            {section === 'graph' && (
              <section className="workspace graph-workspace">
                <Suspense fallback={null}>
                  <KnowledgeGraph studies={studies} onSelect={openStudy} />
                </Suspense>
              </section>
            )}
          </>
        )}
        {!selectedStudy && loadState === 'loading' && <p role="status">Loading studies...</p>}
        {!selectedStudy && loadState === 'error' && (
          <p className="storage-error" role="alert">
            Studies are unavailable. Connect to the server to create studies.{' '}
            <button onClick={retry} disabled={!online}>
              Retry connection
            </button>
          </p>
        )}
      </main>
      <StudyDialog
        mode={dialogMode}
        studyCount={studies.length}
        canCreate={canCreate}
        loadState={loadState}
        online={online}
        onClose={() => setDialogMode(null)}
        onRetry={retry}
        onCreate={addStudy}
        onCreated={() => setDialogMode(null)}
        onUncertainFailure={markUnavailable}
      />
    </div>
  );
}
