import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { ExcalidrawMcpService } from './excalidraw-mcp.service.js';
import { sandboxCsp, sandboxHtml } from './mcp-sandbox.js';

const toolCall = z
  .object({
    appId: z.uuid(),
    name: z.string().max(80),
    arguments: z.record(z.string(), z.unknown()),
  })
  .strict();

@Controller('mcp/excalidraw')
export class ExcalidrawMcpController {
  constructor(private readonly mcp: ExcalidrawMcpService) {}

  @Get('resource')
  resource() {
    return this.mcp.getResource();
  }

  @Get('sandbox')
  async sandbox(@Res() reply: FastifyReply) {
    const { csp } = await this.mcp.getResource();
    return reply
      .type('text/html; charset=utf-8')
      .header('Content-Security-Policy', sandboxCsp(csp))
      .header('X-Content-Type-Options', 'nosniff')
      .header('Cache-Control', 'no-store')
      .send(sandboxHtml);
  }

  @Post('tools/call')
  async call(@Body() input: unknown) {
    const parsed = toolCall.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid Excalidraw tool request.');
    try {
      return await this.mcp.callAppTool(parsed.data.appId, parsed.data.name, parsed.data.arguments);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException(
        'Excalidraw could not complete this action. Try again shortly.',
      );
    }
  }
}
