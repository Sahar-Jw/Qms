import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790990641372 implements MigrationInterface {
    name = 'InitialSchema1790990641372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`companies\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` int NULL, \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`name_ar\` varchar(190) NOT NULL, \`name_en\` varchar(190) NULL, \`logo\` varchar(255) NULL, \`address_ar\` varchar(255) NULL, \`address_en\` varchar(255) NULL, \`phone\` varchar(60) NULL, \`email\` varchar(150) NULL, \`website\` varchar(150) NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`roles\` (\`id\` int NOT NULL AUTO_INCREMENT, \`code\` varchar(30) NOT NULL, \`name_ar\` varchar(100) NOT NULL, \`name_en\` varchar(100) NOT NULL, UNIQUE INDEX \`IDX_f6d54f95c31b73fb1bdd8e91d0\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`full_name\` varchar(150) NOT NULL, \`email\` varchar(190) NOT NULL, \`phone\` varchar(40) NULL, \`password_hash\` varchar(100) NOT NULL, \`issuing_company_id\` int NULL, \`is_active\` tinyint NOT NULL DEFAULT 0, \`failed_attempts\` int NOT NULL DEFAULT '0', \`locked_until\` datetime NULL, \`last_login_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`role_id\` int NOT NULL, UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sequences\` (\`name\` varchar(50) NOT NULL, \`value\` int NOT NULL DEFAULT '0', PRIMARY KEY (\`name\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`customers\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` int NULL, \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`company_name_ar\` varchar(190) NULL, \`company_name_en\` varchar(190) NULL, \`email\` varchar(150) NULL, \`phone\` varchar(60) NULL, \`country\` varchar(100) NULL, \`website\` varchar(150) NULL, \`manager_name\` varchar(150) NULL, \`contact_person_name\` varchar(150) NULL, \`contact_person_phone\` varchar(60) NULL, \`business_nature\` varchar(190) NULL, \`notes\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, INDEX \`IDX_524dd5fe721ad9e3745950dbba\` (\`company_name_ar\`), INDEX \`IDX_fc94817fe1d433925a0b140008\` (\`company_name_en\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`materials\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` int NULL, \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`material_code\` varchar(60) NOT NULL, \`name_ar\` varchar(255) NULL, \`name_en\` varchar(255) NULL, \`source\` varchar(150) NULL, \`stock_quantity\` decimal(18,3) NOT NULL DEFAULT '0.000', \`unit_price\` decimal(18,4) NOT NULL DEFAULT '0.0000', \`unit\` varchar(30) NULL, \`currency\` varchar(3) NULL, \`country_of_origin\` varchar(100) NULL, \`catalogue\` varchar(150) NULL, \`model_number\` varchar(100) NULL, \`catalogue_number\` varchar(100) NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, INDEX \`IDX_2775677df7f99481e09aa24b4d\` (\`name_ar\`), INDEX \`IDX_7776e12ada07b5d821c19ce5c7\` (\`name_en\`), UNIQUE INDEX \`IDX_180eec59d9027e95b2467ec66f\` (\`material_code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`quotation_item_amounts\` (\`id\` int NOT NULL AUTO_INCREMENT, \`item_id\` int NOT NULL, \`currency\` varchar(3) NOT NULL, \`value\` decimal(18,4) NOT NULL DEFAULT '0.0000', \`cost\` decimal(18,4) NOT NULL DEFAULT '0.0000', \`shipping\` decimal(18,4) NOT NULL DEFAULT '0.0000', \`customs\` decimal(18,4) NOT NULL DEFAULT '0.0000', \`required\` decimal(18,4) NOT NULL DEFAULT '0.0000', UNIQUE INDEX \`IDX_e2adedc6fd5992231393a5d845\` (\`item_id\`, \`currency\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`quotation_items\` (\`id\` int NOT NULL AUTO_INCREMENT, \`quotation_id\` int NOT NULL, \`material_id\` int NULL, \`material_code\` varchar(60) NOT NULL, \`material_name_ar\` varchar(255) NULL, \`material_name_en\` varchar(255) NULL, \`unit\` varchar(30) NULL, \`sort_order\` int NOT NULL DEFAULT '0', \`quantity\` decimal(18,4) NOT NULL, \`unit_price\` decimal(18,4) NOT NULL, \`price_currency\` varchar(3) NOT NULL, \`unit_cost\` decimal(18,4) NULL, \`cost_currency\` varchar(3) NULL, \`shipping_cost\` decimal(18,4) NULL, \`shipping_currency\` varchar(3) NULL, \`customs_cost\` decimal(18,4) NULL, \`customs_currency\` varchar(3) NULL, \`commission_percentage\` decimal(7,4) NULL, \`notes\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`quotations\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` int NULL, \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`quotation_number\` varchar(30) NOT NULL, \`quotation_date\` date NOT NULL, \`status\` varchar(20) NOT NULL DEFAULT 'draft', \`company_id\` int NOT NULL, \`customer_id\` int NOT NULL, \`responsible_user_id\` int NULL, \`customer_payment_method\` varchar(100) NULL, \`bank_name\` varchar(150) NULL, \`validity\` varchar(100) NULL, \`delivery_time\` varchar(100) NULL, \`payment_method\` varchar(150) NULL, \`payment_location\` varchar(150) NULL, \`delivery_method\` varchar(150) NULL, \`tax_percentage\` decimal(7,4) NULL, \`notes\` text NULL, INDEX \`IDX_bfb999ae2a7c20c332560cebed\` (\`quotation_date\`), INDEX \`IDX_30ecfa372ba88f0f7d86a65857\` (\`status\`), UNIQUE INDEX \`IDX_ccc512f3c533b8db1c68aba177\` (\`quotation_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a2cecd1a3531c0b041e29ba46e1\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_0de6cb0c5d4013b4a26d7b4d30b\` FOREIGN KEY (\`issuing_company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quotation_item_amounts\` ADD CONSTRAINT \`FK_24399ec5638d64f1c3bbf2cc8b9\` FOREIGN KEY (\`item_id\`) REFERENCES \`quotation_items\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quotation_items\` ADD CONSTRAINT \`FK_c9e2dea84928feba1d24874c160\` FOREIGN KEY (\`quotation_id\`) REFERENCES \`quotations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quotation_items\` ADD CONSTRAINT \`FK_5228505fc8fca110373782f0288\` FOREIGN KEY (\`material_id\`) REFERENCES \`materials\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quotations\` ADD CONSTRAINT \`FK_90672d758a28a7f6f26f660041e\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quotations\` ADD CONSTRAINT \`FK_6c655818e6753ed41eb755b8bcb\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quotations\` ADD CONSTRAINT \`FK_14a27729857bfc91774932cfe8e\` FOREIGN KEY (\`responsible_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`quotations\` DROP FOREIGN KEY \`FK_14a27729857bfc91774932cfe8e\``);
        await queryRunner.query(`ALTER TABLE \`quotations\` DROP FOREIGN KEY \`FK_6c655818e6753ed41eb755b8bcb\``);
        await queryRunner.query(`ALTER TABLE \`quotations\` DROP FOREIGN KEY \`FK_90672d758a28a7f6f26f660041e\``);
        await queryRunner.query(`ALTER TABLE \`quotation_items\` DROP FOREIGN KEY \`FK_5228505fc8fca110373782f0288\``);
        await queryRunner.query(`ALTER TABLE \`quotation_items\` DROP FOREIGN KEY \`FK_c9e2dea84928feba1d24874c160\``);
        await queryRunner.query(`ALTER TABLE \`quotation_item_amounts\` DROP FOREIGN KEY \`FK_24399ec5638d64f1c3bbf2cc8b9\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_0de6cb0c5d4013b4a26d7b4d30b\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a2cecd1a3531c0b041e29ba46e1\``);
        await queryRunner.query(`DROP INDEX \`IDX_ccc512f3c533b8db1c68aba177\` ON \`quotations\``);
        await queryRunner.query(`DROP INDEX \`IDX_30ecfa372ba88f0f7d86a65857\` ON \`quotations\``);
        await queryRunner.query(`DROP INDEX \`IDX_bfb999ae2a7c20c332560cebed\` ON \`quotations\``);
        await queryRunner.query(`DROP TABLE \`quotations\``);
        await queryRunner.query(`DROP TABLE \`quotation_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_e2adedc6fd5992231393a5d845\` ON \`quotation_item_amounts\``);
        await queryRunner.query(`DROP TABLE \`quotation_item_amounts\``);
        await queryRunner.query(`DROP INDEX \`IDX_180eec59d9027e95b2467ec66f\` ON \`materials\``);
        await queryRunner.query(`DROP INDEX \`IDX_7776e12ada07b5d821c19ce5c7\` ON \`materials\``);
        await queryRunner.query(`DROP INDEX \`IDX_2775677df7f99481e09aa24b4d\` ON \`materials\``);
        await queryRunner.query(`DROP TABLE \`materials\``);
        await queryRunner.query(`DROP INDEX \`IDX_fc94817fe1d433925a0b140008\` ON \`customers\``);
        await queryRunner.query(`DROP INDEX \`IDX_524dd5fe721ad9e3745950dbba\` ON \`customers\``);
        await queryRunner.query(`DROP TABLE \`customers\``);
        await queryRunner.query(`DROP TABLE \`sequences\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_f6d54f95c31b73fb1bdd8e91d0\` ON \`roles\``);
        await queryRunner.query(`DROP TABLE \`roles\``);
        await queryRunner.query(`DROP TABLE \`companies\``);
    }

}
