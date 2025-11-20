-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('VOLUME_SPIKE', 'SENTIMENT_SHIFT', 'CRISIS_DETECTED', 'INFLUENCER_MENTION', 'KEYWORD_TREND');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "listening_queries" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[],
    "query" TEXT NOT NULL,
    "platforms" "Platform"[],
    "languages" TEXT[],
    "locations" TEXT[],
    "excludeKeywords" TEXT[],
    "includeRetweets" BOOLEAN NOT NULL DEFAULT true,
    "minFollowers" INTEGER,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alertThreshold" INTEGER,
    "alertRecipients" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_mentions" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "authorFollowers" INTEGER,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platformPostId" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "sentiment" "Sentiment" NOT NULL DEFAULT 'NEUTRAL',
    "sentimentScore" DOUBLE PRECISION,
    "language" TEXT,
    "location" TEXT,
    "isInfluencer" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listening_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_alerts" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mentionCount" INTEGER,
    "sentimentShift" DOUBLE PRECISION,
    "metadata" JSONB,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listening_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listening_queries_workspaceId_idx" ON "listening_queries"("workspaceId");

-- CreateIndex
CREATE INDEX "listening_queries_isActive_idx" ON "listening_queries"("isActive");

-- CreateIndex
CREATE INDEX "listening_mentions_queryId_idx" ON "listening_mentions"("queryId");

-- CreateIndex
CREATE INDEX "listening_mentions_workspaceId_idx" ON "listening_mentions"("workspaceId");

-- CreateIndex
CREATE INDEX "listening_mentions_platform_idx" ON "listening_mentions"("platform");

-- CreateIndex
CREATE INDEX "listening_mentions_sentiment_idx" ON "listening_mentions"("sentiment");

-- CreateIndex
CREATE INDEX "listening_mentions_publishedAt_idx" ON "listening_mentions"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "listening_mentions_platform_platformPostId_key" ON "listening_mentions"("platform", "platformPostId");

-- CreateIndex
CREATE INDEX "listening_alerts_queryId_idx" ON "listening_alerts"("queryId");

-- CreateIndex
CREATE INDEX "listening_alerts_workspaceId_idx" ON "listening_alerts"("workspaceId");

-- CreateIndex
CREATE INDEX "listening_alerts_status_idx" ON "listening_alerts"("status");

-- CreateIndex
CREATE INDEX "listening_alerts_createdAt_idx" ON "listening_alerts"("createdAt");

-- AddForeignKey
ALTER TABLE "listening_queries" ADD CONSTRAINT "listening_queries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_mentions" ADD CONSTRAINT "listening_mentions_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "listening_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_alerts" ADD CONSTRAINT "listening_alerts_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "listening_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
