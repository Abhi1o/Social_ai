-- CreateEnum
CREATE TYPE "SLAStatus" AS ENUM ('PENDING', 'MET', 'BREACHED', 'PAUSED');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "templateId" TEXT;

-- CreateTable
CREATE TABLE "saved_replies" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "variables" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_history" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "conversation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL,
    "platform" "Platform",
    "type" "ConversationType",
    "firstResponseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "businessHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "escalationTime" INTEGER,
    "escalateTo" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_tracking" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "slaConfigId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "firstResponseStatus" "SLAStatus" NOT NULL DEFAULT 'PENDING',
    "resolutionStatus" "SLAStatus" NOT NULL DEFAULT 'PENDING',
    "firstResponseBreached" BOOLEAN NOT NULL DEFAULT false,
    "resolutionBreached" BOOLEAN NOT NULL DEFAULT false,
    "firstResponseTime" INTEGER,
    "resolutionTime" INTEGER,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "escalateTo" TEXT[],
    "metadata" JSONB,

    CONSTRAINT "sla_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_replies_workspaceId_idx" ON "saved_replies"("workspaceId");

-- CreateIndex
CREATE INDEX "saved_replies_category_idx" ON "saved_replies"("category");

-- CreateIndex
CREATE INDEX "saved_replies_isActive_idx" ON "saved_replies"("isActive");

-- CreateIndex
CREATE INDEX "conversation_history_conversationId_idx" ON "conversation_history"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_history_changedAt_idx" ON "conversation_history"("changedAt");

-- CreateIndex
CREATE INDEX "sla_configs_workspaceId_idx" ON "sla_configs"("workspaceId");

-- CreateIndex
CREATE INDEX "sla_configs_priority_idx" ON "sla_configs"("priority");

-- CreateIndex
CREATE INDEX "sla_configs_isActive_idx" ON "sla_configs"("isActive");

-- CreateIndex
CREATE INDEX "sla_tracking_conversationId_idx" ON "sla_tracking"("conversationId");

-- CreateIndex
CREATE INDEX "sla_tracking_slaConfigId_idx" ON "sla_tracking"("slaConfigId");

-- CreateIndex
CREATE INDEX "sla_tracking_firstResponseStatus_idx" ON "sla_tracking"("firstResponseStatus");

-- CreateIndex
CREATE INDEX "sla_tracking_resolutionStatus_idx" ON "sla_tracking"("resolutionStatus");

-- AddForeignKey
ALTER TABLE "saved_replies" ADD CONSTRAINT "saved_replies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_configs" ADD CONSTRAINT "sla_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
