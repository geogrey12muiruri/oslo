-- CreateTable
CREATE TABLE "AuditProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "priority" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "modules" TEXT[],
    "objectives" TEXT NOT NULL,
    "methods" TEXT[],
    "criteria" TEXT[],
    "milestones" JSONB NOT NULL,
    "teams" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditProgram_pkey" PRIMARY KEY ("id")
);
