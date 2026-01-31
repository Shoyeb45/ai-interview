import { prisma } from '..';
import { InterviewAgentSchema } from '../../routes/interview-agent/schema';

const create = async (
    data: InterviewAgentSchema['CreateInterviewAgent'],
    userId: number,
) => {
    return await prisma.interviewAgent.create({
        data: {
            createdById: userId,
            ...data,
        },
    });
};

const getInterviewAgentsByHiringManagerId = async (createdById: number) =>
    await prisma.interviewAgent.findMany({
        where: {
            createdById,
        },
        select: {
            id: true,
            title: true,
            status: true,
            role: true,
            totalQuestions: true,
            estimatedDuration: true,
            sessions: {
                select: {
                    id: true,
                },
            },
        },
    });

const getInterviewAgentDetailById = async (id: number, userId?: number) =>
    await prisma.interviewAgent.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            role: true,
            jobDescription: true,
            totalQuestions: true,
            estimatedDuration: true,
            focusAreas: true,
            experienceLevel: true,
            maxAttemptsPerCandidate: true,
            deadline: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    hiringManagerInformation: {
                        select: {
                            companyName: true,
                        },
                    },
                },
            },
            sessions: {
                where: {
                    candidateId: userId,
                },
                select: {
                    id: true,
                    status: true,
                    startedAt: true,
                    completedAt: true,
                },
            },
        },
    });

export default {
    create,
    getInterviewAgentsByHiringManagerId,
    getInterviewAgentDetailById
};
