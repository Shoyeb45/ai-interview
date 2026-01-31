import { Router } from "express";
import { validator } from "../../middlewares/validator.middleware";
import interviewAgentSchema from "./../interview-agent/schema";
import { ValidationSource } from "../../helpers/validator";
import { asyncHandler } from "../../core/asyncHandler";
import { ProtectedRequest } from "../../types/app-requests";
import { verifyInterviewAgent } from "../interview-agent/validator";
import interviewRepo from "../../database/repositories/interview.repo";
import { authorize } from "../../middlewares/authorize.middleware";
import { RoleCode } from "@prisma/client";
import { SuccessResponse } from "../../core/ApiResponse";

const router = Router();

router.post(
    '/:interviewAgentId',
    authorize(RoleCode.USER),
    validator(interviewAgentSchema.interviewAgentParam, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);
        await verifyInterviewAgent(interviewAgentId);

        const ids = await interviewRepo.initiateInterview(interviewAgentId, req.user.id);
        
        new SuccessResponse('Session created.', ids).send(res);
    })
);
export default router;