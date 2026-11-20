CREATE TABLE "Analysis" (
    "id" SERIAL NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "repositoryFullName" TEXT NOT NULL,
    "pullRequestNumber" INTEGER NOT NULL,
    "baseSha" TEXT NOT NULL,
    "headSha" TEXT NOT NULL,
    "breakingChanges" INTEGER NOT NULL,
    "impactedConsumers" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "aiExplanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Analysis_repositoryId_pullRequestNumber_baseSha_headSha_key"
ON "Analysis"("repositoryId", "pullRequestNumber", "baseSha", "headSha");
