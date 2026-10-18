import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catalog file upload size (Settings > Files): writes the starting value (10 MB) into the site-wide settings table.
 * No table or column changes. It never overwrites a value a manager already saved, and the app works the same without it
 * (a missing row means 10 MB). Safe to run after backend/sql/2026-10-18-catalog-upload-size-setting.sql.
 */
export class CatalogUploadSizeSetting1792400000000 implements MigrationInterface {
  name = 'CatalogUploadSizeSetting1792400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "INSERT INTO `app_settings` (`key`, `value`) VALUES ('catalog', '{\"maxFileSizeMb\":10}') ON DUPLICATE KEY UPDATE `key` = `key`",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM `app_settings` WHERE `key` = 'catalog'");
  }
}
