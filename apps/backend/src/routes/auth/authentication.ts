import { Router } from 'express';
import { validator } from '../../middlewares/validator.middleware';
import schema from './schema';
import { ValidationSource } from '../../helpers/validator';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { getAccessToken, validateTokenData } from '../../core/authUtils';
import { TokenExpiredError } from 'jsonwebtoken';
import { AccessTokenError, AuthFailureError } from '../../core/ApiError';
import jwtUtils from '../../core/jwtUtils';
import UserRepo from '../../database/repositories/UserRepo';
import KeystoreRepo from '../../database/repositories/KeystoreRepo';
const router = Router();

export default router.use(
    validator(schema.auth, ValidationSource.REQUEST),
    asyncHandler(async (req: ProtectedRequest, _res, next) => {
        req.accessToken = getAccessToken(req);

        try {
            const payload = await jwtUtils.validate(req.accessToken);
            validateTokenData(payload);

            const userId = parseInt(payload.sub, 10);
            if (isNaN(userId)) throw new AuthFailureError('Invalid user ID in token');

            const user = await UserRepo.findById(userId);
            if (!user) throw new AuthFailureError('User not registered.');
            req.user = user;

            const keystore = await KeystoreRepo.findForKey(
                req.user.id,
                payload.prm,
            );
            if (!keystore) throw new AuthFailureError('Invalid access token.');
            req.keystore = keystore;

            return next();
        } catch (e) {
            if (e instanceof TokenExpiredError)
                throw new AccessTokenError(e.message);
            throw e;
        }
    }),
);
