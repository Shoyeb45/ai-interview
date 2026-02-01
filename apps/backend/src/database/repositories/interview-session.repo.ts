import { SessionStatus } from '@prisma/client';
import { prisma } from '..';

const getSessionsByUserId = async (userId: number) =>
    await prisma.candidateInterviewSession.findMany({
        where: {
            candidateId: userId
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            interviewId: true,
            status: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
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
                    role: true,
                },
            },
        },
    });


const startInterview = async (sessionId: number) => {
    return await prisma.candidateInterviewSession.update({
        where: {
            id: sessionId
        },
        data: {
            startedAt: new Date(),
            status: SessionStatus.IN_PROGRESS,
        }
    });
}

const endInterview = async (sessionId: number) => {
    return await prisma.candidateInterviewSession.update({
        where: {
            id: sessionId,
        },
        data: {
            status: SessionStatus.COMPLETED,
            completedAt: new Date(),
        }
    });
}

const abandonInterview = async (sessionId: number, abandonReason?: string) => {
    const session = await prisma.candidateInterviewSession.findUnique({
        where: { id: sessionId },
        select: { status: true },
    });
    if (!session) return null;
    // Never overwrite successful completion or cheated status with abandon
    if (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.CHEATED) {
        return null;
    }
    return await prisma.candidateInterviewSession.update({
        where: {
            id: sessionId,
        },
        data: {
            status: SessionStatus.ABANDONED,
            abandonedAt: new Date(),
            abandonReason: abandonReason ?? null,
        }
    });
}

const cheatInterview = async (sessionId: number, reason: string = 'tab_change_violation') => {
    return await prisma.candidateInterviewSession.update({
        where: {
            id: sessionId,
        },
        data: {
            status: SessionStatus.CHEATED,
            abandonedAt: new Date(),
            abandonReason: reason,
        }
    });
}

const incrementTabChangeCount = async (sessionId: number) => {
    return await prisma.candidateInterviewSession.update({
        where: {
            id: sessionId,
        },
        data: {
            tabChangeCount: {
                increment: 1,
            },
        }
    });
}

export default {
    getSessionsByUserId,
    endInterview,
    abandonInterview,
    cheatInterview,
    incrementTabChangeCount,
    startInterview
};