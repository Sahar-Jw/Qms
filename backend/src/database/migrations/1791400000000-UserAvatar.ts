import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatar1791400000000 implements MigrationInterface {
  name = 'UserAvatar1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'",
    );
    if (!has.length) await queryRunner.query('ALTER TABLE `users` ADD `avatar` varchar(255) NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `avatar`');
  }
}
