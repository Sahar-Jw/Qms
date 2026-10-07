import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the audit log table and the site-wide key/value settings table (used for the colour theme). */
export class AuditLogAndThemeSettings1791500000000 implements MigrationInterface {
  name = 'AuditLogAndThemeSettings1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `audit_logs` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`user_id` int NULL, ' +
        '`user_name` varchar(190) NULL, ' +
        '`user_role` varchar(40) NULL, ' +
        '`action` varchar(40) NOT NULL, ' +
        '`entity` varchar(60) NOT NULL, ' +
        '`entity_id` varchar(40) NULL, ' +
        '`entity_label` varchar(190) NULL, ' +
        '`method` varchar(10) NOT NULL, ' +
        '`path` varchar(255) NOT NULL, ' +
        '`ip` varchar(64) NULL, ' +
        '`details` json NULL, ' +
        '`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ' +
        'INDEX `IDX_audit_logs_created_at` (`created_at`), ' +
        'INDEX `IDX_audit_logs_user_id` (`user_id`), ' +
        'PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `app_settings` (' +
        '`key` varchar(64) NOT NULL, ' +
        '`value` json NOT NULL, ' +
        '`updated_by` int NULL, ' +
        '`updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ' +
        'PRIMARY KEY (`key`)) ENGINE=InnoDB',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `app_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `audit_logs`');
  }
}
