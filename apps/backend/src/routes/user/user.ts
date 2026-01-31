import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { SuccessResponse } from '../../core/ApiResponse';
import userRepo from '../../database/repositories/UserRepo';

const router = Router();

router.get(
    '/',
    asyncHandler<ProtectedRequest>(async (req, res) => {
        // get: totalInterviews, completed, averageScore, practiceTime, strongestSkills, needsWork
        const dashboardData = await userRepo.getUserDashboard(req.user.id);

        new SuccessResponse('Not implemented.', {
            userId: req.user.id,
            totalInterviews: dashboardData.totalInterviews,
            completedInterviews: dashboardData.completed,
            averageScore: dashboardData.averageScore,
            //   scoreHistory: dashboardData,
            //   skillProgress: Record<string, number[]>,
            totalPracticeTime: dashboardData.practiceTime,
            //   avgInterviewDuration: number,
            strongestSkills: dashboardData.strongestSkills,
            improvingSkills: dashboardData.improvingSkills,
            needsWorkSkills: dashboardData.needsWork,
            //   lastInterviewDate: string | null,
        }).send(res);
    }),
);

export default router;
