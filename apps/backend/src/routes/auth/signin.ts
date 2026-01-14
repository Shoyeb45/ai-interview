import { asyncHandler } from '../../core/asyncHandler';
import { Router } from 'express';
import { validator } from '../../middlewares/validator.middleware';
import schema from './schema';
import { PublicRequest } from '../../types/app-requests';
import UserRepo from '../../database/repositories/UserRepo';
import { AuthFailureError, BadRequestError } from '../../core/ApiError';
import crypto from 'crypto';
import KeystoreRepo from '../../database/repositories/KeystoreRepo';
import { createTokens, isPasswordCorrect } from '../../core/authUtils';
import { getUserData } from '../../core/utils';
import { SuccessResponse } from '../../core/ApiResponse';
import { ValidationSource } from '../../helpers/validator';
import { setCookies } from '../../core/cookieUtils';

const router = Router();

router.post(
    '/',
    validator(schema.signin, ValidationSource.BODY),
    asyncHandler(async (req: PublicRequest, res) => {
        const user = await UserRepo.findByEmail(req.body.email);

        if (!user) throw new BadRequestError('User not registered.');

        const isValid = await isPasswordCorrect(req.body.password, user.password);

        if (!isValid) throw new AuthFailureError('Authentication failure.');

        const accessTokenKey = crypto.randomBytes(64).toString('hex');
        const refreshTokenKey = crypto.randomBytes(64).toString('hex');

        await KeystoreRepo.create(user.id, accessTokenKey, refreshTokenKey);
        const tokens = await createTokens(
            user,
            accessTokenKey,
            refreshTokenKey,
        );
        const userData = getUserData(user);
        
        // Set cookie for browser 
        setCookies(res, tokens);

        new SuccessResponse('Login success.', {
            user: userData,
            tokens: tokens,
        }).send(res);
    }),
);

export default router;
