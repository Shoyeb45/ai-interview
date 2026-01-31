import { Router } from 'express';
import authenticationMiddleware from '../../middlewares/authentication.middleware';
import basicOperationsRoutes from "./basic-operations";

const router = Router();

router.use(authenticationMiddleware);

router.use('/', basicOperationsRoutes);

export default router;
