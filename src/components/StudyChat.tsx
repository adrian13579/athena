import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Send } from 'lucide-react';
import type { Study } from '../studies';

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
}: {
  study: Study;
  messages: ChatMessage[];
  onBack: () => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feed.current?.scrollTo?.({ top: feed.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  }

  return (
    <section className="study-chat" aria-label={`Conversation for ${study.title}`}>
      <div className="chat-heading">
        <button className="back-to-studies" onClick={onBack}>
          <ArrowLeft size={17} />
          All studies
        </button>
        <div className="chat-study-title">
          <span className={`chat-study-mark ${study.color}`}>
            <BookOpen size={18} />
          </span>
          <div>
            <span className="chat-study-category">{study.category} · STUDY SPACE</span>
            <h1>{study.title}</h1>
          </div>
        </div>
        {study.description && <p className="chat-study-description">{study.description}</p>}
      </div>
      <div className="chat-body" ref={feed} aria-live="polite" aria-label="Study conversation">
        {messages.map((message) => (
          <div
            className={`chat-row ${message.role === 'you' ? 'from-you' : 'from-guide'}`}
            key={message.id}
          >
            {message.role === 'guide' && <span className="chat-avatar">a✦</span>}
            <div className="chat-bubble">
              <span className="chat-author">{message.role === 'you' ? 'You' : 'Study space'}</span>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="study-message">
          Message this study
        </label>
        <textarea
          id="study-message"
          placeholder="Add a question or thought..."
          value={draft}
          rows={1}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button type="submit" aria-label="Send message" disabled={!draft.trim()}>
          <Send size={17} />
        </button>
        <span className="composer-hint">Enter to send · Shift + Enter for a new line</span>
      </form>
    </section>
  );
}
