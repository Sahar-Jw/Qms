import { MigrationInterface, QueryRunner } from "typeorm";

/** validity / delivery_time become real DATE columns. Old free-text values that are not valid dates are cleared. */
export class QuotationDatesAsDate1791100000000 implements MigrationInterface {
    name = 'QuotationDatesAsDate1791100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE \`quotations\` SET \`validity\` = NULL WHERE \`validity\` IS NOT NULL AND (\`validity\` NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR STR_TO_DATE(\`validity\`, '%Y-%m-%d') IS NULL)`);
        await queryRunner.query(`UPDATE \`quotations\` SET \`delivery_time\` = NULL WHERE \`delivery_time\` IS NOT NULL AND (\`delivery_time\` NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR STR_TO_DATE(\`delivery_time\`, '%Y-%m-%d') IS NULL)`);
        await queryRunner.query(`ALTER TABLE \`quotations\` MODIFY \`validity\` DATE NULL, MODIFY \`delivery_time\` DATE NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`quotations\` MODIFY \`validity\` varchar(100) NULL, MODIFY \`delivery_time\` varchar(100) NULL`);
    }
}
