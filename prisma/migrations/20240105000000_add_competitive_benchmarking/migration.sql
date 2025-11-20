-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_accounts" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competitors_workspaceId_idx" ON "competitors"("workspaceId");

-- CreateIndex
CREATE INDEX "competitors_isActive_idx" ON "competitors"("isActive");

-- CreateIndex
CREATE INDEX "competitor_accounts_competitorId_idx" ON "competitor_accounts"("competitorId");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_accounts_competitorId_platform_platformAccountId_key" ON "competitor_accounts"("competitorId", "platform", "platformAccountId");

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_accounts" ADD CONSTRAINT "competitor_accounts_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
