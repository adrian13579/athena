import { Module } from '@nestjs/common';
import { StudyChatController } from './study-chat.controller.js';
import { StudyChatService } from './study-chat.service.js';
import { McpModule } from '../mcp/mcp.module.js';

@Module({
  imports: [McpModule],
  controllers: [StudyChatController],
  providers: [StudyChatService],
})
export class ChatModule {}
