import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResets1791300000000 implements MigrationInterface {
  name = 'PasswordResets1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `password_resets` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`user_id` int NOT NULL, ' +
        '`token_hash` char(64) NOT NULL, ' +
        '`expires_at` datetime NOT NULL, ' +
        '`used_at` datetime NULL, ' +
        '`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ' +
        'UNIQUE INDEX `IDX_password_resets_token_hash` (`token_hash`), ' +
        'INDEX `IDX_password_resets_user_id` (`user_id`), ' +
        'PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    // Skip when the table + FK were already created by hand from password_resets.sql
    const fk = await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets' AND CONSTRAINT_NAME = 'FK_password_resets_user'",
    );
    if (fk.length) return;
    await queryRunner.query(
      'ALTER TABLE `password_resets` ADD CONSTRAINT `FK_password_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `password_resets` DROP FOREIGN KEY `FK_password_resets_user`');
    await queryRunner.query('DROP TABLE `password_resets`');
  }
}
