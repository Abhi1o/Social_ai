import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1703000000000 implements MigrationInterface {
  name = 'InitialSchema1703000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tenants table
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "planTier" character varying(50) NOT NULL DEFAULT 'free',
        "billingStatus" character varying(50) NOT NULL DEFAULT 'active',
        "settings" jsonb NOT NULL DEFAULT '{}',
        "aiBudgetLimit" numeric(10,2) NOT NULL DEFAULT '0.00',
        "aiUsageCurrent" numeric(10,2) NOT NULL DEFAULT '0.00',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_planTier" CHECK ("planTier" IN ('free', 'starter', 'professional', 'business', 'enterprise'))
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "firstName" character varying(255),
        "lastName" character varying(255),
        "role" character varying(50) NOT NULL DEFAULT 'editor',
        "preferences" jsonb NOT NULL DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_role" CHECK ("role" IN ('admin', 'manager', 'editor', 'viewer')),
        CONSTRAINT "FK_users_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Create social_accounts table
    await queryRunner.query(`
      CREATE TABLE "social_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "platform" character varying(50) NOT NULL,
        "accountIdentifier" character varying(255) NOT NULL,
        "displayName" character varying(255),
        "oauthTokensEncrypted" text NOT NULL,
        "refreshTokenEncrypted" text,
        "tokenExpiresAt" TIMESTAMP,
        "accountMetadata" jsonb NOT NULL DEFAULT '{}',
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "lastSyncAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_social_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_social_accounts_tenant_platform_identifier" UNIQUE ("tenantId", "platform", "accountIdentifier"),
        CONSTRAINT "CHK_platform" CHECK ("platform" IN ('instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'pinterest', 'threads', 'reddit')),
        CONSTRAINT "FK_social_accounts_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Enable Row Level Security (RLS) for multi-tenant isolation
    await queryRunner.query(`ALTER TABLE "users" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "social_accounts" ENABLE ROW LEVEL SECURITY`);

    // Create RLS policies for tenant isolation
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_users ON "users"
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid)
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_social_accounts ON "social_accounts"
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::uuid)
    `);

    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX "IDX_users_tenantId" ON "users" ("tenantId")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_social_accounts_tenantId" ON "social_accounts" ("tenantId")`);
    await queryRunner.query(`CREATE INDEX "IDX_social_accounts_platform" ON "social_accounts" ("platform")`);
    await queryRunner.query(`CREATE INDEX "IDX_tenants_planTier" ON "tenants" ("planTier")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_social_accounts ON "social_accounts"`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_users ON "users"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenants_planTier"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_social_accounts_platform"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_social_accounts_tenantId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_tenantId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "social_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
  }
}