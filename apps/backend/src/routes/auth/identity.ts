import { Router } from "express";
import authentication from "../../middlewares/authentication.middleware";
import { ProtectedRequest } from "../../types/app-requests";
import { asyncHandler } from "../../core/asyncHandler";
import { SuccessResponse } from "../../core/ApiResponse";


const router = Router();

router.use(authentication);

router.get(
    '/',
    asyncHandler<ProtectedRequest>(async (req, res) => {
        new SuccessResponse('User details.', {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            roles: req.user.roles.map(role => role.code)
        }).send(res);
    })
);

export default router;
