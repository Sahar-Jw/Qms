import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuotationItemSellingPrice1792200000000 implements MigrationInterface {
  name = 'QuotationItemSellingPrice1792200000000';

  private async hasColumn(queryRunner: QueryRunner, column: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      ['quotation_items', column],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'selling_price'))) {
      await queryRunner.query('ALTER TABLE `quotation_items` ADD `selling_price` decimal(18,4) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'selling_currency'))) {
      await queryRunner.query('ALTER TABLE `quotation_items` ADD `selling_currency` varchar(3) NULL');
    }
    await queryRunner.query(
      `UPDATE \`quotation_items\` qi
         JOIN \`materials\` m ON m.id = qi.material_id
          SET qi.selling_price = COALESCE(qi.selling_price, m.selling_price),
              qi.selling_currency = COALESCE(qi.selling_currency, m.selling_currency)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['selling_currency', 'selling_price']) {
      if (await this.hasColumn(queryRunner, column)) {
        await queryRunner.query(`ALTER TABLE \`quotation_items\` DROP COLUMN \`${column}\``);
      }
    }
  }
}
