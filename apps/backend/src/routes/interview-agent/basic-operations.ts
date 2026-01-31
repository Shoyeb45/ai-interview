import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.middleware';
import { QuestionSelectionMode, RoleCode } from '@prisma/client';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { validator } from '../../middlewares/validator.middleware';
import schema, { InterviewAgentSchema } from './schema';
import { ValidationSource } from '../../helpers/validator';
import { SuccessMsgResponse, SuccessResponse } from '../../core/ApiResponse';
import interviewAgentRepo from '../../database/repositories/interview-agent.repo';
import { BadRequestError, ForbiddenError } from '../../core/ApiError';
import { verifyInterviewAgent, verifyQuestionExists } from './validator';

const router = Router();


router.get(
    '/detailed/:interviewAgentId',
    authorize(RoleCode.HIRING_MANAGER),
    validator(schema.interviewAgentParam, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);
        const agent = await interviewAgentRepo.getInterviewAgentWithQuestionsById(
            interviewAgentId,
        );
        if (!agent) throw new BadRequestError('Invalid interview agent ID');

        new SuccessResponse('Interview agent fetched.', agent).send(res);
    })
)

// delete specific question
router.delete(
    '/question/:questionId',
    authorize(RoleCode.HIRING_MANAGER),
    validator(schema.questionParam, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const questionId = Number(req.params.questionId);

        const question = await verifyQuestionExists(questionId);
        if (question.interviewAgent.createdById !== req.user.id)
            throw new ForbiddenError(
                'Not allowed to perfrom delete operation.',
            );

        await interviewAgentRepo.deleteQuestionById(questionId);

        new SuccessMsgResponse('Question deleted successfully.').send(
            res,
        );
    }),
);

router.post(
    '/',
    authorize(RoleCode.HIRING_MANAGER),
    validator(schema.createInterviewAgent, ValidationSource.BODY),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const data = req.body as InterviewAgentSchema['CreateInterviewAgent'];
        const userId = req.user.id;

        if (
            data.questionSelectionMode === QuestionSelectionMode.CUSTOM_ONLY &&
            data.questions.length !== data.totalQuestions
        )
            throw new BadRequestError(
                'Please provide valid number of questions.',
            );

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

        new SuccessResponse('Interview agents fetched successfully.', interviewAgents).send(res);
    }),
);

router.get(
    '/:interviewAgentId',
    authorize(RoleCode.HIRING_MANAGER, RoleCode.USER),
    validator(schema.interviewAgentParam, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);
        const agent = await interviewAgentRepo.getInterviewAgentDetailById(
            interviewAgentId,
            req.user.id,
        );

        if (!agent) throw new BadRequestError('Invalid interview agent ID');

        new SuccessResponse('Interview agent fetched.', {
            ...agent,
            companyName: agent.createdBy.hiringManagerInformation?.companyName,
            userAttemptCount: agent.sessions.length,
            canUserAttempt:
                agent.sessions.length < agent.maxAttemptsPerCandidate &&
                (!agent.deadline || new Date() < agent.deadline),
        }).send(res);
    }),
);

// delete interview agent
router.delete(
    '/:interviewAgentId',
    authorize(RoleCode.HIRING_MANAGER),
    validator(schema.interviewAgentParam, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);

        const interviewAgent = await verifyInterviewAgent(interviewAgentId);
        if (interviewAgent.createdById !== req.user.id)
            throw new ForbiddenError(
                'Not allowed to perfrom delete operation.',
            );

        await interviewAgentRepo.softDelete(interviewAgentId);

        new SuccessMsgResponse('Interview Agent deleted successfully.').send(
            res,
        );
    }),
);



router.patch(
    '/:interviewAgentId',
    authorize(RoleCode.HIRING_MANAGER),
    validator(schema.interviewAgentParam, ValidationSource.PARAM),
    validator(schema.updateInterviewAgent, ValidationSource.BODY),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);
        const data = req.body as InterviewAgentSchema['UpdateInterviewAgent'];

        const interviewAgent = await verifyInterviewAgent(interviewAgentId);
        if (interviewAgent.createdById !== req.user.id)
            throw new ForbiddenError(
                'Not authorized to edit the interview agent.',
            );

        const updatedInterviewAgent = await interviewAgentRepo.update(
            interviewAgentId,
            data,
        );

        new SuccessResponse(
            'Updated interview agent successfully.',
            updatedInterviewAgent,
        ).send(res);
    }),
);

export default router;
