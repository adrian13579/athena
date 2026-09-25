import { Body, Controller, Get, Put } from '@nestjs/common';
import { StudiesService } from './studies.service';

@Controller('studies')
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}

  @Get()
  findAll() {
    return this.studiesService.findAll();
  }

  @Put('sync')
  sync(@Body() body: unknown) {
    return this.studiesService.sync(body);
  }
}
