/**
 * Interview initiation API.
 * Replace the implementation of initiateInterview with your actual backend call
 * that creates/starts the session and returns sessionId + interviewId.
 */

import { startSession } from "@/lib/mockApi";
import apiClient from "./apiClient";

export interface InitiateInterviewResult {
  sessionId: number;
  interviewId: number;
}

/** Context passed from start page to live interview (e.g. via sessionStorage). */
export interface InterviewContext {
  title: string;
  role: string;
  companyName?: string;
  hiringManagerName?: string;
  totalQuestions: number;
  estimatedDuration: number;
  focusAreas: string[];
  experienceLevel?: string;
  interviewId?: number;
  sessionId?: number
}

export const INTERVIEW_CONTEXT_STORAGE_KEY = "interviewContext";

/**
 * Initiates an interview for the given agent.
 * Shows loading on the client while this runs; use for "Preparing interview" flow.
 *
 * TODO: Replace with actual API call, e.g.:
 *   const res = await apiClient.post<InitiateInterviewResult>(
 *     `/interview-agent/${agentId}/initiate`,
 *     {}
 *   );
 *   return res;
 */
export async function initiateInterview(
  agentId: number
): Promise<InitiateInterviewResult> {
  // Mock: delegates to startSession; replace with real API when ready.
  const session = await apiClient.post<InitiateInterviewResult>(`/interview/${agentId}`);
  return {
    sessionId: session.sessionId,
    interviewId: session.interviewId,
  };
}
