import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudyLearningGoals1790812800000 implements MigrationInterface {
  name = 'AddStudyLearningGoals1790812800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE studies
      ADD COLUMN learning_goals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE studies DROP COLUMN learning_goals');
  }
}
