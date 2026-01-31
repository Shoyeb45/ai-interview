import { prisma } from "..";

const getDetailedInterviewResultBySession = async (sessionId: number) =>
    await prisma.interviewResult.findUnique({
        where: {
            sessionId,
        },
        select: {
            id: true,
            overallScore: true,
            technicalScore: true,
            communicationScore: true,
            roleReadinessPercent: true,
            skillScores: true,
            topStrengths: true,
            topWeaknesses: true,
            improvementPlan: true,
        }
    });

export default {
    getDetailedInterviewResultBySession
};
