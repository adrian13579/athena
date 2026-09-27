import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './knowledge.controller.js';
import { knowledgeEntities } from './knowledge.entities.js';
import { KnowledgeService } from './knowledge.service.js';
import { StudyEntity } from '../studies/study.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([...knowledgeEntities, StudyEntity])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
})
export class KnowledgeModule {}
