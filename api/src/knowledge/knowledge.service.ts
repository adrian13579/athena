import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import {
  ConceptEntity,
  ConceptRelationshipEntity,
  LearnerConceptStateEntity,
  LearnerMisconceptionEntity,
  LearningEvidenceEntity,
  MisconceptionEntity,
  StudyConceptEntity,
} from './knowledge.entities';
import { StudyEntity } from '../studies/study.entity';

const relationshipTypes = [
  'PREREQUISITE',
  'PART_OF',
  'BUILDS_ON',
  'RELATED_TO',
  'CONTRASTS_WITH',
  'APPLIES',
  'GENERALIZES',
  'SPECIALIZES',
];

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Expected a JSON object.');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim())) {
    throw new BadRequestException(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function score(value: unknown, field: string, fallback?: number): number {
  const result = value === undefined && fallback !== undefined ? fallback : value;
  if (typeof result !== 'number' || !Number.isFinite(result) || result < 0 || result > 1) {
    throw new BadRequestException(`${field} must be between 0 and 1.`);
  }
  return result;
}

function metadata(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('metadata must be an object.');
  }
  return value as Record<string, unknown>;
}

function entityId(value: unknown): string {
  return typeof value === 'string' && value ? value : randomUUID();
}

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(ConceptEntity) private readonly concepts: Repository<ConceptEntity>,
    @InjectRepository(ConceptRelationshipEntity)
    private readonly relationships: Repository<ConceptRelationshipEntity>,
    @InjectRepository(StudyConceptEntity)
    private readonly studyConcepts: Repository<StudyConceptEntity>,
    @InjectRepository(LearningEvidenceEntity)
    private readonly evidence: Repository<LearningEvidenceEntity>,
    @InjectRepository(LearnerConceptStateEntity)
    private readonly learnerStates: Repository<LearnerConceptStateEntity>,
    @InjectRepository(MisconceptionEntity)
    private readonly misconceptions: Repository<MisconceptionEntity>,
    @InjectRepository(LearnerMisconceptionEntity)
    private readonly learnerMisconceptions: Repository<LearnerMisconceptionEntity>,
  ) {}

  listConcepts() {
    return this.concepts.find({
      relations: { parent: true },
      order: { domain: 'ASC', name: 'ASC' },
    });
  }

  async createConcept(input: unknown) {
    const body = record(input);
    const granularity = body.granularity ?? 0;
    if (!Number.isInteger(granularity) || (granularity as number) < 0) {
      throw new BadRequestException('granularity must be a non-negative integer.');
    }
    return this.concepts.save(
      this.concepts.create({
        id: entityId(body.id),
        name: text(body.name, 'name'),
        description: text(body.description ?? '', 'description', false),
        domain: text(body.domain ?? '', 'domain', false),
        granularity: granularity as number,
        parentId: body.parentId == null ? null : text(body.parentId, 'parentId'),
        metadata: metadata(body.metadata),
      }),
    );
  }

  async getGraph(studyId?: string) {
    let concepts: ConceptEntity[];
    if (studyId) {
      const links = await this.studyConcepts.find({
        where: { studyId },
        relations: { concept: true },
      });
      links.sort((a, b) => (a.sequenceHint ?? Infinity) - (b.sequenceHint ?? Infinity));
      concepts = links.map((link) => link.concept);
    } else {
      concepts = await this.concepts.find({ order: { domain: 'ASC', name: 'ASC' } });
    }
    const conceptIds = concepts.map((concept) => concept.id);
    const relationships = conceptIds.length
      ? await this.relationships.find({
          where: { sourceId: In(conceptIds), targetId: In(conceptIds) },
          order: { type: 'ASC', sourceId: 'ASC' },
        })
      : [];
    const links =
      studyId && conceptIds.length
        ? await this.studyConcepts.findBy({ studyId, conceptId: In(conceptIds) })
        : [];
    const linksByConcept = new Map(links.map((link) => [link.conceptId, link]));
    return {
      concepts: concepts.map((concept) => {
        const link = linksByConcept.get(concept.id);
        return link
          ? {
              ...concept,
              importance: link.importance,
              requiredMastery: link.requiredMastery,
              sequenceHint: link.sequenceHint,
            }
          : concept;
      }),
      relationships,
    };
  }

  async addRelationship(input: unknown) {
    const body = record(input);
    const type = text(body.type, 'type').toUpperCase();
    if (!relationshipTypes.includes(type)) {
      throw new BadRequestException(`type must be one of ${relationshipTypes.join(', ')}.`);
    }
    return this.relationships.save(
      this.relationships.create({
        sourceId: text(body.sourceId, 'sourceId'),
        targetId: text(body.targetId, 'targetId'),
        type,
        strength: score(body.strength, 'strength', 1),
        metadata: metadata(body.metadata),
      }),
    );
  }

  async setStudyConcepts(studyId: string, input: unknown) {
    const body = record(input);
    if (!Array.isArray(body.concepts) || body.concepts.length > 500) {
      throw new BadRequestException('concepts must be an array with at most 500 entries.');
    }
    const entries = body.concepts.map((item) => {
      const concept = record(item);
      const sequenceHint = concept.sequenceHint ?? null;
      if (
        sequenceHint !== null &&
        (!Number.isInteger(sequenceHint) || (sequenceHint as number) < 0)
      ) {
        throw new BadRequestException('sequenceHint must be a non-negative integer.');
      }
      return {
        conceptId: text(concept.conceptId, 'conceptId'),
        importance: score(concept.importance, 'importance', 0.5),
        requiredMastery: score(concept.requiredMastery, 'requiredMastery', 0.8),
        sequenceHint: sequenceHint as number | null,
      };
    });
    const conceptIds = entries.map((entry) => entry.conceptId);
    if (new Set(conceptIds).size !== conceptIds.length) {
      throw new BadRequestException('A concept can only appear once per study.');
    }

    return this.studyConcepts.manager.transaction(async (manager) => {
      const studyRepository = manager.getRepository(StudyEntity);
      const conceptRepository = manager.getRepository(ConceptEntity);
      const linkRepository = manager.getRepository(StudyConceptEntity);
      if (!(await studyRepository.existsBy({ id: studyId })))
        throw new NotFoundException('Study not found.');
      const found = conceptIds.length ? await conceptRepository.findBy({ id: In(conceptIds) }) : [];
      if (found.length !== conceptIds.length)
        throw new NotFoundException('One or more concepts were not found.');

      const existing = await linkRepository.findBy({ studyId });
      const wanted = new Set(conceptIds);
      await linkRepository.remove(existing.filter((link) => !wanted.has(link.conceptId)));
      if (entries.length) {
        await linkRepository.save(
          entries.map((entry) => linkRepository.create({ studyId, ...entry })),
        );
      }
      return linkRepository.find({
        where: { studyId },
        relations: { concept: true },
        order: { sequenceHint: 'ASC' },
      });
    });
  }

  async recordEvidence(input: unknown) {
    const body = record(input);
    const learnerId = text(body.learnerId ?? 'local', 'learnerId');
    const conceptId = text(body.conceptId, 'conceptId');
    const result = score(body.result, 'result');
    const confidence = score(body.confidence, 'confidence', 0.5);
    const evidence = this.evidence.create({
      id: entityId(body.id),
      learnerId,
      conceptId,
      studyId: body.studyId == null ? null : text(body.studyId, 'studyId'),
      sessionId: body.sessionId == null ? null : text(body.sessionId, 'sessionId'),
      activityId: body.activityId == null ? null : text(body.activityId, 'activityId'),
      evidenceType: text(body.evidenceType, 'evidenceType'),
      result,
      difficulty: score(body.difficulty, 'difficulty', 0.5),
      confidence,
      metadata: metadata(body.metadata),
    });

    return this.evidence.manager.transaction(async (manager) => {
      const evidenceRepository = manager.getRepository(LearningEvidenceEntity);
      const stateRepository = manager.getRepository(LearnerConceptStateEntity);
      await evidenceRepository.save(evidence);
      const history = await evidenceRepository.find({ where: { learnerId, conceptId } });
      const mastery = history.reduce((total, item) => total + item.result, 0) / history.length;
      const averageConfidence =
        history.reduce((total, item) => total + item.confidence, 0) / history.length;
      const lastPracticedAt = history.reduce(
        (latest, item) => (item.createdAt > latest ? item.createdAt : latest),
        history[0].createdAt,
      );
      await stateRepository.save(
        stateRepository.create({
          learnerId,
          conceptId,
          mastery,
          confidence: averageConfidence,
          exposureCount: history.length,
          lastPracticedAt,
        }),
      );
      return {
        id: evidence.id,
        learnerId,
        conceptId,
        result,
        difficulty: evidence.difficulty,
        confidence,
      };
    });
  }

  getLearnerStates(learnerId = 'local') {
    return this.learnerStates.find({
      where: { learnerId },
      relations: { concept: true },
      order: { concept: { domain: 'ASC', name: 'ASC' } },
    });
  }

  async createMisconception(input: unknown) {
    const body = record(input);
    return this.misconceptions.save(
      this.misconceptions.create({
        id: entityId(body.id),
        conceptId: text(body.conceptId, 'conceptId'),
        description: text(body.description, 'description'),
        metadata: metadata(body.metadata),
      }),
    );
  }

  listMisconceptions(learnerId?: string) {
    return this.misconceptions
      .createQueryBuilder('misconception')
      .leftJoinAndMapOne(
        'misconception.learnerState',
        LearnerMisconceptionEntity,
        'learnerState',
        'learnerState.misconceptionId = misconception.id AND learnerState.learnerId = :learnerId',
        { learnerId: learnerId ?? 'local' },
      )
      .orderBy('misconception.createdAt', 'DESC')
      .getMany();
  }

  async recordMisconception(input: unknown) {
    const body = record(input);
    const status = text(body.status ?? 'active', 'status');
    if (!['active', 'resolved', 'uncertain'].includes(status)) {
      throw new BadRequestException('status must be active, resolved, or uncertain.');
    }
    return this.learnerMisconceptions.save(
      this.learnerMisconceptions.create({
        learnerId: text(body.learnerId ?? 'local', 'learnerId'),
        misconceptionId: text(body.misconceptionId, 'misconceptionId'),
        confidence: score(body.confidence, 'confidence', 0.5),
        status,
      }),
    );
  }
}
