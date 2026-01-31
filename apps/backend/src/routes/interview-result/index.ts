import { Router } from 'express';
import leaderboardRoutes from './leaderboard';
import basicRoutes from './basic-operations';
import authenticationMiddleware from '../../middlewares/authentication.middleware';

const router = Router();

router.use(authenticationMiddleware);

router.use('/leaderboard', leaderboardRoutes);
router.use('/', basicRoutes);

export default router;
