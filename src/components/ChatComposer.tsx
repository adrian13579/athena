import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

function resizeInput(input: HTMLTextAreaElement) {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
}

export default function ChatComposer({
  onSend,
  isThinking,
}: {
  onSend: (text: string) => void | Promise<void>;
  isThinking: boolean;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (inputRef.current) resizeInput(inputRef.current);
  }, [draft]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || typeof ResizeObserver === 'undefined') return;
    let previousWidth = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (input.clientWidth === previousWidth) return;
      previousWidth = input.clientWidth;
      resizeInput(input);
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || isThinking) return;
    onSend(draft.trim());
    setDraft('');
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="chat-composer-area">
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="study-message">
          Message this study
        </label>
        <textarea
          ref={inputRef}
          id="study-message"
          placeholder="Add a question or thought..."
          value={draft}
          rows={1}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              event.keyCode !== 229 &&
              !window.matchMedia?.('(pointer: coarse)').matches
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button type="submit" aria-label="Send message" disabled={!draft.trim() || isThinking}>
          <ArrowUp size={21} aria-hidden="true" />
        </button>
      </form>
      <span className="composer-hint">Enter to send · Shift + Enter for a new line</span>
    </div>
  );
}
