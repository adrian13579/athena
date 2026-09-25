import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './knowledge.controller';
import { knowledgeEntities } from './knowledge.entities';
import { KnowledgeService } from './knowledge.service';
import { StudyEntity } from '../studies/study.entity';

@Module({
  imports: [TypeOrmModule.forFeature([...knowledgeEntities, StudyEntity])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
})
export class KnowledgeModule {}
