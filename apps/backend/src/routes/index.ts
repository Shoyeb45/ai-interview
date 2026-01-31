import { Router } from 'express';
import healthRoutes from './health/index.js';
import authRoutes from './auth';
import interviewAgentRoutes from './interview-agent';
import userRoutes from './user';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/interview-agent', interviewAgentRoutes);
router.use('/user', userRoutes);

export default router;
