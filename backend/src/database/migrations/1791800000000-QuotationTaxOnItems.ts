import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The tax % moves from the quotation to each of its items (البنود).
 * Every old item gets the tax its quotation had (0 when it had none), then the quotation column is dropped.
 *
 * Safe to run on a database where the SQL script (backend/sql/2026-10-10-tax-on-items.sql) was already run by hand:
 * every step first checks what already exists, and old quotation taxes are copied only when the item column is created here.
 */
export class QuotationTaxOnItems1791800000000 implements MigrationInterface {
  name = 'QuotationTaxOnItems1791800000000';

  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      [table, column],
    );
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const itemColumn = await this.hasColumn(queryRunner, 'quotation_items', 'tax_percentage');
    const headerColumn = await this.hasColumn(queryRunner, 'quotations', 'tax_percentage');

    if (!itemColumn) {
      await queryRunner.query('ALTER TABLE `quotation_items` ADD `tax_percentage` decimal(7,4) NOT NULL DEFAULT 0');
      if (headerColumn) {
        await queryRunner.query(
          'UPDATE `quotation_items` qi JOIN `quotations` q ON q.`id` = qi.`quotation_id` SET qi.`tax_percentage` = COALESCE(q.`tax_percentage`, 0)',
        );
      }
    }
    if (headerColumn) {
      await queryRunner.query('ALTER TABLE `quotations` DROP COLUMN `tax_percentage`');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'quotations', 'tax_percentage'))) {
      await queryRunner.query('ALTER TABLE `quotations` ADD `tax_percentage` decimal(7,4) NOT NULL DEFAULT 0');
      if (await this.hasColumn(queryRunner, 'quotation_items', 'tax_percentage')) {
        await queryRunner.query(
          'UPDATE `quotations` q SET q.`tax_percentage` = COALESCE((SELECT MAX(qi.`tax_percentage`) FROM `quotation_items` qi WHERE qi.`quotation_id` = q.`id`), 0)',
        );
      }
    }
    if (await this.hasColumn(queryRunner, 'quotation_items', 'tax_percentage')) {
      await queryRunner.query('ALTER TABLE `quotation_items` DROP COLUMN `tax_percentage`');
    }
  }
}
