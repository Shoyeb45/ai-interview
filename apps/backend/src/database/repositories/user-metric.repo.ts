import { prisma } from '..';


async function getUserMetrics(userId: number) {
    let metrics = await prisma.userMetrics.findUnique({
        where: { userId },
    });

    // If metrics don't exist, create them
    if (!metrics) {
        metrics = await prisma.userMetrics.create({
            data: {
                userId,
                totalInterviews: 0,
                completedInterviews: 0,
                averageScore: 0,
                scoreHistory: [],
                skillProgress: {},
                totalPracticeTime: 0,
                avgInterviewDuration: 0,
                strongestSkills: [],
                improvingSkills: [],
                needsWorkSkills: [],
            },
        });
    }

    return metrics;
}

export default {
    getUserMetrics,
};
