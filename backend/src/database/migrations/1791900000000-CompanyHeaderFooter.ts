import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Companies get a print header and footer (the same in Arabic and English files).
 * They are printed on the quotation's print page and PDF.
 *
 * Safe to run on a database where the SQL script (backend/sql/2026-10-11-company-header-footer.sql) was already run by hand:
 * each column is added only if it does not exist yet.
 */
export class CompanyHeaderFooter1791900000000 implements MigrationInterface {
  name = 'CompanyHeaderFooter1791900000000';

  private readonly columns = ['header', 'footer'];

  private async hasColumn(queryRunner: QueryRunner, column: string): Promise<boolean> {
    const rows: unknown[] = await queryRunner.query(
      'SELECT 1 FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ? LIMIT 1',
      ['companies', column],
    );
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const c of this.columns) {
      if (!(await this.hasColumn(queryRunner, c))) await queryRunner.query(`ALTER TABLE \`companies\` ADD \`${c}\` text NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const c of this.columns) {
      if (await this.hasColumn(queryRunner, c)) await queryRunner.query(`ALTER TABLE \`companies\` DROP COLUMN \`${c}\``);
    }
  }
}
