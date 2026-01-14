import { Router } from 'express';
import { validator } from '../../middlewares/validator.middleware';
import schema from './schema';
import { asyncHandler } from './../../core/asyncHandler';
import UserRepo from '../../database/repositories/UserRepo';
import { BadRequestError } from '../../core/ApiError';
import crypto from 'crypto';
import { createTokens } from '../../core/authUtils';
import { getUserData } from './../../core/utils';
import { SuccessResponse } from './../../core/ApiResponse';
import { ValidationSource } from '../../helpers/validator';
import bcryptjs from 'bcryptjs';
import { RoleCode } from '@prisma/client';
import { setCookies } from '../../core/cookieUtils';

const router = Router();

router.post(
    '/',
    validator(schema.signup, ValidationSource.BODY),
    asyncHandler(async (req, res) => {
        const user = await UserRepo.findByEmail(req.body.email);
        if (user) throw new BadRequestError('User already registered.');

        // Hash password
        const hashedPassword = await bcryptjs.hash(req.body.password, 12);

        const accessTokenKey = crypto.randomBytes(64).toString('hex');
        const refreshTokenKey = crypto.randomBytes(64).toString('hex');

        const { user: createdUser, keystore } = await UserRepo.create(
            {
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
            },
            accessTokenKey,
            refreshTokenKey,
            RoleCode.USER,
        );

        const tokens = await createTokens(
            createdUser,
            keystore.primaryKey,
            keystore.secondaryKey,
        );

        const userData = getUserData(createdUser);
        
        // Set cookie for browser 
        setCookies(res, tokens);

        new SuccessResponse('Signup successful.', {
            user: userData,
            tokens: tokens,
        }).send(res);
    }),
);

export default router;
