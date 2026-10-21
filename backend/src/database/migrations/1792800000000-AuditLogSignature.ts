import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * audit_logs.signature: an HMAC of each row (see AuditService.sign), so a row edited directly in the database can be found.
 * Existing rows stay NULL ("unsigned"). Safe to run twice: the column is added only when it does not exist yet.
 */
export class AuditLogSignature1792800000000 implements MigrationInterface {
  name = 'AuditLogSignature1792800000000';

  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = await queryRunner.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND column_name = 'signature' LIMIT 1",
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.exists(queryRunner))) {
      await queryRunner.query('ALTER TABLE `audit_logs` ADD `signature` varchar(64) NULL');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) {
      await queryRunner.query('ALTER TABLE `audit_logs` DROP COLUMN `signature`');
    }
  }
}
