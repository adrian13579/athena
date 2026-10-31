import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  Client,
  StreamableHTTPClientTransport,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/client';
import {
  getToolUiResourceUri,
  McpUiResourceMetaSchema,
  McpUiToolMetaSchema,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/app-bridge';

const MODEL_TOOLS = new Set(['read_me', 'create_view']);
const APP_TOOLS = new Set(['read_checkpoint', 'save_checkpoint', 'export_to_excalidraw']);
const RESOURCE_URI = 'ui://excalidraw/mcp-app.html';
const SESSION_MS = 4 * 60 * 60 * 1000;

export type DiagramAttachment = {
  id: string;
  server: 'excalidraw';
  toolName: string;
  resourceUri: string;
  arguments: Record<string, unknown>;
  result: CallToolResult;
};

function visibleTo(tool: Tool, audience: 'model' | 'app'): boolean {
  const meta = McpUiToolMetaSchema.parse(tool._meta?.ui ?? {});
  return !meta.visibility || meta.visibility.includes(audience);
}

@Injectable()
export class ExcalidrawMcpService implements OnModuleDestroy {
  private connection?: Promise<{ client: Client; tools: Tool[] }>;
  private resource?: {
    expires: number;
    value: Awaited<ReturnType<ExcalidrawMcpService['loadResource']>>;
  };
  // These capabilities scope browser checkpoint calls to diagrams issued by this API.
  private readonly views = new Map<string, { expires: number; checkpoints: Set<string> }>();

  get enabled() {
    return process.env.EXCALIDRAW_MCP_ENABLED !== 'false';
  }

  private async connect() {
    if (!this.enabled)
      throw new ServiceUnavailableException('Diagrams are disabled on this server.');
    if (!this.connection) {
      const client = new Client(
        { name: 'Athena', version: '1.0.0' },
        {
          capabilities: {
            extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [RESOURCE_MIME_TYPE] } },
          },
        },
      );
      const pending = (async () => {
        const url = new URL(process.env.EXCALIDRAW_MCP_URL?.trim() || 'https://mcp.excalidraw.com');
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid MCP URL');
        const transport = new StreamableHTTPClientTransport(url);
        try {
          await client.connect(transport, { timeout: 15000 });
          const { tools } = await client.listTools({}, { timeout: 15000 });
          return { client, tools };
        } catch (error) {
          await client.close().catch(() => {});
          throw error;
        }
      })();
      this.connection = pending;
      void pending.catch(() => {
        if (this.connection === pending) this.connection = undefined;
      });
      client.onclose = () => {
        if (this.connection === pending) this.connection = undefined;
      };
    }
    return this.connection;
  }

  async getModelTools(): Promise<Tool[]> {
    const { tools } = await this.connect();
    return tools.filter((tool) => MODEL_TOOLS.has(tool.name) && visibleTo(tool, 'model'));
  }

  async callModelTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    return this.call(name, args, 'model');
  }

  private async call(name: string, args: Record<string, unknown>, audience: 'model' | 'app') {
    const { client, tools } = await this.connect();
    const tool = tools.find((candidate) => candidate.name === name);
    const allowed = audience === 'model' ? MODEL_TOOLS : APP_TOOLS;
    if (!tool || !allowed.has(name) || !visibleTo(tool, audience)) {
      throw new BadRequestException('This Excalidraw tool is unavailable in this context.');
    }
    return client.callTool({ name, arguments: args }, { timeout: 20000 });
  }

  async attach(
    name: string,
    args: Record<string, unknown>,
    result: CallToolResult,
  ): Promise<DiagramAttachment | undefined> {
    if (result.isError || name !== 'create_view') return;
    const { tools } = await this.connect();
    const uri = getToolUiResourceUri(tools.find((tool) => tool.name === name) ?? {});
    if (uri !== RESOURCE_URI) return;
    const structured = result.structuredContent;
    const checkpoint =
      structured && typeof structured === 'object' && 'checkpointId' in structured
        ? structured.checkpointId
        : undefined;
    if (typeof checkpoint !== 'string') return;
    const checkpoints = new Set([checkpoint]);
    if (typeof args.elements === 'string') {
      const elements: unknown = JSON.parse(args.elements);
      if (Array.isArray(elements))
        for (const element of elements) {
          if (element?.type === 'restoreCheckpoint' && typeof element.id === 'string')
            checkpoints.add(element.id);
        }
    }
    const now = Date.now();
    for (const [id, view] of this.views) if (view.expires < now) this.views.delete(id);
    while (this.views.size >= 256) this.views.delete(this.views.keys().next().value!);
    const id = randomUUID();
    this.views.set(id, { expires: now + SESSION_MS, checkpoints });
    return { id, server: 'excalidraw', toolName: name, resourceUri: uri, arguments: args, result };
  }

  async callAppTool(id: string, name: string, args: Record<string, unknown>) {
    const view = this.views.get(id);
    if (!view || view.expires < Date.now())
      throw new BadRequestException(
        'This diagram session expired. Ask the guide to draw it again.',
      );
    if (
      ['read_checkpoint', 'save_checkpoint'].includes(name) &&
      (typeof args.id !== 'string' || !view.checkpoints.has(args.id))
    ) {
      throw new BadRequestException('This checkpoint does not belong to the diagram.');
    }
    return this.call(name, args, 'app');
  }

  async readWidgetContext(id: string) {
    const view = this.views.get(id);
    if (!view || view.expires < Date.now()) return 'Diagram session expired; draw a new diagram.';
    const checkpointId = [...view.checkpoints][0];
    const result = await this.callAppTool(id, 'read_checkpoint', { id: checkpointId });
    const snapshot = result.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
    return { checkpointId, elements: snapshot.slice(0, 64000), truncated: snapshot.length > 64000 };
  }

  private async loadResource() {
    const { client } = await this.connect();
    const result = await client.readResource({ uri: RESOURCE_URI }, { timeout: 20000 });
    const content = result.contents.find(
      (item) => item.uri === RESOURCE_URI && item.mimeType === RESOURCE_MIME_TYPE && 'text' in item,
    );
    if (!content || !('text' in content) || content.text.length > 12_000_000)
      throw new Error('Invalid Excalidraw app resource');
    const meta = McpUiResourceMetaSchema.parse(content._meta?.ui ?? {});
    // Excalidraw only needs clipboard access; never grant camera, microphone or location.
    return {
      html: content.text,
      csp: meta.csp ?? {},
      permissions: meta.permissions?.clipboardWrite ? { clipboardWrite: {} } : {},
    };
  }

  async getResource() {
    if (this.resource && this.resource.expires > Date.now()) return this.resource.value;
    try {
      const value = await this.loadResource();
      this.resource = { value, expires: Date.now() + 10 * 60 * 1000 };
      return value;
    } catch {
      throw new ServiceUnavailableException('Excalidraw could not load. Try again shortly.');
    }
  }

  async onModuleDestroy() {
    const connection = await this.connection?.catch(() => undefined);
    await connection?.client.close();
    this.views.clear();
  }
}
