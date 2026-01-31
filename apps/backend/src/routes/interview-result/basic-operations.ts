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

const router = Router();

router.use(authorize(RoleCode.HIRING_MANAGER));

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

        new SuccessResponse('Fetched all attempts.', { attempts }).send(res);
    }),
);

export default router;
