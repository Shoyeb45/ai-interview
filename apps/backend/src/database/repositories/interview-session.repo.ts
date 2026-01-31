import { prisma } from '..';

const getSessionsByUserId = async (userId: number) =>
    await prisma.candidateInterviewSession.findMany({
        where: {
            candidateId: userId
        },
        select: {
            status: true,
            startedAt: true,
            createdAt: true,
            overallResult: {
                select: {
                    overallScore: true,
                    decision: true,
                },
            },
            interviewAgent: {
                select: {
                    id: true,
                    title: true,
                    role: true
                }
            }
        },
    });




export default {
    getSessionsByUserId
};