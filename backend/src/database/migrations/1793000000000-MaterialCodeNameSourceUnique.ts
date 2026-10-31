import { MigrationInterface, QueryRunner } from 'typeorm';

export class MaterialCodeNameSourceUnique1793000000000 implements MigrationInterface {
  name = 'MaterialCodeNameSourceUnique1793000000000';

  private async hasIndex(queryRunner: QueryRunner, indexName: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`STATISTICS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `INDEX_NAME` = ? LIMIT 1',
      ['materials', indexName],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, 'UQ_materials_material_code_name')) {
      await queryRunner.query('ALTER TABLE `materials` DROP INDEX `UQ_materials_material_code_name`');
    }
    if (!(await this.hasIndex(queryRunner, 'UQ_materials_material_code_name_source'))) {
      await queryRunner.query('CREATE UNIQUE INDEX `UQ_materials_material_code_name_source` ON `materials` (`material_code`, `name`, `source`)');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, 'UQ_materials_material_code_name_source')) {
      await queryRunner.query('ALTER TABLE `materials` DROP INDEX `UQ_materials_material_code_name_source`');
    }
    if (!(await this.hasIndex(queryRunner, 'UQ_materials_material_code_name'))) {
      await queryRunner.query('CREATE UNIQUE INDEX `UQ_materials_material_code_name` ON `materials` (`material_code`, `name`)');
    }
  }
}
