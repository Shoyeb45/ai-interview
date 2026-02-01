import { CompanySize } from '@prisma/client';
import z from 'zod';

const updateHiringManagerProfile = z.object({
    companyName: z.string().min(1).max(255).optional(),
    companySize: z.enum(CompanySize).optional(),
    industry: z.string().min(1).max(255).optional(),
    department: z.string().min(1).max(255).optional(),
    teamName: z.string().max(255).nullable().optional(),
    linkedinUrl: z.string().url().nullable().optional().or(z.literal('')),
    website: z.string().url().nullable().optional().or(z.literal('')),
    maxActiveInterviews: z.number().int().min(1).max(1000).optional(),
});

const createHiringManagerProfile = z.object({
    companyName: z.string().min(1).max(255),
    companySize: z.enum(CompanySize),
    industry: z.string().min(1).max(255),
    department: z.string().min(1).max(255),
    teamName: z.string().max(255).nullable().optional(),
    linkedinUrl: z.string().url().nullable().optional().or(z.literal('')),
    website: z.string().url().nullable().optional().or(z.literal('')),
    maxActiveInterviews: z.number().int().min(1).max(1000).optional(),
});

export type HiringManagerProfileSchema = {
    UpdateHiringManagerProfile: z.infer<typeof updateHiringManagerProfile>;
    CreateHiringManagerProfile: z.infer<typeof createHiringManagerProfile>;
};

export default {
    updateHiringManagerProfile,
    createHiringManagerProfile,
};
