import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyEntity } from './study.entity';
import { StudiesController } from './studies.controller';
import { StudiesService } from './studies.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudyEntity])],
  controllers: [StudiesController],
  providers: [StudiesService],
})
export class StudiesModule {}
