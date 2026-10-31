import { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { DiagramAttachment } from '../mcp';
import { useMcpApp } from '../hooks/useMcpApp';

export default function McpAppView({
  app,
  theme,
  onContext,
  onSend,
  isThinking,
}: {
  app: DiagramAttachment;
  theme: 'dark' | 'white';
  onContext: (id: string, summary: string) => void;
  onSend: (text: string) => void | Promise<void>;
  isThinking: boolean;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const wasModal = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [link, setLink] = useState('');
  const { status, error, inlineHeight } = useMcpApp(
    app,
    iframe,
    viewport,
    theme,
    expanded,
    attempt,
    {
      onContext,
      onExpand: setExpanded,
      onPrompt: setPrompt,
      onLink: setLink,
    },
  );

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!expanded && !wasModal.current) return;
    // Switching modal state preserves the iframe and the learner's canvas.
    element.close();
    if (expanded) element.showModal();
    else element.show();
    wasModal.current = expanded;
    if (!expanded) expandButton.current?.focus({ preventScroll: true });
  }, [expanded]);

  return (
    <dialog
      open
      ref={dialog}
      className="mcp-app"
      data-expanded={expanded}
      data-theme={theme}
      aria-label="Excalidraw explanation"
      onCancel={(event) => {
        event.preventDefault();
        setExpanded(false);
      }}
    >
      <div className="mcp-app-toolbar">
        <span>Excalidraw diagram</span>
        <button
          type="button"
          ref={expandButton}
          disabled={status === 'loading'}
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Return to conversation' : 'Expand diagram to edit'}
        >
          {expanded ? (
            <X size={18} aria-hidden="true" />
          ) : (
            <Maximize2 size={18} aria-hidden="true" />
          )}
          {expanded ? 'Done' : 'Expand to edit'}
        </button>
      </div>
      <div
        className="mcp-app-viewport"
        ref={viewport}
        style={!expanded && inlineHeight ? { height: inlineHeight } : undefined}
      >
        <iframe
          ref={iframe}
          title="Interactive Excalidraw explanation"
          sandbox="allow-scripts allow-forms allow-downloads"
          allow="clipboard-write"
          referrerPolicy="origin"
        />
        {status === 'loading' && (
          <div className="mcp-app-status" role="status">
            Loading diagram…
          </div>
        )}
      </div>
      {status === 'error' && (
        <div className="mcp-app-notice" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry diagram
          </button>
        </div>
      )}
      {link && (
        <a className="mcp-app-link" href={link} target="_blank" rel="noopener noreferrer">
          Open in Excalidraw ↗
        </a>
      )}
      {prompt && (
        <div className="mcp-app-notice">
          <p>{prompt}</p>
          <button
            type="button"
            disabled={isThinking}
            onClick={() => {
              void onSend(prompt);
              setPrompt('');
            }}
          >
            Ask the guide
          </button>
        </div>
      )}
      <p className="mcp-app-caption">
        Edit the canvas, pause briefly to sync, then ask the guide about your changes. Diagrams are
        kept for this session.
      </p>
    </dialog>
  );
}
