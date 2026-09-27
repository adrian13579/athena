import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetStudies1790460800000 implements MigrationInterface {
  name = 'ResetStudies1790460800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Intentional one-time reset. Foreign keys preserve evidence and remove study links.
    await queryRunner.query('DELETE FROM studies');
    await queryRunner.query('ALTER TABLE studies DROP COLUMN notes');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Deleted data cannot be recovered by a schema rollback.
    await queryRunner.query("ALTER TABLE studies ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  }
}
