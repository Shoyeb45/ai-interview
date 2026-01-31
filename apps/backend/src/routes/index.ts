import { Router } from 'express';
import healthRoutes from "./health/index.js";
import authRoutes from "./auth";


const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

export default router;