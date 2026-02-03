/**
 * User / Candidate API
 * APIs for the logged-in user (candidate side), e.g. my sessions
 */

import apiClient from './apiClient';

/**
 * Response shape from GET /user/sessions
 */
export type MySessionItem = {
  id: number;
  interviewId: number;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  overallResult: {
    overallScore: number;
    decision: string;
  } | null;
  interviewAgent: {
    id: number;
    title: string;
    role: string;
  };
};

/**
 * Get all interview sessions for the authenticated candidate (current user).
 * GET /user/sessions
 */
export async function getMySessions(): Promise<MySessionItem[]> {
  return apiClient.get<MySessionItem[]>('/user/sessions');
}

export interface InterviewResult {
  id: number;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  roleReadinessPercent: number;
  skillScores: Record<string, number>;
  topStrengths: string[];
  topWeaknesses: string[];
  improvementPlan: Record<string, string[]>;
}

/**
 * Get interview result for a session
 * GET /user/sessions/result/:sessionId
 */
export async function getSessionResult(sessionId: number): Promise<InterviewResult | null> {
  return apiClient.get<InterviewResult | null>(`/user/sessions/result/${sessionId}`);
}
