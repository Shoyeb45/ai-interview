/**
 * Hiring Manager Profile API
 * Real API calls for hiring manager profile operations
 */

import apiClient from './apiClient';
import type { HiringManagerInformation, CompanySize } from '@/types/schema';

export interface UpdateHiringManagerProfileData {
    companyName?: string;
    companySize?: CompanySize;
    industry?: string;
    department?: string;
    teamName?: string | null;
    linkedinUrl?: string | null;
    website?: string | null;
    maxActiveInterviews?: number;
}

export interface CreateHiringManagerProfileData {
    companyName: string;
    companySize: CompanySize;
    industry: string;
    department: string;
    teamName?: string | null;
    linkedinUrl?: string | null;
    website?: string | null;
    maxActiveInterviews?: number;
}

/**
 * Get the hiring manager profile for the authenticated user
 */
export async function getHiringManagerProfile(): Promise<HiringManagerInformation> {
    return apiClient.get<HiringManagerInformation>('/hiring-manager/profile');
}

/**
 * Create a hiring manager profile
 */
export async function createHiringManagerProfile(
    data: CreateHiringManagerProfileData
): Promise<HiringManagerInformation> {
    return apiClient.post<HiringManagerInformation, CreateHiringManagerProfileData>(
        '/hiring-manager/profile',
        data
    );
}

/**
 * Update the hiring manager profile
 */
export async function updateHiringManagerProfile(
    data: UpdateHiringManagerProfileData
): Promise<HiringManagerInformation> {
    return apiClient.patch<HiringManagerInformation, UpdateHiringManagerProfileData>(
        '/hiring-manager/profile',
        data
    );
}
