import { MigrationInterface, QueryRunner } from 'typeorm';

export class MaterialLinkAndSellingPrice1792100000000 implements MigrationInterface {
  name = 'MaterialLinkAndSellingPrice1792100000000';

  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      [table, column],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'materials', 'selling_price'))) {
      await queryRunner.query('ALTER TABLE `materials` ADD `selling_price` decimal(18,4) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'materials', 'selling_currency'))) {
      await queryRunner.query('ALTER TABLE `materials` ADD `selling_currency` varchar(3) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'materials', 'link'))) {
      await queryRunner.query('ALTER TABLE `materials` ADD `link` varchar(500) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'quotation_items', 'material_link'))) {
      await queryRunner.query('ALTER TABLE `quotation_items` ADD `material_link` varchar(500) NULL');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of [['quotation_items', 'material_link'], ['materials', 'link'], ['materials', 'selling_currency'], ['materials', 'selling_price']]) {
      if (await this.hasColumn(queryRunner, table, column)) {
        await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
      }
    }
  }
}
