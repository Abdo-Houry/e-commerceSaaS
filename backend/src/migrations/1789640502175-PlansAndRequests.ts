import { MigrationInterface, QueryRunner } from "typeorm";

export class PlansAndRequests1789640502175 implements MigrationInterface {
    name = 'PlansAndRequests1789640502175'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "subscription_requests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storeId" uuid NOT NULL,
                "planId" character varying(20) NOT NULL,
                "months" integer NOT NULL,
                "amount" bigint NOT NULL,
                "currency" character varying(3) NOT NULL,
                "method" character varying(20) NOT NULL,
                "reference" character varying(200),
                "receiptUrl" character varying(500),
                "note" character varying(300),
                "status" character varying(16) NOT NULL DEFAULT 'pending',
                "rejectionReason" character varying(300),
                "reviewedById" uuid,
                "reviewedAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7f97babb1f4d7eeef9d5c2937be" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_subscription_requests_store" ON "subscription_requests" ("storeId", "createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_subscription_requests_status_created" ON "subscription_requests" ("status", "createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings" DROP COLUMN "monthlyPrice"
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings" DROP COLUMN "planName"
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings"
            ADD "plans" jsonb NOT NULL DEFAULT '{}'::jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_payments"
            ADD "planId" character varying(20)
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_payments"
            ADD "currency" character varying(3) NOT NULL DEFAULT 'USD'
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
            ALTER TABLE "platform_settings"
            ALTER COLUMN "currency"
            SET DEFAULT 'USD'
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings"
            ALTER COLUMN "paymentMethods"
            SET DEFAULT '{}'::jsonb
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_requests"
            ADD CONSTRAINT "FK_e25ee73dc46ab7418c036e0cc91" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_requests"
            ADD CONSTRAINT "FK_9504a0e73feb3c6c8b853cd30c8" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "subscription_requests" DROP CONSTRAINT "FK_9504a0e73feb3c6c8b853cd30c8"
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_requests" DROP CONSTRAINT "FK_e25ee73dc46ab7418c036e0cc91"
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings"
            ALTER COLUMN "paymentMethods"
            SET DEFAULT '{}'
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings"
            ALTER COLUMN "currency"
            SET DEFAULT 'SYP'
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
            ALTER TABLE "subscription_payments" DROP COLUMN "currency"
        `);
        await queryRunner.query(`
            ALTER TABLE "subscription_payments" DROP COLUMN "planId"
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings" DROP COLUMN "plans"
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings"
            ADD "planName" character varying(60) NOT NULL DEFAULT 'اشتراك متجري'
        `);
        await queryRunner.query(`
            ALTER TABLE "platform_settings"
            ADD "monthlyPrice" bigint NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_subscription_requests_status_created"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_subscription_requests_store"
        `);
        await queryRunner.query(`
            DROP TABLE "subscription_requests"
        `);
    }

}
