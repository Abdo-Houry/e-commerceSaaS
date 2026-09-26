import { MigrationInterface, QueryRunner } from "typeorm";

export class Subscriptions1789580556427 implements MigrationInterface {
    name = 'Subscriptions1789580556427'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "platform_settings" (
                "id" integer NOT NULL DEFAULT '1',
                "planName" character varying(60) NOT NULL DEFAULT 'اشتراك متجري',
                "monthlyPrice" bigint NOT NULL DEFAULT '0',
                "currency" character varying(3) NOT NULL DEFAULT 'SYP',
                "trialDays" integer NOT NULL DEFAULT '14',
                "graceDays" integer NOT NULL DEFAULT '3',
                "supportWhatsapp" character varying(15) NOT NULL DEFAULT '',
                "paymentMethods" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_2934aeb70ec285196dcab4a2e96" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "subscription_payments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storeId" uuid NOT NULL,
                "adminId" uuid,
                "months" integer NOT NULL,
                "amount" bigint NOT NULL,
                "method" character varying(20) NOT NULL,
                "note" character varying(300),
                "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1b7a76365fd477de59cba0ab957" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_subscription_payments_store_created" ON "subscription_payments" ("storeId", "createdAt")
        `);
        // The settings table is a singleton; create its row so defaults exist from day one.
        await queryRunner.query(`INSERT INTO "platform_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING`);
        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD "suspendedAt" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD "suspensionReason" character varying(300)
        `);
        await queryRunner.query(`
            ALTER TABLE "stores"
            ALTER COLUMN "socialLinks"
            SET DEFAULT '{}'::jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "stores"
            ALTER COLUMN "businessHours"
            SET DEFAULT '{}'::jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "products"
            ALTER COLUMN "images"
            SET DEFAULT '[]'::jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "products"
            ALTER COLUMN "options"
            SET DEFAULT '[]'::jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "order_items"
            ALTER COLUMN "selectedOptions"
            SET DEFAULT '{}'::jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_payments"
            ADD CONSTRAINT "FK_120ffefd514cef1889d736df1cd" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_payments"
            ADD CONSTRAINT "FK_e4287eff4eb57e6d796a64e6c1e" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "subscription_payments" DROP CONSTRAINT "FK_e4287eff4eb57e6d796a64e6c1e"
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_payments" DROP CONSTRAINT "FK_120ffefd514cef1889d736df1cd"
        `);
        await queryRunner.query(`
            ALTER TABLE "order_items"
            ALTER COLUMN "selectedOptions"
            SET DEFAULT '{}'
        `);
        await queryRunner.query(`
            ALTER TABLE "products"
            ALTER COLUMN "options"
            SET DEFAULT '[]'
        `);
        await queryRunner.query(`
            ALTER TABLE "products"
            ALTER COLUMN "images"
            SET DEFAULT '[]'
        `);
        await queryRunner.query(`
            ALTER TABLE "stores"
            ALTER COLUMN "businessHours"
            SET DEFAULT '{}'
        `);
        await queryRunner.query(`
            ALTER TABLE "stores"
            ALTER COLUMN "socialLinks"
            SET DEFAULT '{}'
        `);
        await queryRunner.query(`
            ALTER TABLE "stores" DROP COLUMN "suspensionReason"
        `);
        await queryRunner.query(`
            ALTER TABLE "stores" DROP COLUMN "suspendedAt"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_subscription_payments_store_created"
        `);
        await queryRunner.query(`
            DROP TABLE "subscription_payments"
        `);
        await queryRunner.query(`
            DROP TABLE "platform_settings"
        `);
    }

}
