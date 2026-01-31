import { Router } from 'express';
import healthRoutes from './health/index.js';
import authRoutes from './auth';
import interviewAgentRoutes from './interview-agent';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/interview-agent', interviewAgentRoutes);

export default router;
