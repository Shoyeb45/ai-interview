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

const checkById = async (id: number) => 
    await prisma.interviewAgent.findUnique({
        where: {
            id,
            isActive: true
        },
        select: {
            id: true
        }
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

export async function getLeaderboardByInterviewAgent(
  interviewAgentId: number
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
  const candidateMap = new Map<number, {
    candidateId: number;
    candidateName: string;
    candidateEmail: string;
    totalAttempts: number;
    completedAttempts: number;
    bestScore: number;
    latestDecision: string | null;
    lastCompletedAt: Date | null;
  }>();

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
      if (!candidate.lastCompletedAt || (session.completedAt && session.completedAt > candidate.lastCompletedAt)) {
        candidate.latestDecision = session.overallResult.decision;
        candidate.lastCompletedAt = session.completedAt;
      }
    }
  }

  // Convert map to array and sort by best score (descending)
  const leaderboard = Array.from(candidateMap.values())
    .filter(candidate => candidate.completedAttempts > 0) // Only include candidates with at least one completed attempt
    .sort((a, b) => b.bestScore - a.bestScore)
    .map((candidate, index) => ({
      rank: index + 1,
      ...candidate,
      latestDecision: candidate.latestDecision || 'N/A',
    }));

  return leaderboard;
}

export default {
    create,
    getInterviewAgentsByHiringManagerId,
    getInterviewAgentDetailById,
    getAvailableInterviews,
    softDelete,
    checkById
};
