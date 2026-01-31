import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.middleware';
import { QuestionSelectionMode, RoleCode } from '@prisma/client';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { validator } from '../../middlewares/validator.middleware';
import schema, { InterviewAgentSchema } from './schema';
import { ValidationSource } from '../../helpers/validator';
import { SuccessResponse } from '../../core/ApiResponse';
import interviewAgentRepo from '../../database/repositories/interview-agent.repo';
import { BadRequestError } from '../../core/ApiError';

const router = Router();

router.post(
    '/',
    authorize(RoleCode.HIRING_MANAGER),
    validator(schema.createInterviewAgent, ValidationSource.BODY),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const data = req.body as InterviewAgentSchema['CreateInterviewAgent'];
        const userId = req.user.id;

        if (data.questionSelectionMode === QuestionSelectionMode.CUSTOM_ONLY && data.questions.length !== data.totalQuestions) 
            throw new BadRequestError('Please provide valid number of questions.');

        const createdInterviewAgent = await interviewAgentRepo.create(
            data,
            userId,
        );
        

        new SuccessResponse(
            'Interview Agent Created.',
            createdInterviewAgent,
        ).send(res);
    }),
);

router.get(
    '/',
    authorize(RoleCode.HIRING_MANAGER),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgents =
            await interviewAgentRepo.getInterviewAgentsByHiringManagerId(
                req.user.id,
            );

        new SuccessResponse('Interview agents fetched successfully.', {
            interviewAgents,
        }).send(res);
    }),
);

router.get(
    '/:interviewAgentId',
    authorize(RoleCode.HIRING_MANAGER, RoleCode.USER),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);
        const agent = await interviewAgentRepo.getInterviewAgentDetailById(
            interviewAgentId,
            req.user.id,
        );

        if (!agent) throw new BadRequestError('Invalid interview agent ID');

        new SuccessResponse('Interview agent fetched.', {
            ...agent,
            userAttemptCount: agent.sessions.length,
            canUserAttempt:
                agent.sessions.length < agent.maxAttemptsPerCandidate &&
                (!agent.deadline || new Date() < agent.deadline),
        }).send(res);
    }),
);

export default router;
