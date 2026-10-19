import { MigrationInterface, QueryRunner } from 'typeorm';

/** quotation_items.item_cost: the per-unit "الكلفة" typed on a quotation line (nullable, never printed). */
export class QuotationItemCost1792500000000 implements MigrationInterface {
  name = 'QuotationItemCost1792500000000';

  private async hasColumn(queryRunner: QueryRunner): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      ['quotation_items', 'item_cost'],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner))) {
      await queryRunner.query('ALTER TABLE `quotation_items` ADD `item_cost` decimal(18,4) NULL');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner)) {
      await queryRunner.query('ALTER TABLE `quotation_items` DROP COLUMN `item_cost`');
    }
  }
}
