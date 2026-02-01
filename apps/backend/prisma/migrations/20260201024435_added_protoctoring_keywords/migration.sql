-- CreateEnum
CREATE TYPE "ProctoringEventType" AS ENUM ('TAB_CHANGE', 'FULLSCREEN_EXIT', 'CHEATED');

-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'CHEATED';

-- AlterTable
ALTER TABLE "CandidateInterviewSession" ADD COLUMN     "tab_change_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProctoringEvent" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "event_type" "ProctoringEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringSnapshot" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "snapshot_at" TIMESTAMP(3) NOT NULL,
    "face_present" BOOLEAN NOT NULL DEFAULT false,
    "movement_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dominant_emotion" TEXT,
    "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    CONSTRAINT "ProctoringSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProctoringEvent_session_id_idx" ON "ProctoringEvent"("session_id");

-- CreateIndex
CREATE INDEX "ProctoringSnapshot_session_id_idx" ON "ProctoringSnapshot"("session_id");

-- CreateIndex
CREATE INDEX "ProctoringSnapshot_session_id_snapshot_at_idx" ON "ProctoringSnapshot"("session_id", "snapshot_at");

-- AddForeignKey
ALTER TABLE "ProctoringEvent" ADD CONSTRAINT "ProctoringEvent_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CandidateInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringSnapshot" ADD CONSTRAINT "ProctoringSnapshot_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CandidateInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
