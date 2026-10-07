import { MigrationInterface, QueryRunner } from 'typeorm';

/** Editable UI texts (Settings > Texts): one row per overridden i18n key. */
export class TranslationOverrides1791600000000 implements MigrationInterface {
  name = 'TranslationOverrides1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `translation_overrides` (' +
        '`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ' +
        '`updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ' +
        '`created_by` int NULL, ' +
        '`updated_by` int NULL, ' +
        '`key` varchar(190) NOT NULL, ' +
        '`ar` text NULL, ' +
        '`en` text NULL, ' +
        'PRIMARY KEY (`key`)) ENGINE=InnoDB',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `translation_overrides`');
  }
}
