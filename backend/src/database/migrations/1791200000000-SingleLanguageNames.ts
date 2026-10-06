import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Companies / customers / materials / quotation item snapshots go from *_ar + *_en to a single name column,
 * customers.phone becomes a JSON array, contact person columns are dropped.
 */
export class SingleLanguageNames1791200000000 implements MigrationInterface {
    name = 'SingleLanguageNames1791200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE \`companies\` SET \`address_ar\` = COALESCE(NULLIF(\`address_ar\`, ''), \`address_en\`)`);
        await queryRunner.query(`ALTER TABLE \`companies\` CHANGE \`name_ar\` \`name\` varchar(190) NOT NULL, CHANGE \`address_ar\` \`address\` varchar(255) NULL, DROP COLUMN \`name_en\`, DROP COLUMN \`address_en\``);
        await queryRunner.query(`UPDATE \`customers\` SET \`company_name_ar\` = COALESCE(NULLIF(\`company_name_ar\`, ''), \`company_name_en\`)`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`company_name_ar\` \`company_name\` varchar(190) NULL, DROP COLUMN \`company_name_en\`, DROP COLUMN \`contact_person_name\`, DROP COLUMN \`contact_person_phone\`, MODIFY \`phone\` TEXT NULL`);
        await queryRunner.query(`UPDATE \`customers\` SET \`phone\` = NULL WHERE \`phone\` = ''`);
        await queryRunner.query(`UPDATE \`customers\` SET \`phone\` = JSON_ARRAY(\`phone\`) WHERE \`phone\` IS NOT NULL`);
        await queryRunner.query(`UPDATE \`materials\` SET \`name_ar\` = COALESCE(NULLIF(\`name_ar\`, ''), \`name_en\`)`);
        await queryRunner.query(`ALTER TABLE \`materials\` CHANGE \`name_ar\` \`name\` varchar(255) NULL, DROP COLUMN \`name_en\``);
        await queryRunner.query(`UPDATE \`quotation_items\` SET \`material_name_ar\` = COALESCE(NULLIF(\`material_name_ar\`, ''), \`material_name_en\`)`);
        await queryRunner.query(`ALTER TABLE \`quotation_items\` CHANGE \`material_name_ar\` \`material_name\` varchar(255) NULL, DROP COLUMN \`material_name_en\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`quotation_items\` CHANGE \`material_name\` \`material_name_ar\` varchar(255) NULL, ADD \`material_name_en\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`materials\` CHANGE \`name\` \`name_ar\` varchar(255) NULL, ADD \`name_en\` varchar(255) NULL`);
        await queryRunner.query(`UPDATE \`customers\` SET \`phone\` = JSON_UNQUOTE(JSON_EXTRACT(\`phone\`, '$[0]')) WHERE \`phone\` IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` MODIFY \`phone\` varchar(60) NULL, CHANGE \`company_name\` \`company_name_ar\` varchar(190) NULL, ADD \`company_name_en\` varchar(190) NULL, ADD \`contact_person_name\` varchar(150) NULL, ADD \`contact_person_phone\` varchar(60) NULL`);
        await queryRunner.query(`ALTER TABLE \`companies\` CHANGE \`name\` \`name_ar\` varchar(190) NOT NULL, CHANGE \`address\` \`address_ar\` varchar(255) NULL, ADD \`name_en\` varchar(190) NULL, ADD \`address_en\` varchar(255) NULL`);
    }
}
