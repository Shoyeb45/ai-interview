import { Router } from "express";
import { asyncHandler } from "../../core/asyncHandler";
import { ProtectedRequest } from "../../types/app-requests";
import interviewAgentRepo from "../../database/repositories/interview-agent.repo";
import { SuccessResponse } from "../../core/ApiResponse";
import _ from "lodash";

const router = Router();

router.use(
    '/available-interviews',
    asyncHandler<ProtectedRequest>(async (_req, res) => {
        const availableInterviews = await interviewAgentRepo.getAvailableInterviews();

        new SuccessResponse('Fetched available interviews.', {
            availableInterviews: availableInterviews.map(availableInterview => ({
                ..._.omit(availableInterview, ['createdBy']),
                ...{
                    hiringManagerName: availableInterview.createdBy.name,
                    companyName: availableInterview.createdBy.hiringManagerInformation?.companyName
                }
            }))
        }).send(res);
    })
);


export default router;