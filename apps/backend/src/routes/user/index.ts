import { Router } from "express";
import { authorize } from "../../middlewares/authorize.middleware";
import { RoleCode } from "@prisma/client";
import userDashboardRoutes from "./user";
import sessionsRoutes from "./session";
import authenticationMiddleware from "../../middlewares/authentication.middleware";
const router = Router();

router.use(authenticationMiddleware, authorize(RoleCode.USER));

router.use('/dashboard', authorize(RoleCode.USER), userDashboardRoutes);
router.use('/sessions', authorize(RoleCode.USER), sessionsRoutes);

export default router;