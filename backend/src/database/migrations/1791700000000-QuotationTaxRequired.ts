import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The quotation tax % becomes required: old quotations with no tax get 0, then the column is NOT NULL (default 0).
 * To give old quotations a different rate, run backend/sql/2026-10-10-quotation-tax-required.sql instead (it has a variable for the rate).
 */
export class QuotationTaxRequired1791700000000 implements MigrationInterface {
  name = 'QuotationTaxRequired1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE `quotations` SET `tax_percentage` = 0 WHERE `tax_percentage` IS NULL');
    await queryRunner.query('ALTER TABLE `quotations` MODIFY `tax_percentage` decimal(7,4) NOT NULL DEFAULT 0');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `quotations` MODIFY `tax_percentage` decimal(7,4) NULL');
  }
}
