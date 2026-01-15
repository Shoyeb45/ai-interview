-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('GENERAL');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('INTERN', 'ENTRY_LEVEL', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'LEAD', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAUSED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "HiringDecision" AS ENUM ('STRONG_HIRE', 'HIRE', 'BORDERLINE', 'NO_HIRE', 'STRONG_NO_HIRE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleRelation" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "code" "RoleCode" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keystores" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "primary_key" TEXT NOT NULL,
    "secondary_key" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keystores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "permissions" "Permission"[],
    "comments" TEXT[],
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "job_description" TEXT NOT NULL,
    "experience_level" "ExperienceLevel" NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 6,
    "estimated_duration" INTEGER NOT NULL DEFAULT 30,
    "focus_areas" TEXT[],
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_for" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "interview_id" INTEGER NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT,
    "difficulty" "DifficultyLevel",
    "answer" TEXT,
    "question_asked_at" TIMESTAMP(3) NOT NULL,
    "answer_started_at" TIMESTAMP(3),
    "answer_ended_at" TIMESTAMP(3),
    "thinking_time" INTEGER,
    "answer_duration" INTEGER,
    "struggling_indicators" INTEGER NOT NULL DEFAULT 0,
    "confidence_score" DOUBLE PRECISION,
    "clarifications_asked" INTEGER NOT NULL DEFAULT 0,
    "hints_provided" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audio_url" TEXT,
    "duration" DOUBLE PRECISION,
    "words_per_min" DOUBLE PRECISION,
    "pause_count" INTEGER NOT NULL DEFAULT 0,
    "filler_words" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionFeedback" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "answer_quality" INTEGER NOT NULL,
    "technical_accuracy" INTEGER NOT NULL,
    "communication_clarity" INTEGER NOT NULL,
    "problem_solving_skill" INTEGER NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "suggestions" TEXT[],
    "expected_keywords" TEXT[],
    "mentioned_keywords" TEXT[],
    "missed_keywords" TEXT[],
    "feedback" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewResult" (
    "id" SERIAL NOT NULL,
    "interview_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "technical_score" INTEGER NOT NULL,
    "communication_score" INTEGER NOT NULL,
    "problem_solving_score" INTEGER NOT NULL,
    "culture_fit_score" INTEGER NOT NULL,
    "skill_scores" JSONB NOT NULL,
    "top_strengths" TEXT[],
    "top_weaknesses" TEXT[],
    "decision" "HiringDecision" NOT NULL,
    "role_readiness_percent" INTEGER NOT NULL,
    "improvement_plan" JSONB NOT NULL,
    "detailed_feedback" TEXT NOT NULL,
    "transcript_summary" TEXT NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "questions_answered" INTEGER NOT NULL,
    "avg_response_time" DOUBLE PRECISION NOT NULL,
    "avg_confidence" DOUBLE PRECISION NOT NULL,
    "total_hints_used" INTEGER NOT NULL,
    "interview_duration" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMetrics" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_interviews" INTEGER NOT NULL DEFAULT 0,
    "completed_interviews" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score_history" JSONB NOT NULL,
    "skill_progress" JSONB NOT NULL,
    "total_practice_time" INTEGER NOT NULL DEFAULT 0,
    "avg_interview_duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strongest_skills" TEXT[],
    "improving_skills" TEXT[],
    "needs_work_skills" TEXT[],
    "last_interview_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserRoleRelation_user_id_idx" ON "UserRoleRelation"("user_id");

-- CreateIndex
CREATE INDEX "UserRoleRelation_roleId_idx" ON "UserRoleRelation"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleRelation_user_id_roleId_key" ON "UserRoleRelation"("user_id", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "Role_code_idx" ON "Role"("code");

-- CreateIndex
CREATE INDEX "keystores_client_id_idx" ON "keystores"("client_id");

-- CreateIndex
CREATE INDEX "keystores_client_id_primary_key_status_idx" ON "keystores"("client_id", "primary_key", "status");

-- CreateIndex
CREATE INDEX "keystores_client_id_primary_key_secondary_key_idx" ON "keystores"("client_id", "primary_key", "secondary_key");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_key_status_idx" ON "api_keys"("key", "status");

-- CreateIndex
CREATE INDEX "Interview_user_id_idx" ON "Interview"("user_id");

-- CreateIndex
CREATE INDEX "Interview_status_idx" ON "Interview"("status");

-- CreateIndex
CREATE INDEX "Interview_user_id_status_idx" ON "Interview"("user_id", "status");

-- CreateIndex
CREATE INDEX "Conversation_interview_id_idx" ON "Conversation"("interview_id");

-- CreateIndex
CREATE INDEX "Conversation_interview_id_question_number_idx" ON "Conversation"("interview_id", "question_number");

-- CreateIndex
CREATE INDEX "Message_conversation_id_idx" ON "Message"("conversation_id");

-- CreateIndex
CREATE INDEX "Message_conversation_id_timestamp_idx" ON "Message"("conversation_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFeedback_conversation_id_key" ON "QuestionFeedback"("conversation_id");

-- CreateIndex
CREATE INDEX "QuestionFeedback_conversation_id_idx" ON "QuestionFeedback"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewResult_interview_id_key" ON "InterviewResult"("interview_id");

-- CreateIndex
CREATE INDEX "InterviewResult_user_id_idx" ON "InterviewResult"("user_id");

-- CreateIndex
CREATE INDEX "InterviewResult_interview_id_idx" ON "InterviewResult"("interview_id");

-- CreateIndex
CREATE INDEX "InterviewResult_decision_idx" ON "InterviewResult"("decision");

-- CreateIndex
CREATE UNIQUE INDEX "UserMetrics_user_id_key" ON "UserMetrics"("user_id");

-- CreateIndex
CREATE INDEX "UserMetrics_user_id_idx" ON "UserMetrics"("user_id");

-- AddForeignKey
ALTER TABLE "UserRoleRelation" ADD CONSTRAINT "UserRoleRelation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleRelation" ADD CONSTRAINT "UserRoleRelation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keystores" ADD CONSTRAINT "keystores_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFeedback" ADD CONSTRAINT "QuestionFeedback_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResult" ADD CONSTRAINT "InterviewResult_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResult" ADD CONSTRAINT "InterviewResult_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
