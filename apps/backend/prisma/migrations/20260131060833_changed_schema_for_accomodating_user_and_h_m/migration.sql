/*
  Warnings:

  - The values [ADMIN] on the enum `RoleCode` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `completed_at` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_duration` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `experience_level` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `focus_areas` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `job_description` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_for` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `total_questions` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Interview` table. All the data in the column will be lost.
  - You are about to drop the `api_keys` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[session_id]` on the table `InterviewResult` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `session_id` to the `InterviewResult` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "InterviewAgentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "RoleCode_new" AS ENUM ('USER', 'HIRING_MANAGER');
ALTER TABLE "Role" ALTER COLUMN "code" TYPE "RoleCode_new" USING ("code"::text::"RoleCode_new");
ALTER TYPE "RoleCode" RENAME TO "RoleCode_old";
ALTER TYPE "RoleCode_new" RENAME TO "RoleCode";
DROP TYPE "public"."RoleCode_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT "Interview_user_id_fkey";

-- DropIndex
DROP INDEX "Interview_status_idx";

-- DropIndex
DROP INDEX "Interview_user_id_idx";

-- DropIndex
DROP INDEX "Interview_user_id_status_idx";

-- AlterTable
ALTER TABLE "Interview" DROP COLUMN "completed_at",
DROP COLUMN "created_at",
DROP COLUMN "estimated_duration",
DROP COLUMN "experience_level",
DROP COLUMN "focus_areas",
DROP COLUMN "job_description",
DROP COLUMN "role",
DROP COLUMN "scheduled_for",
DROP COLUMN "started_at",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "total_questions",
DROP COLUMN "updated_at",
DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "InterviewResult" ADD COLUMN     "questions_skipped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "session_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "api_keys";

-- DropEnum
DROP TYPE "InterviewStatus";

-- DropEnum
DROP TYPE "Permission";

-- CreateTable
CREATE TABLE "HiringManagerInformation" (
    "id" SERIAL NOT NULL,
    "hiring_manager_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_size" "CompanySize" NOT NULL,
    "industry" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "team_name" TEXT,
    "linkedin_url" TEXT,
    "website" TEXT,
    "max_active_interviews" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiringManagerInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAgent" (
    "id" SERIAL NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "job_description" TEXT NOT NULL,
    "experience_level" "ExperienceLevel" NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 6,
    "estimated_duration" INTEGER NOT NULL DEFAULT 30,
    "focus_areas" TEXT[],
    "max_candidates" INTEGER NOT NULL DEFAULT 100,
    "max_attempts_per_candidate" INTEGER NOT NULL DEFAULT 3,
    "deadline" TIMESTAMP(3),
    "status" "InterviewAgentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_for" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateInterviewSession" (
    "id" SERIAL NOT NULL,
    "interview_agent_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "interview_id" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "abandoned_at" TIMESTAMP(3),
    "abandon_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateInterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateQuestionResult" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "question_number" INTEGER NOT NULL,
    "overall_question_score" INTEGER NOT NULL,
    "technical_score" INTEGER NOT NULL,
    "communication_score" INTEGER NOT NULL,
    "problem_solving_score" INTEGER NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "difficulty_weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "hint_used" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateQuestionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HiringManagerInformation_hiring_manager_id_key" ON "HiringManagerInformation"("hiring_manager_id");

-- CreateIndex
CREATE INDEX "HiringManagerInformation_hiring_manager_id_idx" ON "HiringManagerInformation"("hiring_manager_id");

-- CreateIndex
CREATE INDEX "HiringManagerInformation_company_name_idx" ON "HiringManagerInformation"("company_name");

-- CreateIndex
CREATE INDEX "HiringManagerInformation_industry_idx" ON "HiringManagerInformation"("industry");

-- CreateIndex
CREATE INDEX "InterviewAgent_created_by_id_idx" ON "InterviewAgent"("created_by_id");

-- CreateIndex
CREATE INDEX "InterviewAgent_is_active_idx" ON "InterviewAgent"("is_active");

-- CreateIndex
CREATE INDEX "InterviewAgent_created_by_id_is_active_idx" ON "InterviewAgent"("created_by_id", "is_active");

-- CreateIndex
CREATE INDEX "InterviewAgent_status_idx" ON "InterviewAgent"("status");

-- CreateIndex
CREATE INDEX "InterviewAgent_deadline_idx" ON "InterviewAgent"("deadline");

-- CreateIndex
CREATE INDEX "CandidateInterviewSession_interview_agent_id_idx" ON "CandidateInterviewSession"("interview_agent_id");

-- CreateIndex
CREATE INDEX "CandidateInterviewSession_candidate_id_idx" ON "CandidateInterviewSession"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateInterviewSession_interview_agent_id_candidate_id_idx" ON "CandidateInterviewSession"("interview_agent_id", "candidate_id");

-- CreateIndex
CREATE INDEX "CandidateInterviewSession_status_idx" ON "CandidateInterviewSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateInterviewSession_interview_agent_id_candidate_id_i_key" ON "CandidateInterviewSession"("interview_agent_id", "candidate_id", "interview_id");

-- CreateIndex
CREATE INDEX "CandidateQuestionResult_session_id_idx" ON "CandidateQuestionResult"("session_id");

-- CreateIndex
CREATE INDEX "CandidateQuestionResult_conversation_id_idx" ON "CandidateQuestionResult"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateQuestionResult_session_id_conversation_id_key" ON "CandidateQuestionResult"("session_id", "conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewResult_session_id_key" ON "InterviewResult"("session_id");

-- CreateIndex
CREATE INDEX "InterviewResult_session_id_idx" ON "InterviewResult"("session_id");

-- CreateIndex
CREATE INDEX "InterviewResult_user_id_decision_idx" ON "InterviewResult"("user_id", "decision");

-- AddForeignKey
ALTER TABLE "HiringManagerInformation" ADD CONSTRAINT "HiringManagerInformation_hiring_manager_id_fkey" FOREIGN KEY ("hiring_manager_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAgent" ADD CONSTRAINT "InterviewAgent_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInterviewSession" ADD CONSTRAINT "CandidateInterviewSession_interview_agent_id_fkey" FOREIGN KEY ("interview_agent_id") REFERENCES "InterviewAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInterviewSession" ADD CONSTRAINT "CandidateInterviewSession_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInterviewSession" ADD CONSTRAINT "CandidateInterviewSession_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateQuestionResult" ADD CONSTRAINT "CandidateQuestionResult_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CandidateInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateQuestionResult" ADD CONSTRAINT "CandidateQuestionResult_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResult" ADD CONSTRAINT "InterviewResult_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CandidateInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
