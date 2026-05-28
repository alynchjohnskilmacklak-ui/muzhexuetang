CREATE TYPE "DocType" AS ENUM ('POLICY_DOC', 'QUOTA_TABLE', 'OTHER');

CREATE TABLE "VolunteerGuide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '石家庄中考志愿填报指南',
    "subtitle" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2025,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerGuide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuideStep" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tipContent" TEXT,
    "imageUrl" TEXT,
    "batchTags" TEXT[] NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuideStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuideDocument" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" TEXT,
    "content" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuideDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotaRecord" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "allocQuota" INTEGER NOT NULL,
    "normalQuota" INTEGER NOT NULL,
    "totalQuota" INTEGER NOT NULL,
    "note" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2025,
    CONSTRAINT "QuotaRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VolunteerConsultation" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "replyId" TEXT,
    "reply" TEXT,
    "repliedBy" TEXT,
    "isReplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),
    CONSTRAINT "VolunteerConsultation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuideStep_guideId_order_idx" ON "GuideStep"("guideId", "order");
CREATE INDEX "GuideDocument_guideId_sortOrder_idx" ON "GuideDocument"("guideId", "sortOrder");
CREATE INDEX "QuotaRecord_guideId_year_idx" ON "QuotaRecord"("guideId", "year");
CREATE INDEX "QuotaRecord_schoolName_idx" ON "QuotaRecord"("schoolName");
CREATE INDEX "QuotaRecord_district_idx" ON "QuotaRecord"("district");
CREATE INDEX "VolunteerConsultation_parentId_createdAt_idx" ON "VolunteerConsultation"("parentId", "createdAt");
CREATE INDEX "VolunteerConsultation_isReplied_createdAt_idx" ON "VolunteerConsultation"("isReplied", "createdAt");

ALTER TABLE "GuideStep" ADD CONSTRAINT "GuideStep_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "VolunteerGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuideDocument" ADD CONSTRAINT "GuideDocument_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "VolunteerGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuotaRecord" ADD CONSTRAINT "QuotaRecord_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "VolunteerGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VolunteerConsultation" ADD CONSTRAINT "VolunteerConsultation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
