import { prisma } from '..';
import { HiringDecision } from '@prisma/client';

interface CreateInterviewResultInput {
    interviewId: number;
    sessionId: number;
    userId: number;
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    cultureFitScore: number;
    skillScores: Record<string, number>;
    topStrengths: string[];
    topWeaknesses: string[];
    decision: HiringDecision;
    roleReadinessPercent: number;
    improvementPlan: Record<string, string[]>;
    detailedFeedback: string;
    transcriptSummary: string;
    totalQuestions: number;
    questionsAnswered: number;
    questionsSkipped?: number;
    avgResponseTime: number;
    avgConfidence: number;
    totalHintsUsed: number;
    interviewDuration: number;
}

const createInterviewResult = async (data: CreateInterviewResultInput) => {
    return await prisma.interviewResult.create({
        data: {
            interviewId: data.interviewId,
            sessionId: data.sessionId,
            userId: data.userId,
            overallScore: data.overallScore,
            technicalScore: data.technicalScore,
            communicationScore: data.communicationScore,
            problemSolvingScore: data.problemSolvingScore,
            cultureFitScore: data.cultureFitScore,
            skillScores: data.skillScores,
            topStrengths: data.topStrengths,
            topWeaknesses: data.topWeaknesses,
            decision: data.decision,
            roleReadinessPercent: data.roleReadinessPercent,
            improvementPlan: data.improvementPlan,
            detailedFeedback: data.detailedFeedback,
            transcriptSummary: data.transcriptSummary,
            totalQuestions: data.totalQuestions,
            questionsAnswered: data.questionsAnswered,
            questionsSkipped: data.questionsSkipped ?? 0,
            avgResponseTime: data.avgResponseTime,
            avgConfidence: data.avgConfidence,
            totalHintsUsed: data.totalHintsUsed,
            interviewDuration: data.interviewDuration,
        },
    });
};

export default {
    createInterviewResult,
};
