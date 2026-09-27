import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateStudies1790294400000 } from './database/create-studies.migration.js';
import { CreateKnowledgeGraph1790371200000 } from './database/create-knowledge-graph.migration.js';
import { ResetStudies1790460800000 } from './database/reset-studies.migration.js';
import { HealthController } from './health.controller.js';
import { StudyEntity } from './studies/study.entity.js';
import { StudiesModule } from './studies/studies.module.js';
import { KnowledgeModule } from './knowledge/knowledge.module.js';
import { knowledgeEntities } from './knowledge/knowledge.entities.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgres://athena:athena@localhost:5432/athena',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      entities: [StudyEntity, ...knowledgeEntities],
      migrations: [
        CreateStudies1790294400000,
        CreateKnowledgeGraph1790371200000,
        ResetStudies1790460800000,
      ],
      migrationsRun: true,
      synchronize: false,
      retryAttempts: 20,
      retryDelay: 1500,
    }),
    StudiesModule,
    KnowledgeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
