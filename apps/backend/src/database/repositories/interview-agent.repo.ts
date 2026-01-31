import { InterviewAgentStatus } from '@prisma/client';
import { InterviewAgentSchema } from '../../routes/interview-agent/schema';
import _ from 'lodash';
import { prisma } from '..';

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

        const questions = await data.questions.map((ques) => ({
            interviewAgentId: interviewAgent.id,
            ...ques,
        }));

        tx.interviewQuestion.createMany({
            data: questions,
        });

        return interviewAgent;
    });
};

const getInterviewAgentsByHiringManagerId = async (createdById: number) =>
    await prisma.interviewAgent.findMany({
        where: {
            createdById,
            isActive: true,
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
            // openingMessage: true,
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
            deadline: {
                gte: new Date()
            }
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
            id,
        },
        data: {
            isActive: false,
        },
    });

const checkById = async (id: number) =>
    await prisma.interviewAgent.findUnique({
        where: {
            id,
            isActive: true,
        },
        select: {
            id: true,
            createdById: true,
        },
    });

interface LeaderboardEntry {
    rank: number;
    candidateId: number;
    candidateName: string;
    candidateEmail: string;
    totalAttempts: number;
    completedAttempts: number;
    bestScore: number;
    latestDecision: string;
    lastCompletedAt: Date | null;
}

async function getLeaderboardByInterviewAgent(
    interviewAgentId: number,
): Promise<LeaderboardEntry[]> {
    // Fetch all sessions for this interview agent with their results
    const sessions = await prisma.candidateInterviewSession.findMany({
        where: {
            interviewAgentId,
            status: {
                in: ['COMPLETED', 'IN_PROGRESS', 'ABANDONED'], // Include all attempts
            },
        },
        include: {
            candidate: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            overallResult: {
                select: {
                    overallScore: true,
                    decision: true,
                },
            },
        },
        orderBy: {
            completedAt: 'desc',
        },
    });

    // Group sessions by candidate and calculate best score
    const candidateMap = new Map<
        number,
        {
            candidateId: number;
            candidateName: string;
            candidateEmail: string;
            totalAttempts: number;
            completedAttempts: number;
            bestScore: number;
            latestDecision: string | null;
            lastCompletedAt: Date | null;
        }
    >();

    for (const session of sessions) {
        const candidateId = session.candidate.id;

        if (!candidateMap.has(candidateId)) {
            candidateMap.set(candidateId, {
                candidateId: session.candidate.id,
                candidateName: session.candidate.name,
                candidateEmail: session.candidate.email,
                totalAttempts: 0,
                completedAttempts: 0,
                bestScore: 0,
                latestDecision: null,
                lastCompletedAt: null,
            });
        }

        const candidate = candidateMap.get(candidateId)!;

        // Count all attempts
        candidate.totalAttempts++;

        // Count completed attempts and track scores
        if (session.status === 'COMPLETED' && session.overallResult) {
            candidate.completedAttempts++;

            // Update best score
            if (session.overallResult.overallScore > candidate.bestScore) {
                candidate.bestScore = session.overallResult.overallScore;
            }

            // Update latest decision and completion date (sessions are ordered by completedAt desc)
            if (
                !candidate.lastCompletedAt ||
                (session.completedAt &&
                    session.completedAt > candidate.lastCompletedAt)
            ) {
                candidate.latestDecision = session.overallResult.decision;
                candidate.lastCompletedAt = session.completedAt;
            }
        }
    }

    // Convert map to array and sort by best score (descending)
    const leaderboard = Array.from(candidateMap.values())
        .filter((candidate) => candidate.completedAttempts > 0) // Only include candidates with at least one completed attempt
        .sort((a, b) => b.bestScore - a.bestScore)
        .map((candidate, index) => ({
            rank: index + 1,
            ...candidate,
            latestDecision: candidate.latestDecision || 'N/A',
        }));

    return leaderboard;
}

const deleteQuestionById = async (questionId: number) =>
    await prisma.interviewQuestion.delete({
        where: {
            id: questionId,
        },
    });

const update = async (
    interviewAgentId: number,
    data: InterviewAgentSchema['UpdateInterviewAgent'],
) => {
    return prisma.$transaction(async (tx) => {
        // Update the interview agent (excluding questions)
        const interviewAgent = await tx.interviewAgent.update({
            where: {
                id: interviewAgentId,
            },
            data: {
                ..._.omitBy(_.omit(data, ['questions']), _.isNil),
            },
        });

        // Handle questions when payload includes questions (array may be empty = remove all)
        if (data.questions !== undefined) {
            const questionUpdates: Promise<unknown>[] = [];
            const questionIdsInUpdate: number[] = [];

            data.questions.forEach((question) => {
                if (question.questionId) {
                    // Track existing question IDs
                    questionIdsInUpdate.push(question.questionId);

                    // Update existing question
                    questionUpdates.push(
                        tx.interviewQuestion.update({
                            where: {
                                id: question.questionId,
                            },
                            data: {
                                ..._.omitBy(
                                    _.omit(question, ['questionId']),
                                    _.isNil,
                                ),
                            },
                        }),
                    );
                } else {
                    // Create new question (no questionId means it's new)
                    questionUpdates.push(
                        tx.interviewQuestion.create({
                            data: {
                                interviewAgentId,
                                questionText: question.questionText!,
                                category: question.category!,
                                difficulty: question.difficulty!,
                                orderIndex: question.orderIndex!,
                                estimatedTime: question.estimatedTime ?? 5,
                                expectedKeywords:
                                    question.expectedKeywords ?? [],
                                focusAreas: question.focusAreas ?? [],
                                // Add other optional fields as needed
                            },
                        }),
                    );
                }
            });

            // Delete questions that were removed from the list (exist in DB but not in payload)
            questionUpdates.push(
                tx.interviewQuestion.deleteMany({
                    where: {
                        interviewAgentId,
                        ...(questionIdsInUpdate.length > 0
                            ? { id: { notIn: questionIdsInUpdate } }
                            : {}),
                    },
                }),
            );

            await Promise.all(questionUpdates);
        }

        return interviewAgent;
    });
};

const checkQuestionById = async (questionId: number) => {
    return await prisma.interviewQuestion.findUnique({
        where: { id: questionId },
        select: {
            id: true,
            interviewAgent: {
                select: {
                    createdById: true
                }
            }
        }
    });
};

const getInterviewAgentWithQuestionsById = async (interviewAgentId: number) => {
    return await prisma.interviewAgent.findUnique({
        where: {
            id: interviewAgentId,
            isActive: true
        },
        select: {
            id: true,
            title: true,
            role: true,
            jobDescription: true,
            experienceLevel: true,
            totalQuestions: true,
            estimatedDuration: true,
            focusAreas: true,
            questionSelectionMode: true,

            questions: {
                select: {
                    id: true,
                    questionText: true,
                    category: true,
                    difficulty: true,
                    orderIndex: true,
                    estimatedTime: true,
                }
            },
            maxCandidates: true,
            maxAttemptsPerCandidate: true,
            deadline: true,
            status: true,
            openingMessage: true
        }
    });
}

export default {
    create,
    getInterviewAgentsByHiringManagerId,
    getInterviewAgentDetailById,
    getAvailableInterviews,
    softDelete,
    getLeaderboardByInterviewAgent,
    checkById,
    update,
    deleteQuestionById,
    checkQuestionById,
    getInterviewAgentWithQuestionsById
};
