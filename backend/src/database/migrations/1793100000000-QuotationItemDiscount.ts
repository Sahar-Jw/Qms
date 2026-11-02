import { MigrationInterface, QueryRunner } from 'typeorm';

/** quotation_items.discount: amount deducted from the line value (quantity x selling price), in the selling currency. 0 = no discount. */
export class QuotationItemDiscount1793100000000 implements MigrationInterface {
  name = 'QuotationItemDiscount1793100000000';

  private async hasColumn(queryRunner: QueryRunner): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      ['quotation_items', 'discount'],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner))) {
      await queryRunner.query('ALTER TABLE `quotation_items` ADD `discount` decimal(18,4) NOT NULL DEFAULT 0');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner)) {
      await queryRunner.query('ALTER TABLE `quotation_items` DROP COLUMN `discount`');
    }
  }
}
