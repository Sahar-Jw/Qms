import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The tax % moves from the quotation to each of its items (البنود).
 * Every old item gets the tax its quotation had (0 when it had none), then the quotation column is dropped.
 */
export class QuotationTaxOnItems1791800000000 implements MigrationInterface {
  name = 'QuotationTaxOnItems1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `quotation_items` ADD `tax_percentage` decimal(7,4) NOT NULL DEFAULT 0');
    await queryRunner.query(
      'UPDATE `quotation_items` qi JOIN `quotations` q ON q.`id` = qi.`quotation_id` SET qi.`tax_percentage` = COALESCE(q.`tax_percentage`, 0)',
    );
    await queryRunner.query('ALTER TABLE `quotations` DROP COLUMN `tax_percentage`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `quotations` ADD `tax_percentage` decimal(7,4) NOT NULL DEFAULT 0');
    await queryRunner.query(
      'UPDATE `quotations` q SET q.`tax_percentage` = COALESCE((SELECT MAX(qi.`tax_percentage`) FROM `quotation_items` qi WHERE qi.`quotation_id` = q.`id`), 0)',
    );
    await queryRunner.query('ALTER TABLE `quotation_items` DROP COLUMN `tax_percentage`');
  }
}
