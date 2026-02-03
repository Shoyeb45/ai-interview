// Schema-aligned types (matches Prisma schema)

export type RoleCode = "USER" | "HIRING_MANAGER";

export type CompanySize = "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export type InterviewAgentStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";

export type QuestionSelectionMode = "CUSTOM_ONLY" | "AI_ONLY" | "MIXED";

export type QuestionCategory = "TECHNICAL" | "BEHAVIORAL" | "CODING" | "PROBLEM_SOLVING" | 'DOMAIN_KNOWLEDGE' | 'CULTURAL_FIT';

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export type ExperienceLevel =
  | "INTERN"
  | "ENTRY_LEVEL"
  | "JUNIOR"
  | "MID_LEVEL"
  | "SENIOR"
  | "LEAD"
  | "PRINCIPAL";

export type SessionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "CANCELLED" | "CHEATED";

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
  createdAt?: string;
  updatedAt?: string;
}

/** Hiring manager info for candidate-facing interview list/detail (from backend) */
export interface InterviewAgentHiringManager {
  name: string;
  companyName: string;
}

export interface InterviewAgent {
  id: number;
  createdById: number;
  title: string;
  role: string;
  jobDescription: string;
  experienceLevel: ExperienceLevel;
  questionSelectionMode?: QuestionSelectionMode;
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
  /** Message shown to candidate at the start of the interview */
  openingMessage?: string | null;
  sessions?: string[]
  _count?: { sessions: number };
  /** Populated when listing for candidates (hiring manager name & company) */
  createdBy?: { name: string };
  companyName?: string;
  questions?: InterviewQuestion[];
}

export interface InterviewQuestion {
  id: number;
  interviewAgentId: number;
  questionText: string;
  category: QuestionCategory;
  difficulty: DifficultyLevel;
  orderIndex: number;
  estimatedTime: number;
  isActive: boolean;
  expectedKeywords: string[];
  gradingRubric?: Record<string, unknown> | null;
  sampleAnswer?: string | null;
  focusAreas: string[];
  createdAt?: string;
  updatedAt?: string;
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
