import { CompanySize, HiringManagerInformation } from '@prisma/client';
import { prisma } from '..';

/**
 * Get hiring manager profile by user ID
 */
async function getProfileByUserId(userId: number): Promise<HiringManagerInformation | null> {
    return prisma.hiringManagerInformation.findUnique({
        where: {
            hiringManagerId: userId,
        },
    });
}

/**
 * Create a new hiring manager profile
 */
async function createProfile(data: {
    hiringManagerId: number;
    companyName: string;
    companySize: CompanySize;
    industry: string;
    department: string;
    teamName?: string | null;
    linkedinUrl?: string | null;
    website?: string | null;
    maxActiveInterviews?: number;
}): Promise<HiringManagerInformation> {
    return prisma.hiringManagerInformation.create({
        data: {
            hiringManagerId: data.hiringManagerId,
            companyName: data.companyName,
            companySize: data.companySize,
            industry: data.industry,
            department: data.department,
            teamName: data.teamName,
            linkedinUrl: data.linkedinUrl,
            website: data.website,
            maxActiveInterviews: data.maxActiveInterviews ?? 10,
        },
    });
}

/**
 * Update hiring manager profile
 */
async function updateProfile(
    userId: number,
    data: Partial<{
        companyName: string;
        companySize: CompanySize;
        industry: string;
        department: string;
        teamName: string | null;
        linkedinUrl: string | null;
        website: string | null;
        maxActiveInterviews: number;
    }>,
): Promise<HiringManagerInformation> {
    return prisma.hiringManagerInformation.update({
        where: {
            hiringManagerId: userId,
        },
        data,
    });
}

/**
 * Check if hiring manager profile exists
 */
async function profileExists(userId: number): Promise<boolean> {
    const count = await prisma.hiringManagerInformation.count({
        where: {
            hiringManagerId: userId,
        },
    });
    return count > 0;
}

/**
 * Get or create hiring manager profile with default values
 */
async function getOrCreateProfile(userId: number): Promise<HiringManagerInformation> {
    const existing = await getProfileByUserId(userId);
    if (existing) return existing;

    // Create default profile if it doesn't exist
    return createProfile({
        hiringManagerId: userId,
        companyName: 'My Company',
        companySize: 'STARTUP',
        industry: 'Technology',
        department: 'Engineering',
    });
}

export default {
    getProfileByUserId,
    createProfile,
    updateProfile,
    profileExists,
    getOrCreateProfile,
};
