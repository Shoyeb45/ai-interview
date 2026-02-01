import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.middleware';
import { RoleCode } from '@prisma/client';
import authenticationMiddleware from '../../middlewares/authentication.middleware';
import profileRoutes from './profile';

const router = Router();

// Protect all routes with authentication and HIRING_MANAGER role
router.use(authenticationMiddleware, authorize(RoleCode.HIRING_MANAGER));

// Profile routes
router.use('/', profileRoutes);

export default router;
