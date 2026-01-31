import { prisma } from '..';

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

interface UserAttempt {
  attemptNumber: number;
  sessionId: number;
  status: string;
  date: Date;
  decision: string | null;
  score: number | null;
  interviewResultId: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  abandonedAt: Date | null;
}

const getUserInterviewAttempts = async (
  userId: number,
  interviewAgentId: number
): Promise<UserAttempt[]> => {
  const sessions = await prisma.candidateInterviewSession.findMany({
    where: {
      candidateId: userId,
      interviewAgentId,
    },
    include: {
      overallResult: {
        select: {
          id: true,
          overallScore: true,
          decision: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc', 
    },
  });

  // Map sessions to attempt objects with attempt numbers
  const attempts: UserAttempt[] = sessions.map((session, index) => ({
    attemptNumber: index + 1,
    sessionId: session.id,
    status: session.status,
    date: session.createdAt,
    decision: session.overallResult?.decision || null,
    score: session.overallResult?.overallScore || null,
    interviewResultId: session.overallResult?.id || null,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    abandonedAt: session.abandonedAt,
  }));

  return attempts;
};


const initiateInterview = (interviewAgentId: number, userId: number) => {
  return prisma.$transaction(async (tx) => {
    // create interview container
    const interview = await tx.interview.create({
      data: {}
    }); 
    // create interview session
    const session = await tx.candidateInterviewSession.create({
      data: {
        interviewAgentId,
        interviewId: interview.id,
        candidateId: userId,
      }
    });

    return {
      interviewId: interview.id,
      sessionId: session.id
    };
  });
}
export default {
    getUserInterviewAttempts,
    getDetailedInterviewResultBySession,
    initiateInterview,
};
