import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  AppBridge,
  PostMessageTransport,
  type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import { callExcalidrawTool, loadExcalidrawResource, type DiagramAttachment } from '../mcp';

type AppCallbacks = {
  onContext: (id: string, summary: string) => void;
  onExpand: (expanded: boolean) => void;
  onPrompt: (text: string) => void;
  onLink: (url: string) => void;
};

export function useMcpApp(
  app: DiagramAttachment,
  iframe: RefObject<HTMLIFrameElement | null>,
  viewport: RefObject<HTMLDivElement | null>,
  theme: 'dark' | 'white',
  expanded: boolean,
  attempt: number,
  callbacks: AppCallbacks,
) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [inlineHeight, setInlineHeight] = useState<number>();
  const bridgeRef = useRef<AppBridge | null>(null);
  const latest = useRef({ callbacks, theme, expanded });
  useEffect(() => {
    latest.current = { callbacks, theme, expanded };
  });

  function hostContext(): McpUiHostContext {
    const rect = viewport.current?.getBoundingClientRect();
    return {
      theme: latest.current.theme === 'white' ? 'light' : 'dark',
      platform: 'web',
      displayMode: latest.current.expanded ? 'fullscreen' : 'inline',
      availableDisplayModes: ['inline', 'fullscreen'],
      containerDimensions: {
        width: Math.round(rect?.width ?? 400),
        height: Math.round(rect?.height ?? 320),
      },
    };
  }

  useEffect(() => {
    const frame = iframe.current;
    if (!frame) return;
    const controller = new AbortController();
    let bridge: AppBridge | undefined;
    let initialized = false;
    let timer: ReturnType<typeof setTimeout>;
    setStatus('loading');
    setError('');
    setInlineHeight(undefined);
    function fail(message: string) {
      if (controller.signal.aborted) return;
      setError(message);
      setStatus('error');
    }
    timer = setTimeout(() => fail('The diagram took too long to load. Try again.'), 35000);
    void (async () => {
      try {
        const resource = await loadExcalidrawResource(controller.signal);
        if (controller.signal.aborted || !frame.contentWindow) return;
        bridge = new AppBridge(
          null,
          { name: 'Athena', version: '1.0.0' },
          {
            serverTools: {},
            openLinks: {},
            logging: {},
            updateModelContext: { text: {} },
            message: { text: {} },
            sandbox: { csp: resource.csp, permissions: resource.permissions },
          },
          { hostContext: hostContext() },
        );
        bridgeRef.current = bridge;
        bridge.onsizechange = ({ height }) => {
          if (!latest.current.expanded && typeof height === 'number' && Number.isFinite(height)) {
            setInlineHeight(Math.max(240, Math.min(1200, Math.ceil(height))));
          }
        };
        bridge.oncalltool = async ({ name, arguments: args }) => {
          try {
            const result = await callExcalidrawTool(app.id, name, args ?? {}, controller.signal);
            if (result.isError) fail('Excalidraw could not save or load the diagram. Try again.');
            return result;
          } catch (reason) {
            const message = reason instanceof Error ? reason.message : 'The diagram action failed.';
            fail(message);
            return { isError: true, content: [{ type: 'text', text: message }] };
          }
        };
        bridge.onupdatemodelcontext = async (context) => {
          const summary = (context.content ?? [])
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n')
            .slice(0, 8000);
          latest.current.callbacks.onContext(app.id, summary);
          return {};
        };
        bridge.onmessage = async ({ role, content }) => {
          const text = content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n')
            .trim();
          if (role !== 'user' || !text || text.length > 4000) return { isError: true };
          latest.current.callbacks.onPrompt(text);
          return {};
        };
        bridge.onopenlink = async ({ url }) => {
          const link = new URL(url);
          if (
            link.protocol !== 'https:' ||
            !(link.hostname === 'excalidraw.com' || link.hostname.endsWith('.excalidraw.com')) ||
            link.username ||
            link.password
          )
            return { isError: true };
          latest.current.callbacks.onLink(link.href);
          window.open(link.href, '_blank', 'noopener,noreferrer');
          return {};
        };
        bridge.onrequestdisplaymode = async ({ mode }) => {
          latest.current.callbacks.onExpand(mode === 'fullscreen');
          return { mode: mode === 'fullscreen' ? 'fullscreen' : 'inline' };
        };
        bridge.onsandboxready = () => {
          void bridge
            ?.sendSandboxResourceReady(resource)
            .catch(() => fail('The diagram could not start.'));
        };
        bridge.oninitialized = () => {
          initialized = true;
          clearTimeout(timer);
          void (async () => {
            // Reload the current checkpoint so edits survive leaving and reopening a study.
            const structured = app.result.structuredContent;
            const checkpoint =
              structured && typeof structured === 'object' && 'checkpointId' in structured
                ? structured.checkpointId
                : undefined;
            const args =
              typeof checkpoint === 'string'
                ? {
                    ...app.arguments,
                    elements: JSON.stringify([{ type: 'restoreCheckpoint', id: checkpoint }]),
                  }
                : app.arguments;
            await bridge!.sendToolInput({ arguments: args });
            await bridge!.sendToolResult(app.result);
            if (!controller.signal.aborted) setStatus('ready');
          })().catch(() => fail('The diagram could not receive its contents.'));
        };
        await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow));
        if (controller.signal.aborted) return;
        frame.src = '/api/mcp/excalidraw/sandbox';
      } catch (reason) {
        fail(reason instanceof Error ? reason.message : 'The diagram could not load.');
      }
    })();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (bridgeRef.current === bridge) bridgeRef.current = null;
      if (bridge) {
        if (initialized)
          void bridge
            .teardownResource({}, { timeout: 1000 })
            .catch(() => {})
            .finally(() => bridge?.close());
        else void bridge.close();
      }
      frame.removeAttribute('src');
    };
  }, [app, attempt]);

  useEffect(() => {
    const sendContext = () => {
      void Promise.resolve(bridgeRef.current?.sendHostContextChange(hostContext())).catch(() => {});
    };
    sendContext();
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(sendContext);
    observer.observe(element);
    return () => observer.disconnect();
  }, [theme, expanded, status]);

  return { status, error, inlineHeight };
}
