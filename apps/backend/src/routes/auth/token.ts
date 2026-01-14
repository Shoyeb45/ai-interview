import { Router } from 'express';
import { validator } from '../../middlewares/validator.middleware';
import schema from './schema';
import { ValidationSource } from '../../helpers/validator';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { getAccessToken, getRefreshToken } from '../../core/authUtils';
import JWT from './../../core/jwtUtils';
import { validateTokenData, createTokens } from './../../core/authUtils';
import UserRepo from '../../database/repositories/UserRepo';
import KeystoreRepo from '../../database/repositories/KeystoreRepo';
import { AuthFailureError } from '../../core/ApiError';
import crypto from 'crypto';
import { TokenRefreshResponse } from '../../core/ApiResponse';
const router = Router();

router.post(
    '/refresh',
    validator(schema.auth, ValidationSource.REQUEST),
    validator(schema.refreshToken, ValidationSource.REQUEST),
    asyncHandler(async (req: ProtectedRequest, res) => {
        req.accessToken = getAccessToken(req);

        const accessTokenPayload = await JWT.decode(req.accessToken);
        validateTokenData(accessTokenPayload);

        const userId = parseInt(accessTokenPayload.sub, 10);
        if (isNaN(userId)) throw new AuthFailureError('Invalid user ID in token');

        const user = await UserRepo.findById(userId);

        if (!user) throw new AuthFailureError('User not registered');
        req.user = user;

        // get refresh token either from body for mobile or from cookies for web
        const refreshToken = getRefreshToken(req);

        const refreshTokenPayload = await JWT.validate(refreshToken);
        validateTokenData(refreshTokenPayload);

        if (accessTokenPayload.sub !== refreshTokenPayload.sub)
            throw new AuthFailureError('Invalid access token');

        const keystore = await KeystoreRepo.find(
            req.user.id,
            accessTokenPayload.prm,
            refreshTokenPayload.prm,
        );

        if (!keystore) throw new AuthFailureError('Invalid access token');
        await KeystoreRepo.remove(keystore.id);

        const accessTokenKey = crypto.randomBytes(64).toString('hex');
        const refreshTokenKey = crypto.randomBytes(64).toString('hex');

        await KeystoreRepo.create(req.user.id, accessTokenKey, refreshTokenKey);
        const tokens = await createTokens(
            req.user,
            accessTokenKey,
            refreshTokenKey,
        );

        new TokenRefreshResponse(
            'Token Issued',
            tokens.accessToken,
            tokens.refreshToken,
        ).send(res);
    }),
);

export default router;
