// Schema-aligned types (matches Prisma schema)

export type RoleCode = "USER" | "HIRING_MANAGER";

export type CompanySize = "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export type InterviewAgentStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";

export type ExperienceLevel =
  | "INTERN"
  | "ENTRY_LEVEL"
  | "JUNIOR"
  | "MID_LEVEL"
  | "SENIOR"
  | "LEAD"
  | "PRINCIPAL";

export type SessionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "CANCELLED";

export type HiringDecision =
  | "STRONG_HIRE"
  | "HIRE"
  | "BORDERLINE"
  | "NO_HIRE"
  | "STRONG_NO_HIRE";

/** Roles from /auth/me: either string[] (e.g. ["USER"]) or { code: RoleCode }[] */
export type UserRoles = RoleCode[] | { code: RoleCode }[];

export interface User {
  id: number;
  name: string;
  email: string;
  /** API returns string[] e.g. ["USER"]; we support both shapes */
  roles: UserRoles;
  hiringManagerInformation?: HiringManagerInformation | null;
}

export interface HiringManagerInformation {
  id: number;
  hiringManagerId: number;
  companyName: string;
  companySize: CompanySize;
  industry: string;
  department: string;
  teamName: string | null;
  linkedinUrl: string | null;
  website: string | null;
  maxActiveInterviews: number;
}

export interface InterviewAgent {
  id: number;
  createdById: number;
  title: string;
  role: string;
  jobDescription: string;
  experienceLevel: ExperienceLevel;
  totalQuestions: number;
  estimatedDuration: number;
  focusAreas: string[];
  maxCandidates: number;
  maxAttemptsPerCandidate: number;
  deadline: string | null;
  status: InterviewAgentStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { sessions: number };
}

/** Minimal candidate info for leaderboard / HM views */
export interface CandidateInfo {
  id: number;
  name: string;
  email: string;
}

export interface CandidateInterviewSession {
  id: number;
  interviewAgentId: number;
  candidateId: number;
  interviewId: number;
  status: SessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  abandonedAt: string | null;
  abandonReason: string | null;
  createdAt: string;
  updatedAt: string;
  interviewAgent?: InterviewAgent;
  overallResult?: InterviewResult | null;
  /** Populated when fetching sessions for HM leaderboard */
  candidate?: CandidateInfo;
}

export interface InterviewResult {
  id: number;
  interviewId: number;
  sessionId: number;
  userId: number;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  cultureFitScore: number;
  skillScores: Record<string, number>;
  topStrengths: string[];
  topWeaknesses: string[];
  decision: HiringDecision;
  roleReadinessPercent: number;
  improvementPlan: Record<string, string[]>;
  detailedFeedback: string;
  transcriptSummary: string;
  totalQuestions: number;
  questionsAnswered: number;
  questionsSkipped: number;
  avgResponseTime: number;
  avgConfidence: number;
  totalHintsUsed: number;
  interviewDuration: number;
  createdAt: string;
}

export interface UserMetrics {
  id: number;
  userId: number;
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  scoreHistory: { date: string; score: number }[];
  skillProgress: Record<string, number[]>;
  totalPracticeTime: number;
  avgInterviewDuration: number;
  strongestSkills: string[];
  improvingSkills: string[];
  needsWorkSkills: string[];
  lastInterviewDate: string | null;
}
