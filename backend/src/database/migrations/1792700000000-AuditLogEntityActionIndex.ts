import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Index for the audit log filters (record type + action). Without it every filtered list scans the whole table, which only
 * grows. Safe to run twice: the index is created only when it does not exist yet.
 */
export class AuditLogEntityActionIndex1792700000000 implements MigrationInterface {
  name = 'AuditLogEntityActionIndex1792700000000';

  private async exists(queryRunner: QueryRunner): Promise<boolean> {
    const rows = await queryRunner.query(
      "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'IDX_audit_logs_entity_action' LIMIT 1",
    );
    return rows.length > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.exists(queryRunner))) {
      await queryRunner.query('CREATE INDEX `IDX_audit_logs_entity_action` ON `audit_logs` (`entity`, `action`)');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.exists(queryRunner)) {
      await queryRunner.query('DROP INDEX `IDX_audit_logs_entity_action` ON `audit_logs`');
    }
  }
}
