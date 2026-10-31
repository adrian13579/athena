import { Module } from '@nestjs/common';
import { ExcalidrawMcpController } from './excalidraw-mcp.controller.js';
import { ExcalidrawMcpService } from './excalidraw-mcp.service.js';

@Module({
  controllers: [ExcalidrawMcpController],
  providers: [ExcalidrawMcpService],
  exports: [ExcalidrawMcpService],
})
export class McpModule {}
