import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateStudies1790294400000 } from './database/create-studies.migration';
import { CreateKnowledgeGraph1790371200000 } from './database/create-knowledge-graph.migration';
import { ResetStudies1790460800000 } from './database/reset-studies.migration';
import { HealthController } from './health.controller';
import { StudyEntity } from './studies/study.entity';
import { StudiesModule } from './studies/studies.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { knowledgeEntities } from './knowledge/knowledge.entities';

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
