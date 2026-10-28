CREATE TABLE "DeletedRecord" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "payload" JSONB NOT NULL,
    "deletedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeletedRecord_entityType_entityId_idx" ON "DeletedRecord"("entityType", "entityId");
CREATE INDEX "DeletedRecord_createdAt_idx" ON "DeletedRecord"("createdAt");
