-- CreateEnum
CREATE TYPE "QuestionSelectionMode" AS ENUM ('CUSTOM_ONLY', 'AI_ONLY', 'MIXED');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'PROBLEM_SOLVING', 'DOMAIN_KNOWLEDGE', 'CULTURAL_FIT', 'CODING');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('CUSTOM', 'AI_GENERATED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "interview_question_id" INTEGER,
ADD COLUMN     "question_source" "QuestionSource" NOT NULL DEFAULT 'AI_GENERATED';

-- AlterTable
ALTER TABLE "InterviewAgent" ADD COLUMN     "question_selection_mode" "QuestionSelectionMode" NOT NULL DEFAULT 'MIXED',
ALTER COLUMN "deadline" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" SERIAL NOT NULL,
    "interview_agent_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "category" "QuestionCategory" NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "order_index" INTEGER NOT NULL,
    "estimated_time" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expected_keywords" TEXT[],
    "grading_rubric" JSONB,
    "sample_answer" TEXT,
    "focus_areas" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewQuestion_interview_agent_id_idx" ON "InterviewQuestion"("interview_agent_id");

-- CreateIndex
CREATE INDEX "InterviewQuestion_interview_agent_id_is_active_idx" ON "InterviewQuestion"("interview_agent_id", "is_active");

-- CreateIndex
CREATE INDEX "InterviewQuestion_category_idx" ON "InterviewQuestion"("category");

-- CreateIndex
CREATE INDEX "InterviewQuestion_difficulty_idx" ON "InterviewQuestion"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewQuestion_interview_agent_id_order_index_key" ON "InterviewQuestion"("interview_agent_id", "order_index");

-- CreateIndex
CREATE INDEX "Conversation_interview_question_id_idx" ON "Conversation"("interview_question_id");

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_interview_agent_id_fkey" FOREIGN KEY ("interview_agent_id") REFERENCES "InterviewAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
