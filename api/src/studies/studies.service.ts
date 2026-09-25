import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyEntity } from './study.entity';

type StudyInput = {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  sources: number;
  date: string;
  notes: string;
};

function isStudy(value: unknown): value is StudyInput {
  if (!value || typeof value !== 'object') return false;
  const study = value as Partial<StudyInput>;
  return (
    typeof study.id === 'string' &&
    study.id.length > 0 &&
    typeof study.title === 'string' &&
    study.title.trim().length > 0 &&
    typeof study.description === 'string' &&
    typeof study.category === 'string' &&
    typeof study.color === 'string' &&
    Number.isInteger(study.sources) &&
    (study.sources ?? -1) >= 0 &&
    typeof study.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(study.date) &&
    !Number.isNaN(Date.parse(`${study.date}T00:00:00Z`)) &&
    typeof study.notes === 'string'
  );
}

@Injectable()
export class StudiesService {
  constructor(
    @InjectRepository(StudyEntity)
    private readonly studiesRepository: Repository<StudyEntity>,
  ) {}

  findAll() {
    return this.studiesRepository.find({
      order: { date: 'DESC', updatedAt: 'DESC' },
    });
  }

  async sync(body: unknown) {
    if (!Array.isArray(body) || body.length > 1000 || !body.every(isStudy)) {
      throw new BadRequestException('Expected up to 1000 valid studies.');
    }

    const studies = body.map((study) => ({
      id: study.id,
      title: study.title.trim(),
      description: study.description,
      category: study.category,
      color: study.color,
      sources: study.sources,
      date: study.date,
      notes: study.notes,
    }));

    if (studies.length > 0) {
      await this.studiesRepository.upsert(studies, ['id']);
    }
    return this.findAll();
  }
}
