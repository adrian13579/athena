import { Module } from '@nestjs/common';
import { StudyChatController } from './study-chat.controller.js';
import { StudyChatService } from './study-chat.service.js';

@Module({
  controllers: [StudyChatController],
  providers: [StudyChatService],
})
export class ChatModule {}
