import { SuccessMsgResponse } from '../../core/ApiResponse';
import { asyncHandler } from '../../core/asyncHandler';
import KeystoreRepo from '../../database/repositories/KeystoreRepo';
import { Router } from 'express';
import authentication from '../../middlewares/authentication.middleware';
import { ProtectedRequest } from '../../types/app-requests';
import { clearCookies } from '../../core/cookieUtils';

const router = Router();

router.use(authentication);

router.delete(
    '/',
    asyncHandler(async (req: ProtectedRequest, res) => {
        await KeystoreRepo.remove(req.keystore.id);
        // remove cookies 
        clearCookies(res);
        new SuccessMsgResponse('Logout Success').send(res);
    }),
);

export default router;
