import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { SuccessResponse } from '../../core/ApiResponse';
import userRepo from '../../database/repositories/UserRepo';

const router = Router();

router.use(
    '/',
    asyncHandler<ProtectedRequest>(async (req, res) => {
        // get: totalInterviews, completed, averageScore, practiceTime, strongestSkills, needsWork
        const dashboardData = await userRepo.getUserDashboard(req.user.id);

        new SuccessResponse('Not implemented.', dashboardData).send(res);
    })
);



export default router;
