import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1789575599545 implements MigrationInterface {
    name = 'InitialSchema1789575599545'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(80) NOT NULL,
                "email" citext NOT NULL,
                "passwordHash" character varying(100) NOT NULL,
                "phone" character varying(20),
                "role" character varying(16) NOT NULL DEFAULT 'merchant',
                "emailVerifiedAt" TIMESTAMP WITH TIME ZONE,
                "resetToken" character varying(64),
                "resetTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "subscriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storeId" uuid NOT NULL,
                "plan" character varying(16) NOT NULL DEFAULT 'trial',
                "status" character varying(16) NOT NULL DEFAULT 'active',
                "trialEndsAt" TIMESTAMP WITH TIME ZONE,
                "currentPeriodEnd" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_e726b784042072368c7b31a82e2" UNIQUE ("storeId"),
                CONSTRAINT "REL_e726b784042072368c7b31a82e" UNIQUE ("storeId"),
                CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "stores" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ownerId" uuid NOT NULL,
                "name" character varying(60) NOT NULL,
                "slug" character varying(40) NOT NULL,
                "description" text,
                "logoUrl" character varying(500),
                "faviconUrl" character varying(500),
                "bannerUrl" character varying(500),
                "bannerTitle" character varying(80),
                "bannerSubtitle" character varying(160),
                "template" character varying(16) NOT NULL DEFAULT 'classic',
                "primaryColor" character varying(7) NOT NULL DEFAULT '#059669',
                "secondaryColor" character varying(7) NOT NULL DEFAULT '#F59E0B',
                "font" character varying(16) NOT NULL DEFAULT 'cairo',
                "whatsappNumber" character varying(15) NOT NULL,
                "currency" character varying(3) NOT NULL DEFAULT 'SYP',
                "city" character varying(60),
                "socialLinks" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "businessHours" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "minOrderAmount" bigint NOT NULL DEFAULT '0',
                "orderCounter" integer NOT NULL DEFAULT '1000',
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_a447ba082271c05997a61df26df" UNIQUE ("ownerId"),
                CONSTRAINT "UQ_790b2968701a6ff5ff383237765" UNIQUE ("slug"),
                CONSTRAINT "REL_a447ba082271c05997a61df26d" UNIQUE ("ownerId"),
                CONSTRAINT "PK_7aa6e7d71fa7acdd7ca43d7c9cb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storeId" uuid NOT NULL,
                "name" character varying(60) NOT NULL,
                "imageUrl" character varying(500),
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_categories_store_name" ON "categories" ("storeId", "name")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TABLE "delivery_zones" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storeId" uuid NOT NULL,
                "name" character varying(60) NOT NULL,
                "fee" bigint NOT NULL DEFAULT '0',
                "estimatedTime" character varying(60),
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_88bc4c12be62436a61930cf34a9" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "products" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storeId" uuid NOT NULL,
                "categoryId" uuid,
                "name" character varying(120) NOT NULL,
                "description" text,
                "price" bigint NOT NULL,
                "comparePrice" bigint,
                "images" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "stock" integer NOT NULL DEFAULT '0',
                "trackStock" boolean NOT NULL DEFAULT true,
                "options" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "isActive" boolean NOT NULL DEFAULT true,
                "sortOrder" integer NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_products_store_active" ON "products" ("storeId", "isActive")
        `);
        await queryRunner.query(`
            CREATE TABLE "order_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "orderId" uuid NOT NULL,
                "productId" uuid,
                "productName" character varying(120) NOT NULL,
                "unitPrice" bigint NOT NULL,
                "quantity" integer NOT NULL,
                "selectedOptions" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "storeId" uuid NOT NULL,
                "orderNumber" integer NOT NULL,
                "customerName" character varying(80) NOT NULL,
                "customerPhone" character varying(15) NOT NULL,
                "zoneId" uuid,
                "zoneName" character varying(60) NOT NULL,
                "customerAddress" character varying(300) NOT NULL,
                "notes" text,
                "subtotal" bigint NOT NULL,
                "deliveryFee" bigint NOT NULL,
                "total" bigint NOT NULL,
                "status" character varying(16) NOT NULL DEFAULT 'new',
                "whatsappOpened" boolean NOT NULL DEFAULT false,
                "stockDeducted" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_orders_store_number" UNIQUE ("storeId", "orderNumber"),
                CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_orders_store_status_created" ON "orders" ("storeId", "status", "createdAt")
        `);
        await queryRunner.query(`
            ALTER TABLE "subscriptions"
            ADD CONSTRAINT "FK_e726b784042072368c7b31a82e2" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "stores"
            ADD CONSTRAINT "FK_a447ba082271c05997a61df26df" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "categories"
            ADD CONSTRAINT "FK_fa6ba3528de12e174b163c09fdd" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "delivery_zones"
            ADD CONSTRAINT "FK_59d8396bb2eea15facb69077a77" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD CONSTRAINT "FK_782da5e50e94b763eb63225d69d" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "order_items"
            ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "order_items"
            ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_0f82354e5b05fd87884eff3a7b5" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_76c47d954887f2da9672bc24c45" FOREIGN KEY ("zoneId") REFERENCES "delivery_zones"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders" DROP CONSTRAINT "FK_76c47d954887f2da9672bc24c45"
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" DROP CONSTRAINT "FK_0f82354e5b05fd87884eff3a7b5"
        `);
        await queryRunner.query(`
            ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"
        `);
        await queryRunner.query(`
            ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"
        `);
        await queryRunner.query(`
            ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"
        `);
        await queryRunner.query(`
            ALTER TABLE "products" DROP CONSTRAINT "FK_782da5e50e94b763eb63225d69d"
        `);
        await queryRunner.query(`
            ALTER TABLE "delivery_zones" DROP CONSTRAINT "FK_59d8396bb2eea15facb69077a77"
        `);
        await queryRunner.query(`
            ALTER TABLE "categories" DROP CONSTRAINT "FK_fa6ba3528de12e174b163c09fdd"
        `);
        await queryRunner.query(`
            ALTER TABLE "stores" DROP CONSTRAINT "FK_a447ba082271c05997a61df26df"
        `);
        await queryRunner.query(`
            ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_e726b784042072368c7b31a82e2"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_orders_store_status_created"
        `);
        await queryRunner.query(`
            DROP TABLE "orders"
        `);
        await queryRunner.query(`
            DROP TABLE "order_items"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_products_store_active"
        `);
        await queryRunner.query(`
            DROP TABLE "products"
        `);
        await queryRunner.query(`
            DROP TABLE "delivery_zones"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."UQ_categories_store_name"
        `);
        await queryRunner.query(`
            DROP TABLE "categories"
        `);
        await queryRunner.query(`
            DROP TABLE "stores"
        `);
        await queryRunner.query(`
            DROP TABLE "subscriptions"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
    }

}
