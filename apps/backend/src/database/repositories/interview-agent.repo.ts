import { InterviewAgentStatus } from '@prisma/client';
import { prisma } from '..';
import { InterviewAgentSchema } from '../../routes/interview-agent/schema';
import _ from 'lodash';


const create = async (
    data: InterviewAgentSchema['CreateInterviewAgent'],
    userId: number,
) => {
    return await prisma.$transaction(async (tx) => {
        const interviewAgent = await tx.interviewAgent.create({
            data: {
                createdById: userId,
                ..._.omit(data, ['questions']),
            },
        });

        const questions = await  data.questions.map(ques => ({
            interviewAgentId: interviewAgent.id,
            ...ques
        }));

        tx.interviewQuestion.createMany({
            data: questions
        });

        return interviewAgent;
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

const getAvailableInterviews = async () =>
    await prisma.interviewAgent.findMany({
        where: {
            isActive: true,
            status: InterviewAgentStatus.PUBLISHED,
        },
        select: {
            id: true,
            title: true,
            totalQuestions: true,
            estimatedDuration: true,
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
        },
    });

const softDelete = async (id: number) => 
    await prisma.interviewAgent.update({
        where: {
            id
        },
        data: {
            isActive: false
        }
    });

export default {
    create,
    getInterviewAgentsByHiringManagerId,
    getInterviewAgentDetailById,
    getAvailableInterviews,
    softDelete,
};
