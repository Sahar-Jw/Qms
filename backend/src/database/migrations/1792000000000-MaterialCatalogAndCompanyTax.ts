import { MigrationInterface, QueryRunner } from 'typeorm';

export class MaterialCatalogAndCompanyTax1792000000000 implements MigrationInterface {
  name = 'MaterialCatalogAndCompanyTax1792000000000';

  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      [table, column],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasCatalogue = await this.hasColumn(queryRunner, 'materials', 'catalogue');
    const hasImg = await this.hasColumn(queryRunner, 'materials', 'img');
    if (hasCatalogue && !hasImg) {
      await queryRunner.query('ALTER TABLE `materials` CHANGE `catalogue` `img` varchar(150) NULL');
    } else if (hasCatalogue && hasImg) {
      await queryRunner.query('UPDATE `materials` SET `img` = COALESCE(`img`, `catalogue`) WHERE `catalogue` IS NOT NULL');
      await queryRunner.query('ALTER TABLE `materials` DROP COLUMN `catalogue`');
    } else if (!hasImg) {
      await queryRunner.query('ALTER TABLE `materials` ADD `img` varchar(150) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'materials', 'catalog'))) {
      await queryRunner.query('ALTER TABLE `materials` ADD `catalog` json NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'companies', 'tax_enabled'))) {
      await queryRunner.query('ALTER TABLE `companies` ADD `tax_enabled` tinyint NOT NULL DEFAULT 0');
    }
    if (!(await this.hasColumn(queryRunner, 'companies', 'tax_percentage'))) {
      await queryRunner.query('ALTER TABLE `companies` ADD `tax_percentage` decimal(7,4) NULL');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['tax_percentage', 'tax_enabled']) {
      if (await this.hasColumn(queryRunner, 'companies', column)) {
        await queryRunner.query(`ALTER TABLE \`companies\` DROP COLUMN \`${column}\``);
      }
    }
    if (await this.hasColumn(queryRunner, 'materials', 'catalog')) {
      await queryRunner.query('ALTER TABLE `materials` DROP COLUMN `catalog`');
    }
    if (await this.hasColumn(queryRunner, 'materials', 'img') && !(await this.hasColumn(queryRunner, 'materials', 'catalogue'))) {
      await queryRunner.query('ALTER TABLE `materials` CHANGE `img` `catalogue` varchar(150) NULL');
    }
  }
}
