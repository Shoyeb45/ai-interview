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
