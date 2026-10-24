import { MigrationInterface, QueryRunner } from 'typeorm';

export class MaterialCodeAndNameUnique1792900000000 implements MigrationInterface {
  name = 'MaterialCodeAndNameUnique1792900000000';

  private async hasIndex(queryRunner: QueryRunner, indexName: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`STATISTICS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `INDEX_NAME` = ? LIMIT 1',
      ['materials', indexName],
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, 'IDX_180eec59d9027e95b2467ec66f')) {
      await queryRunner.query('ALTER TABLE `materials` DROP INDEX `IDX_180eec59d9027e95b2467ec66f`');
    }
    if (!(await this.hasIndex(queryRunner, 'UQ_materials_material_code_name'))) {
      await queryRunner.query('CREATE UNIQUE INDEX `UQ_materials_material_code_name` ON `materials` (`material_code`, `name`)');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, 'UQ_materials_material_code_name')) {
      await queryRunner.query('ALTER TABLE `materials` DROP INDEX `UQ_materials_material_code_name`');
    }
    if (!(await this.hasIndex(queryRunner, 'IDX_180eec59d9027e95b2467ec66f'))) {
      await queryRunner.query('CREATE UNIQUE INDEX `IDX_180eec59d9027e95b2467ec66f` ON `materials` (`material_code`)');
    }
  }
}
