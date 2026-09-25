import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeGraph1790371200000 implements MigrationInterface {
  name = 'CreateKnowledgeGraph1790371200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE concepts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        granularity INTEGER NOT NULL DEFAULT 0 CHECK (granularity >= 0),
        parent_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX concepts_name_domain_unique ON concepts (LOWER(name), LOWER(domain));
      CREATE TABLE concept_relationships (
        source_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        relationship_type TEXT NOT NULL CHECK (relationship_type IN ('PREREQUISITE','PART_OF','BUILDS_ON','RELATED_TO','CONTRASTS_WITH','APPLIES','GENERALIZES','SPECIALIZES')),
        strength REAL NOT NULL DEFAULT 1 CHECK (strength >= 0 AND strength <= 1),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (source_id, target_id, relationship_type),
        CHECK (source_id <> target_id)
      );
      CREATE TABLE study_concepts (
        study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
        concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        importance REAL NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
        required_mastery REAL NOT NULL DEFAULT 0.8 CHECK (required_mastery >= 0 AND required_mastery <= 1),
        sequence_hint INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (study_id, concept_id)
      );
      CREATE TABLE learning_evidence (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL DEFAULT 'local',
        concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        study_id TEXT REFERENCES studies(id) ON DELETE SET NULL,
        session_id TEXT,
        activity_id TEXT,
        evidence_type TEXT NOT NULL,
        result REAL NOT NULL CHECK (result >= 0 AND result <= 1),
        difficulty REAL NOT NULL DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
        confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX learning_evidence_learner_concept_created ON learning_evidence (learner_id, concept_id, created_at DESC);
      CREATE TABLE learner_concept_states (
        learner_id TEXT NOT NULL DEFAULT 'local',
        concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        mastery REAL NOT NULL CHECK (mastery >= 0 AND mastery <= 1),
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        exposure_count INTEGER NOT NULL DEFAULT 0 CHECK (exposure_count >= 0),
        last_practiced_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (learner_id, concept_id)
      );
      CREATE TABLE misconceptions (
        id TEXT PRIMARY KEY,
        concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (concept_id, description)
      );
      CREATE TABLE learner_misconceptions (
        learner_id TEXT NOT NULL DEFAULT 'local',
        misconception_id TEXT NOT NULL REFERENCES misconceptions(id) ON DELETE CASCADE,
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','uncertain')),
        last_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (learner_id, misconception_id)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS learner_concept_states;
      DROP TABLE IF EXISTS learner_misconceptions;
      DROP TABLE IF EXISTS misconceptions;
      DROP TABLE IF EXISTS learning_evidence;
      DROP TABLE IF EXISTS study_concepts;
      DROP TABLE IF EXISTS concept_relationships;
      DROP TABLE IF EXISTS concepts;
    `);
  }
}
