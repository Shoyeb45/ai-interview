import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { ProtectedRequest } from '../../types/app-requests';
import { SuccessResponse } from '../../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../../core/ApiError';
import hiringManagerRepo from '../../database/repositories/hiring-manager.repo';
import schema from './schema';
import { validator } from '../../middlewares/validator.middleware';
import { ValidationSource } from '../../helpers/validator';

const router = Router();

/**
 * GET /hiring-manager/profile
 * Get the hiring manager profile for the authenticated user
 */
router.get(
    '/profile',
    asyncHandler<ProtectedRequest>(async (req, res) => {
        const profile = await hiringManagerRepo.getProfileByUserId(req.user.id);

        if (!profile) {
            throw new NotFoundError('Hiring manager profile not found');
        }

        new SuccessResponse('Profile retrieved successfully', profile).send(res);
    }),
);

/**
 * POST /hiring-manager/profile
 * Create a hiring manager profile for the authenticated user
 */
router.post(
    '/profile',
    validator(schema.createHiringManagerProfile, ValidationSource.BODY),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        // Check if profile already exists
        const exists = await hiringManagerRepo.profileExists(req.user.id);
        if (exists) {
            throw new BadRequestError('Profile already exists. Use PATCH to update.');
        }

        // Convert empty strings to null for optional URL fields
        const data = {
            ...req.body,
            linkedinUrl: req.body.linkedinUrl === '' ? null : req.body.linkedinUrl,
            website: req.body.website === '' ? null : req.body.website,
            hiringManagerId: req.user.id,
        };

        const profile = await hiringManagerRepo.createProfile(data);

        new SuccessResponse('Profile created successfully', profile).send(res);
    }),
);

/**
 * PATCH /hiring-manager/profile
 * Update the hiring manager profile for the authenticated user
 */
router.patch(
    '/profile',
    validator(schema.updateHiringManagerProfile, ValidationSource.BODY),
    asyncHandler<ProtectedRequest>(async (req, res) => {
        // Check if profile exists
        const exists = await hiringManagerRepo.profileExists(req.user.id);
        if (!exists) {
            throw new NotFoundError('Profile not found. Create one first.');
        }

        // Convert empty strings to null for optional URL fields
        const updateData = { ...req.body };
        if ('linkedinUrl' in updateData && updateData.linkedinUrl === '') {
            updateData.linkedinUrl = null;
        }
        if ('website' in updateData && updateData.website === '') {
            updateData.website = null;
        }

        const updatedProfile = await hiringManagerRepo.updateProfile(
            req.user.id,
            updateData,
        );

        new SuccessResponse('Profile updated successfully', updatedProfile).send(res);
    }),
);

export default router;
