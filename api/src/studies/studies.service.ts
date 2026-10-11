import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyEntity } from './study.entity.js';

function parseStudy(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Expected a study.');
  const body = input as Record<string, unknown>;
  const learningGoals = body.learningGoals === undefined ? [] : body.learningGoals;
  if (
    typeof body.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ||
    typeof body.title !== 'string' ||
    !body.title.trim() ||
    body.title.length > 90 ||
    typeof body.description !== 'string' ||
    body.description.length > 220 ||
    !Array.isArray(learningGoals) ||
    learningGoals.length > 10 ||
    learningGoals.some(
      (goal) => typeof goal !== 'string' || !goal.trim() || goal.trim().length > 180,
    ) ||
    typeof body.color !== 'string' ||
    !['lavender', 'green', 'peach', 'blue', 'pink'].includes(body.color) ||
    Object.keys(body).some(
      (key) => !['id', 'title', 'description', 'learningGoals', 'color'].includes(key),
    )
  )
    throw new BadRequestException(
      'Expected a UUID, title (1-90 characters), description (up to 220 characters), up to 10 learning goals (180 characters each), and a supported color.',
    );
  return {
    id: body.id.toLowerCase(),
    title: body.title.trim(),
    description: body.description.trim(),
    learningGoals: (learningGoals as string[]).map((goal) => goal.trim()),
    color: body.color,
  };
}

@Injectable()
export class StudiesService {
  constructor(
    @InjectRepository(StudyEntity) private readonly studiesRepository: Repository<StudyEntity>,
  ) {}

  findAll() {
    return this.studiesRepository.find({ order: { date: 'DESC', id: 'ASC' } });
  }

  async create(input: unknown) {
    const study = parseStudy(input);
    // Insert-only writes make retries safe, including concurrent requests.
    await this.studiesRepository
      .createQueryBuilder()
      .insert()
      .values({
        ...study,
        category: 'Personal',
        sources: 0,
        date: new Date().toISOString().slice(0, 10),
      })
      .orIgnore()
      .execute();
    const saved = await this.studiesRepository.findOneByOrFail({ id: study.id });
    if (
      saved.title !== study.title ||
      saved.description !== study.description ||
      JSON.stringify(saved.learningGoals) !== JSON.stringify(study.learningGoals) ||
      saved.color !== study.color
    ) {
      throw new ConflictException('This study ID already belongs to a different study.');
    }
    return saved;
  }
}
