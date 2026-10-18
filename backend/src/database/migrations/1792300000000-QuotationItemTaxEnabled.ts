import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tax moves from the company settings to each quotation item:
 *  - quotation_items.tax_enabled (checkbox) is added;
 *  - old items keep the tax they already had: tax_enabled is copied from their company's tax_enabled
 *    (or set when the item already has a percentage above 0), and tax_percentage is zeroed where tax was off;
 *  - the companies.tax_enabled / tax_percentage columns are left in place (unused) so nothing is lost.
 *
 * Safe to run after backend/sql/2026-10-18-quotation-item-tax-enabled.sql: every step checks what exists first.
 */
export class QuotationItemTaxEnabled1792300000000 implements MigrationInterface {
  name = 'QuotationItemTaxEnabled1792300000000';

  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      [table, column],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'quotation_items', 'tax_enabled')) return;
    await queryRunner.query('ALTER TABLE `quotation_items` ADD `tax_enabled` tinyint NOT NULL DEFAULT 0');
    if (await this.hasColumn(queryRunner, 'companies', 'tax_enabled')) {
      await queryRunner.query(
        'UPDATE `quotation_items` qi JOIN `quotations` q ON q.`id` = qi.`quotation_id` JOIN `companies` c ON c.`id` = q.`company_id` SET qi.`tax_enabled` = c.`tax_enabled`',
      );
    }
    await queryRunner.query('UPDATE `quotation_items` SET `tax_enabled` = 1 WHERE `tax_percentage` > 0');
    await queryRunner.query('UPDATE `quotation_items` SET `tax_percentage` = 0 WHERE `tax_enabled` = 0');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'quotation_items', 'tax_enabled')) {
      await queryRunner.query('ALTER TABLE `quotation_items` DROP COLUMN `tax_enabled`');
    }
  }
}
