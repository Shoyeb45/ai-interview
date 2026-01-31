import { Router } from "express";
import basicOperationRoutes from "./basic-operation";
import authenticationMiddleware from "../../middlewares/authentication.middleware";

const router = Router();

router.use(authenticationMiddleware);
router.use('/', basicOperationRoutes);

export default router;