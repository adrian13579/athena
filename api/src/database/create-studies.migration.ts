import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudies1790294400000 implements MigrationInterface {
  name = 'CreateStudies1790294400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS studies (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Personal',
        color TEXT NOT NULL DEFAULT 'black',
        sources INTEGER NOT NULL DEFAULT 0 CHECK (sources >= 0),
        study_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS studies');
  }
}
