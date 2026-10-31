import type { McpUiResourceCsp } from '@modelcontextprotocol/ext-apps/app-bridge';

function origins(values: string[] = []): string {
  return values
    .map((value) => {
      const url = new URL(value);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.origin !== value ||
        /[\s;]/.test(value)
      ) {
        throw new Error('Invalid MCP resource CSP origin');
      }
      return url.origin;
    })
    .join(' ');
}

export function sandboxCsp(csp: McpUiResourceCsp): string {
  const resources = origins(csp.resourceDomains);
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' 'unsafe-eval' blob: ${resources}`,
    `style-src 'unsafe-inline' ${resources}`,
    `img-src data: blob: ${resources}`,
    `font-src data: ${resources}`,
    `connect-src ${origins(csp.connectDomains) || "'none'"}`,
    `frame-src about: blob: ${origins(csp.frameDomains)}`,
    'worker-src blob:',
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

// The outer iframe has an opaque origin (no allow-same-origin). The inner App
// gets the MCP-required tokens but inherits that opaque origin and this HTTP CSP.
// Remote HTML therefore cannot access Athena's DOM, cookies or local storage.
export const sandboxHtml = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;overflow:hidden}</style>
</head><body><script>
(() => {
  if (window.parent === window) return;
  const hostOrigin = new URL(document.referrer).origin;
  let frame;
  window.addEventListener('message', (event) => {
    if (event.source === window.parent && event.origin === hostOrigin) {
      const message = event.data;
      if (!message || message.jsonrpc !== '2.0') return;
      if (message.method === 'ui/notifications/sandbox-resource-ready') {
        if (frame || typeof message.params?.html !== 'string') return;
        frame = document.createElement('iframe');
        frame.title = 'Excalidraw canvas';
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-downloads');
        if (message.params.permissions?.clipboardWrite) frame.allow = 'clipboard-write';
        frame.srcdoc = message.params.html;
        document.body.appendChild(frame);
      } else if (frame?.contentWindow) {
        frame.contentWindow.postMessage(message, '*');
      }
    } else if (frame && event.source === frame.contentWindow && event.data?.jsonrpc === '2.0') {
      window.parent.postMessage(event.data, hostOrigin);
    }
  });
  window.parent.postMessage({jsonrpc:'2.0',method:'ui/notifications/sandbox-proxy-ready',params:{}}, hostOrigin);
})();
</script></body></html>`;
