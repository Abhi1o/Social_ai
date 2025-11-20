-- CreateTable
CREATE TABLE "brand_voices" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tone" TEXT NOT NULL,
    "vocabulary" TEXT[],
    "avoidWords" TEXT[],
    "examples" TEXT[],
    "guidelines" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trainingData" JSONB,
    "consistencyScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_voices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_voices_workspaceId_idx" ON "brand_voices"("workspaceId");

-- CreateIndex
CREATE INDEX "brand_voices_isDefault_idx" ON "brand_voices"("isDefault");

-- AddForeignKey
ALTER TABLE "brand_voices" ADD CONSTRAINT "brand_voices_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
