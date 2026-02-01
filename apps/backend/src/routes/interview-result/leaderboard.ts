import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { validator } from '../../middlewares/validator.middleware';
import interviewAgentSchema from '../interview-agent/schema';
import { ValidationSource } from '../../helpers/validator';
import { verifyInterviewAgent } from '../interview-agent/validator';
import interviewAgentRepo from '../../database/repositories/interview-agent.repo';
import { SuccessResponse } from '../../core/ApiResponse';

const router = Router();

router.get(
    '/:interviewAgentId',
    validator(interviewAgentSchema.interviewAgentParam, ValidationSource.PARAM),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const interviewAgentId = Number(req.params.interviewAgentId);
        await verifyInterviewAgent(interviewAgentId);

        const leaderboard =
            await interviewAgentRepo.getLeaderboardByInterviewAgent(interviewAgentId);
        
        new SuccessResponse(
            'Leaderboard fetched successfully.',
            leaderboard,
        ).send(res);
    }),
);
export default router;
