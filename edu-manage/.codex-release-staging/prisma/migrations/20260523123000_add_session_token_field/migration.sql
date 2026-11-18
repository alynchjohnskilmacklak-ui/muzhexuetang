-- AlterTable
ALTER TABLE "User" ADD COLUMN "currentSessionToken" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastLoginIp" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLoginDevice" TEXT;
