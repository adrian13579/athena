import { Body, Controller, Get, GoneException, Inject, Post, Put } from '@nestjs/common';
import { StudiesService } from './studies.service.js';

@Controller('studies')
export class StudiesController {
  constructor(@Inject(StudiesService) private readonly studiesService: StudiesService) {}

  @Get()
  findAll() {
    return this.studiesService.findAll();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.studiesService.create(body);
  }

  @Put('sync')
  sync() {
    throw new GoneException('Study synchronization has been retired. Reload the application.');
  }
}
