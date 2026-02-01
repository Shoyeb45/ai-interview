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

/** Interview result for hiring manager (same shape as user API + candidate info) */
export interface HiringManagerSessionResult {
    id: number;
    candidateId?: number;
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    cultureFitScore: number;
    decision: string;
    roleReadinessPercent: number;
    skillScores: Record<string, number>;
    topStrengths: string[];
    topWeaknesses: string[];
    improvementPlan: Record<string, string[]>;
    detailedFeedback?: string;
    transcriptSummary?: string;
    totalQuestions?: number;
    questionsAnswered?: number;
    questionsSkipped?: number;
    avgResponseTime?: number;
    interviewDuration?: number;
    candidateName: string;
    candidateEmail: string | null;
}

/**
 * Get interview result for a session (hiring manager only)
 * GET /interview-result/session/:sessionId
 */
export async function getSessionResult(sessionId: number): Promise<HiringManagerSessionResult | null> {
    return apiClient.get<HiringManagerSessionResult | null>(`/interview-result/session/${sessionId}`);
}
