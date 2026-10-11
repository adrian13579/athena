import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'studies' })
export class StudyEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ name: 'learning_goals', type: 'text', array: true, default: () => "ARRAY[]::TEXT[]" })
  learningGoals!: string[];

  @Column({ type: 'text', default: 'Personal' })
  category!: string;

  @Column({ type: 'text', default: 'black' })
  color!: string;

  @Column({ type: 'integer', default: 0 })
  sources!: number;

  @Column({ name: 'study_date', type: 'date' })
  date!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
