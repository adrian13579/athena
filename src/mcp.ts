import type { CallToolResult } from '@modelcontextprotocol/client';
import { CallToolResultSchema } from '@modelcontextprotocol/core';
import {
  McpUiResourceCspSchema,
  McpUiResourcePermissionsSchema,
  type McpUiResourceCsp,
  type McpUiResourcePermissions,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import { z } from 'zod';

export type DiagramAttachment = {
  id: string;
  server: 'excalidraw';
  toolName: string;
  resourceUri: string;
  arguments: Record<string, unknown>;
  result: CallToolResult;
};
export type DiagramContext = { appId: string; summary: string };
export type AppResource = {
  html: string;
  csp: McpUiResourceCsp;
  permissions: McpUiResourcePermissions;
};

async function mcpRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`/api/mcp/excalidraw/${path}`, {
    ...init,
    signal: AbortSignal.any([...(init.signal ? [init.signal] : []), AbortSignal.timeout(25000)]),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ message: z.string() }).safeParse(result);
    throw new Error(
      error.success ? error.data.message : 'Excalidraw is unavailable. Try again shortly.',
    );
  }
  return result;
}

export async function loadExcalidrawResource(signal: AbortSignal): Promise<AppResource> {
  const result = await mcpRequest('resource', { signal });
  return z
    .object({
      html: z.string(),
      csp: McpUiResourceCspSchema,
      permissions: McpUiResourcePermissionsSchema,
    })
    .parse(result);
}

export async function callExcalidrawTool(
  appId: string,
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
): Promise<CallToolResult> {
  const result = await mcpRequest('tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, name, arguments: args }),
    signal,
  });
  return CallToolResultSchema.parse(result);
}
