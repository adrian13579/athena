import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyEntity } from './study.entity.js';
import { StudiesController } from './studies.controller.js';
import { StudiesService } from './studies.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([StudyEntity])],
  controllers: [StudiesController],
  providers: [StudiesService],
})
export class StudiesModule {}
