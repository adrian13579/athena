import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Study } from '../studies';
import AthenaMark from './AthenaMark';
import ChatComposer from './ChatComposer';

export type ChatMessage = { id: string; role: 'guide' | 'you'; text: string };

export function welcomeMessage(study: Study): ChatMessage {
  return {
    id: `welcome-${study.id}`,
    role: 'guide',
    text: `Welcome to your study space for “${study.title}”. Share a question, an idea, or something you want to remember.`,
  };
}

export default function StudyChat({
  study,
  messages,
  onBack,
  onSend,
  isThinking,
}: {
  study: Study;
  messages: ChatMessage[];
  onBack: () => void;
  onSend: (text: string) => void | Promise<void>;
  isThinking: boolean;
}) {
  const feed = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLElement>(null);
  const learningGoals = study.learningGoals ?? [];

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    function syncViewport() {
      if (!viewport || viewport.scale !== 1 || !chat.current) return;
      chat.current.style.setProperty('--chat-viewport-height', `${viewport.height}px`);
      chat.current.style.setProperty('--chat-viewport-offset', `${viewport.offsetTop}px`);
    }
    syncViewport();
    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);
    return () => {
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    feed.current?.scrollTo?.({
      top: feed.current.scrollHeight,
      behavior: reducedMotion ? 'instant' : 'smooth',
    });
  }, [messages]);

  return (
    <section ref={chat} className="study-chat" aria-label={`Conversation for ${study.title}`}>
      <div className="chat-heading">
        <button
          className="back-to-studies"
          onClick={onBack}
          aria-label="All studies"
          title="All studies"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 title={study.title}>{study.title}</h1>
      </div>
      <div className="chat-body" ref={feed} aria-live="polite" aria-label="Study conversation">
        {learningGoals.length > 0 && (
          <section className="study-goals" aria-labelledby="study-goals-title">
            <h2 id="study-goals-title">Learning goals</h2>
            <ul>
              {learningGoals.map((goal, index) => (
                <li key={`${index}-${goal}`}>{goal}</li>
              ))}
            </ul>
          </section>
        )}
        {messages.map((message) => (
          <div
            className={`chat-row ${message.role === 'you' ? 'from-you' : 'from-guide'}`}
            key={message.id}
          >
            {message.role === 'guide' && (
              <span className="chat-avatar">
                <AthenaMark size={24} />
              </span>
            )}
            <div className="chat-bubble">
              <span className="chat-author">{message.role === 'you' ? 'You' : 'Study space'}</span>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        {isThinking && (
          <p className="chat-thinking" role="status">
            Study space is thinking…
          </p>
        )}
      </div>
      <ChatComposer onSend={onSend} isThinking={isThinking} />
    </section>
  );
}
