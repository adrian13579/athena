import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudyEntity } from '../studies/study.entity';

@Entity({ name: 'concepts' })
@Index('concepts_name_domain_unique', ['name', 'domain'], { unique: true })
export class ConceptEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') name!: string;
  @Column('text', { default: '' }) description!: string;
  @Column('text', { default: '' }) domain!: string;
  @Column('integer', { default: 0 }) granularity!: number;
  @Column('text', { nullable: true, name: 'parent_id' }) parentId!: string | null;
  @ManyToOne(() => ConceptEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent!: ConceptEntity | null;
  @Column('jsonb', { default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity({ name: 'concept_relationships' })
@Check('source_id <> target_id')
export class ConceptRelationshipEntity {
  @PrimaryColumn('text', { name: 'source_id' }) sourceId!: string;
  @PrimaryColumn('text', { name: 'target_id' }) targetId!: string;
  @PrimaryColumn('text', { name: 'relationship_type' }) type!: string;
  @ManyToOne(() => ConceptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source!: ConceptEntity;
  @ManyToOne(() => ConceptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_id' })
  target!: ConceptEntity;
  @Column('real', { default: 1 }) strength!: number;
  @Column('jsonb', { default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'study_concepts' })
export class StudyConceptEntity {
  @PrimaryColumn('text', { name: 'study_id' }) studyId!: string;
  @PrimaryColumn('text', { name: 'concept_id' }) conceptId!: string;
  @ManyToOne(() => StudyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'study_id' })
  study!: StudyEntity;
  @ManyToOne(() => ConceptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concept_id' })
  concept!: ConceptEntity;
  @Column('real', { default: 0.5 }) importance!: number;
  @Column('real', { name: 'required_mastery', default: 0.8 }) requiredMastery!: number;
  @Column('integer', { name: 'sequence_hint', nullable: true }) sequenceHint!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'learning_evidence' })
@Index('learning_evidence_learner_concept_created', ['learnerId', 'conceptId', 'createdAt'])
export class LearningEvidenceEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text', { name: 'learner_id', default: 'local' }) learnerId!: string;
  @Column('text', { name: 'concept_id' }) conceptId!: string;
  @ManyToOne(() => ConceptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concept_id' })
  concept!: ConceptEntity;
  @Column('text', { name: 'study_id', nullable: true }) studyId!: string | null;
  @ManyToOne(() => StudyEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'study_id' })
  study!: StudyEntity | null;
  @Column('text', { name: 'session_id', nullable: true }) sessionId!: string | null;
  @Column('text', { name: 'activity_id', nullable: true }) activityId!: string | null;
  @Column('text', { name: 'evidence_type' }) evidenceType!: string;
  @Column('real') result!: number;
  @Column('real', { default: 0.5 }) difficulty!: number;
  @Column('real', { default: 0.5 }) confidence!: number;
  @Column('jsonb', { default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'learner_concept_states' })
export class LearnerConceptStateEntity {
  @PrimaryColumn('text', { name: 'learner_id', default: 'local' }) learnerId!: string;
  @PrimaryColumn('text', { name: 'concept_id' }) conceptId!: string;
  @ManyToOne(() => ConceptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concept_id' })
  concept!: ConceptEntity;
  @Column('real') mastery!: number;
  @Column('real') confidence!: number;
  @Column('integer', { name: 'exposure_count', default: 0 }) exposureCount!: number;
  @Column('timestamptz', { name: 'last_practiced_at', nullable: true })
  lastPracticedAt!: Date | null;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity({ name: 'misconceptions' })
@Index(['conceptId', 'description'], { unique: true })
export class MisconceptionEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text', { name: 'concept_id' }) conceptId!: string;
  @ManyToOne(() => ConceptEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concept_id' })
  concept!: ConceptEntity;
  @Column('text') description!: string;
  @Column('jsonb', { default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'learner_misconceptions' })
export class LearnerMisconceptionEntity {
  @PrimaryColumn('text', { name: 'learner_id', default: 'local' }) learnerId!: string;
  @PrimaryColumn('text', { name: 'misconception_id' }) misconceptionId!: string;
  @ManyToOne(() => MisconceptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'misconception_id' })
  misconception!: MisconceptionEntity;
  @Column('real') confidence!: number;
  @Column('text', { default: 'active' }) status!: string;
  @UpdateDateColumn({ name: 'last_observed_at', type: 'timestamptz' }) lastObservedAt!: Date;
}

export const knowledgeEntities = [
  ConceptEntity,
  ConceptRelationshipEntity,
  StudyConceptEntity,
  LearningEvidenceEntity,
  LearnerConceptStateEntity,
  MisconceptionEntity,
  LearnerMisconceptionEntity,
];
