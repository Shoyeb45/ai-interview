import { Router } from 'express';
import { validator } from '../../middlewares/validator.middleware';
import { ValidationSource } from '../../helpers/validator';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { authorize } from '../../middlewares/authorize.middleware';
import { RoleCode } from '@prisma/client';
import schema from './schema';
import { verifyInterviewAgent } from '../interview-agent/validator';
import interviewRepo from '../../database/repositories/interview.repo';
import { SuccessResponse } from '../../core/ApiResponse';
import { NotFoundError } from '../../core/ApiError';

const router = Router();

router.use(authorize(RoleCode.HIRING_MANAGER));

router.get(
    '/session/:sessionId',
    validator(schema.sessionResultParams, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const sessionId = Number(req.params.sessionId);
        const hiringManagerId = req.user.id;

        const session = await interviewRepo.getSessionResultForHiringManager(
            sessionId,
            hiringManagerId,
        );

        if (!session) {
            throw new NotFoundError('Session or result not found.');
        }

        if (!session.overallResult) {
            throw new NotFoundError('No result for this session yet.');
        }

        const result = session.overallResult;
        new SuccessResponse('Result fetched.', {
            id: result.id,
            overallScore: result.overallScore,
            technicalScore: result.technicalScore,
            communicationScore: result.communicationScore,
            problemSolvingScore: result.problemSolvingScore,
            cultureFitScore: result.cultureFitScore,
            decision: result.decision,
            roleReadinessPercent: result.roleReadinessPercent,
            skillScores: result.skillScores,
            topStrengths: result.topStrengths,
            topWeaknesses: result.topWeaknesses,
            improvementPlan: result.improvementPlan,
            detailedFeedback: result.detailedFeedback,
            transcriptSummary: result.transcriptSummary,
            totalQuestions: result.totalQuestions,
            questionsAnswered: result.questionsAnswered,
            questionsSkipped: result.questionsSkipped,
            avgResponseTime: result.avgResponseTime,
            interviewDuration: result.interviewDuration,
            candidateId: session.candidateId,
            candidateName: session.candidate?.name ?? `Candidate ${session.candidateId}`,
            candidateEmail: session.candidate?.email ?? null,
        }).send(res);
    }),
);

router.get(
    '/:interviewAgentId/attempts/:userId',
    validator(schema.userInterviewParams, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const userId = Number(req.params.userId);
        const interviewAgentId = Number(req.params.interviewAgentId);

        await verifyInterviewAgent(interviewAgentId);

        const attempts = await interviewRepo.getUserInterviewAttempts(
            userId,
            interviewAgentId,
        );

        new SuccessResponse('Fetched all attempts.', attempts).send(res);
    }),
);

export default router;
