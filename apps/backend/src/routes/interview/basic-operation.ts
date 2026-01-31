import { Router } from "express";
import { validator } from "../../middlewares/validator.middleware";
import interviewAgentSchema from "./../interview-agent/schema";
import { ValidationSource } from "../../helpers/validator";
import { asyncHandler } from "../../core/asyncHandler";
import { ProtectedRequest } from "../../types/app-requests";
import interviewRepo from "../../database/repositories/interview.repo";
import { authorize } from "../../middlewares/authorize.middleware";
import { RoleCode } from "@prisma/client";
import { SuccessResponse } from "../../core/ApiResponse";
import interviewAgentRepo from "../../database/repositories/interview-agent.repo";
import { BadRequestError } from "../../core/ApiError";

const router = Router();

async function canGiveInterview(agentId: number, userId: number) {
    const limits = await interviewAgentRepo.getInterviewAgentLimits(agentId, userId);
    if (!limits)
        throw new BadRequestError('Invalid Interview Agent ID.');

    if (!limits.canAcceptNewCandidates)
        throw new BadRequestError('Max Candidate limit reached.');
}

router.post(
    '/:interviewAgentId',
    authorize(RoleCode.USER),
    validator(interviewAgentSchema.interviewAgentParam, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);
        // await verifyInterviewAgent(interviewAgentId);
        await canGiveInterview(interviewAgentId, req.user.id);
        const ids = await interviewRepo.initiateInterview(interviewAgentId, req.user.id);

        new SuccessResponse('Session created.', ids).send(res);
    })
);
export default router;