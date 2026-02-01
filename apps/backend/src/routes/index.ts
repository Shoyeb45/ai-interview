import { Router } from 'express';
import healthRoutes from './health/index.js';
import authRoutes from './auth';
import interviewAgentRoutes from './interview-agent';
import interviewResultRoutes from './interview-result';
import interviewRoutes from './interview';
import userRoutes from './user';
import hiringManagerRoutes from './hiring-manager';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/interview-agent', interviewAgentRoutes);
router.use('/user', userRoutes);
router.use('/interview-result', interviewResultRoutes);
router.use('/interview', interviewRoutes);
router.use('/hiring-manager', hiringManagerRoutes);

export default router;
