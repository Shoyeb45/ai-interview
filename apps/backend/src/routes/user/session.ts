import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import interviewSessionRepo from '../../database/repositories/interview-session.repo';
import { SuccessResponse } from '../../core/ApiResponse';
import _ from 'lodash';
import { validator } from '../../middlewares/validator.middleware';
import schema from './schema';
import { ValidationSource } from '../../helpers/validator';
import interviewRepo from '../../database/repositories/interview.repo';

const router = Router();

router.get(
    '/',
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const sessions = await interviewSessionRepo.getSessionsByUserId(
            req.user.id,
        );
        new SuccessResponse('Interview sessions fetched.', sessions).send(res);
    }),
);

router.get(
    '/result/:sessionId',
    validator(schema.sessionParams, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const sessionId = Number(req.params.sessionId);
        const result = await interviewRepo.getDetailedInterviewResultBySession(sessionId);
        new SuccessResponse('Result fetched.', result).send(res);
    })
);

export default router;
