import { Router } from 'express';
import authenticationMiddleware from '../../middlewares/authentication.middleware';
import basicOperationsRoutes from "./basic-operations";
import userInterviewRoutes from "./user-interview";
import generateRoutes from "./generate-questions";

const router = Router();

router.use(authenticationMiddleware);

router.use('/user', userInterviewRoutes);
router.use('/generate-questions', generateRoutes);
router.use('/', basicOperationsRoutes);

export default router;
