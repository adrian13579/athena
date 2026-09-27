import { Body, Controller, Inject, Post } from '@nestjs/common';
import { StudyChatService } from './study-chat.service.js';

@Controller('chat')
export class StudyChatController {
  constructor(@Inject(StudyChatService) private readonly studyChat: StudyChatService) {}

  @Post('study')
  reply(@Body() body: unknown) {
    return this.studyChat.reply(body);
  }
}
