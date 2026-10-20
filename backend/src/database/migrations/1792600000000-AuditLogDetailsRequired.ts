import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * audit_logs.details becomes NOT NULL: the whole point of the log is to show what happened.
 * Old rows without details first get the request / record / IP the row still knows, then the column is tightened.
 * Safe to run twice (the UPDATE only touches empty rows, MODIFY to the same definition changes nothing).
 */
export class AuditLogDetailsRequired1792600000000 implements MigrationInterface {
  name = 'AuditLogDetailsRequired1792600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE `audit_logs` SET `details` = JSON_MERGE_PATCH(' +
        "JSON_OBJECT('request', CONCAT(`method`, ' ', `path`)), " +
        "JSON_OBJECT('record', `entity_label`, 'recordId', `entity_id`)) " +
        "WHERE `details` IS NULL OR JSON_TYPE(`details`) = 'NULL' OR (JSON_TYPE(`details`) = 'OBJECT' AND JSON_LENGTH(`details`) = 0)",
    );
    await queryRunner.query('ALTER TABLE `audit_logs` MODIFY `details` json NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `audit_logs` MODIFY `details` json NULL');
  }
}
