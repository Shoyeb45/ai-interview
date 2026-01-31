/**
 * Mock API layer – replace with real apiClient calls later.
 * All functions return promises with dummy data aligned to schema.
 */

import type {
  User,
  HiringManagerInformation,
  InterviewAgent,
  InterviewQuestion,
  CandidateInterviewSession,
  InterviewResult,
  UserMetrics,
  ExperienceLevel,
  InterviewAgentStatus,
  QuestionSelectionMode,
  QuestionCategory,
  DifficultyLevel,
} from "@/types/schema";
import apiClient from "./apiClient";
import { AgentFormDetails } from "@/components/AgentQuestionsSection";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Auth / User ─────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 1,
  name: "Jane Doe",
  email: "jane@example.com",
  roles: [{ code: "USER" }],
  hiringManagerInformation: {
    id: 1,
    hiringManagerId: 2,
    companyName: "string",
    companySize: "STARTUP",
    industry: "string",
    department: "string",
    teamName: null,
    linkedinUrl: null,
    website: null,
    maxActiveInterviews: 0,
  },
};

const mockHmProfile: HiringManagerInformation = {
  id: 1,
  hiringManagerId: 2,
  companyName: "TechCorp Inc",
  companySize: "MEDIUM",
  industry: "FinTech",
  department: "Engineering",
  teamName: "Platform",
  linkedinUrl: "https://linkedin.com/in/john",
  website: "https://techcorp.com",
  maxActiveInterviews: 10,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z",
};

const mockHiringManagerUser: User = {
  id: 2,
  name: "John Hiring",
  email: "john@company.com",
  roles: [{ code: "HIRING_MANAGER" }],
  hiringManagerInformation: mockHmProfile,
};

// Toggle this to test as candidate vs hiring manager (or derive from real /auth/me)
let mockCurrentUser = mockUser;

export async function getCurrentUser(): Promise<User> {
  await delay(400);
  return { ...mockCurrentUser };
}

/** Call after login to set which role to simulate */
export function setMockUserAsHiringManager(isHm: boolean) {
  mockCurrentUser = isHm ? mockHiringManagerUser : mockUser;
}

export async function getHiringManagerProfile(): Promise<HiringManagerInformation | null> {
  await delay(300);
  return mockCurrentUser.hiringManagerInformation ?? null;
}

export async function updateHiringManagerProfile(
  data: Partial<HiringManagerInformation>,
): Promise<HiringManagerInformation> {
  await delay(300);
  if (!mockHiringManagerUser.hiringManagerInformation)
    throw new Error("No HM profile");
  const updated = {
    ...mockHiringManagerUser.hiringManagerInformation,
    ...data,
  };
  (
    mockHiringManagerUser as {
      hiringManagerInformation: HiringManagerInformation;
    }
  ).hiringManagerInformation = updated;
  return updated;
}

// ─── Interview Agents (Hiring Manager) ───────────────────────────────────────

const mockAgents: InterviewAgent[] = [
  {
    id: 1,
    createdById: 2,
    title: "Backend Developer Interview",
    role: "Software Engineer",
    jobDescription: "Build scalable APIs and services.",
    experienceLevel: "MID_LEVEL",
    questionSelectionMode: "MIXED",
    totalQuestions: 6,
    estimatedDuration: 30,
    focusAreas: ["algorithms", "system design", "databases"],
    maxCandidates: 100,
    maxAttemptsPerCandidate: 3,
    deadline: "2025-12-31T23:59:59Z",
    status: "PUBLISHED",
    scheduledFor: null,
    publishedAt: "2025-01-15T10:00:00Z",
    isActive: true,
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
    _count: { sessions: 12 },
  },
  {
    id: 2,
    createdById: 2,
    title: "Frontend Engineer Interview",
    role: "Frontend Engineer",
    jobDescription: "React, TypeScript, and UI performance.",
    experienceLevel: "SENIOR",
    questionSelectionMode: "MIXED",
    totalQuestions: 5,
    estimatedDuration: 25,
    focusAreas: ["web development", "apis", "testing"],
    maxCandidates: 50,
    maxAttemptsPerCandidate: 2,
    deadline: null,
    status: "DRAFT",
    scheduledFor: null,
    publishedAt: null,
    isActive: true,
    createdAt: "2025-01-20T00:00:00Z",
    updatedAt: "2025-01-20T00:00:00Z",
    _count: { sessions: 0 },
  },
];

// ─── Interview Questions (per agent) ─────────────────────────────────────────

const mockQuestionsByAgent: Map<number, InterviewQuestion[]> = new Map([
  [
    1,
    [
      {
        id: 101,
        interviewAgentId: 1,
        questionText:
          "Explain the difference between REST and GraphQL. When would you choose one over the other?",
        category: "TECHNICAL",
        difficulty: "MEDIUM",
        orderIndex: 1,
        estimatedTime: 5,
        isActive: true,
        expectedKeywords: ["REST", "GraphQL", "API", "endpoints"],
        focusAreas: ["apis"],
      },
      {
        id: 102,
        interviewAgentId: 1,
        questionText:
          "Describe how you would design a rate-limiting system for an API.",
        category: "TECHNICAL",
        difficulty: "HARD",
        orderIndex: 2,
        estimatedTime: 5,
        isActive: true,
        expectedKeywords: ["rate limit", "token bucket", "sliding window"],
        focusAreas: ["system design", "apis"],
      },
    ],
  ],
  [2, []],
]);

function getNextQuestionId(): number {
  let max = 0;
  mockQuestionsByAgent.forEach((list) => {
    list.forEach((q) => {
      if (q.id > max) max = q.id;
    });
  });
  return max + 1;
}

export async function getInterviewAgents(): Promise<InterviewAgent[]> {
  await delay(350);
  const interviewAgents =
    await apiClient.get<InterviewAgent[]>("/interview-agent");
  return interviewAgents;
}

export async function getInterviewAgentById(
  id: number,
): Promise<InterviewAgent | null> {
  await delay(200);

  const agent = await apiClient.get<InterviewAgent | null>(
    `/interview-agent/${id}`,
  );
  return agent;
}

export async function getQuestionsByAgentId(
  agentId: number,
): Promise<InterviewQuestion[]> {
  await delay(200);
  const list = mockQuestionsByAgent.get(agentId) ?? [];
  return [...list].sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function createQuestion(
  agentId: number,
  data: {
    questionText: string;
    category: QuestionCategory;
    difficulty: DifficultyLevel;
    orderIndex: number;
    estimatedTime?: number;
    expectedKeywords?: string[];
    focusAreas?: string[];
    sampleAnswer?: string | null;
  },
): Promise<InterviewQuestion> {
  await delay(300);
  const list = mockQuestionsByAgent.get(agentId) ?? [];
  const nextId = getNextQuestionId();
  const q: InterviewQuestion = {
    id: nextId,
    interviewAgentId: agentId,
    questionText: data.questionText,
    category: data.category,
    difficulty: data.difficulty,
    orderIndex: data.orderIndex,
    estimatedTime: data.estimatedTime ?? 5,
    isActive: true,
    expectedKeywords: data.expectedKeywords ?? [],
    focusAreas: data.focusAreas ?? [],
    sampleAnswer: data.sampleAnswer ?? null,
  };
  list.push(q);
  mockQuestionsByAgent.set(agentId, list);
  return q;
}

export async function updateQuestion(
  agentId: number,
  questionId: number,
  data: Partial<InterviewQuestion>,
): Promise<InterviewQuestion> {
  await delay(300);
  const list = mockQuestionsByAgent.get(agentId) ?? [];
  const idx = list.findIndex((q) => q.id === questionId);
  if (idx === -1) throw new Error("Question not found");
  list[idx] = {
    ...list[idx],
    ...data,
    id: questionId,
    interviewAgentId: agentId,
  };
  return list[idx];
}

export async function deleteQuestion(
  agentId: number,
  questionId: number,
): Promise<void> {
  await delay(200);
  const list = mockQuestionsByAgent.get(agentId) ?? [];
  const filtered = list.filter((q) => q.id !== questionId);
  mockQuestionsByAgent.set(agentId, filtered);
}

/** Generate questions using AI based on agent details. Requires title, role, jobDescription, experienceLevel, focusAreas, totalQuestions to be filled. */
export async function generateQuestionsByAI(
  agentOrDetails: AgentFormDetails,
): Promise<InterviewQuestion[]> {
  await delay(800);

  const title = agentOrDetails.title?.trim() ?? "";
  const role = agentOrDetails.role?.trim() ?? "";
  const jobDescription = agentOrDetails.jobDescription?.trim() ?? "";
  const experienceLevel = agentOrDetails.experienceLevel ?? "";
  const focusAreas = agentOrDetails.focusAreas ?? [];
  const totalQuestions = agentOrDetails.totalQuestions ?? 0;
  const estimatedDuration = agentOrDetails.estimatedDuration ?? 0;
  const questionSelectionMode = agentOrDetails.questionSelectionMode;

  if (
    !title ||
    !role ||
    !jobDescription ||
    !experienceLevel ||
    focusAreas.length === 0 ||
    totalQuestions < 1 ||
    !estimatedDuration ||
    !questionSelectionMode
  ) {
    throw new Error(
      "Fill in title, role, job description, experience level, at least one focus area, and total questions before generating questions.",
    );
  }

  return await apiClient.post<InterviewQuestion[]>(
    "/interview-agent/generate-questions",
    {
      title,
      role,
      jobDescription,
      experienceLevel,
      focusAreas,
      totalQuestions,
      estimatedDuration,
      questionSelectionMode,
    },
  );
}

export async function createInterviewAgent(data: {
  title: string;
  role: string;
  jobDescription: string;
  experienceLevel: ExperienceLevel;
  questionSelectionMode?: QuestionSelectionMode;
  totalQuestions?: number;
  estimatedDuration?: number;
  focusAreas: string[];
  maxCandidates?: number;
  maxAttemptsPerCandidate?: number;
  deadline?: string | null;
  status?: InterviewAgentStatus;
  questions: InterviewQuestion[];
}): Promise<InterviewAgent> {
  await delay(400);
  const agent = await apiClient.post<InterviewAgent>("/interview-agent", data);
  return agent;
}

export async function updateInterviewAgent(
  id: number,
  data: Partial<InterviewAgent>,
): Promise<InterviewAgent> {
  await delay(300);
  const idx = mockAgents.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Agent not found");
  mockAgents[idx] = { ...mockAgents[idx], ...data, id };
  return mockAgents[idx];
}

export async function deleteInterviewAgent(id: number): Promise<void> {
  await delay(300);
  await apiClient.delete(`/interview-agent/${id}`);
}

// ─── Candidate: Available agents (published, with HM name & company) ─────────────

function withHiringManagerInfo(agent: InterviewAgent): InterviewAgent {
  return {
    ...agent,
    createdBy: { name: mockHiringManagerUser.name },
    companyName: mockHmProfile.companyName,
  };
}

export async function getPublishedInterviewAgents(): Promise<InterviewAgent[]> {
  await delay(350);
  const interviews = await apiClient.get<InterviewAgent[]>(
    "/interview-agent/user/available-interviews",
  );

  return interviews;
}

export async function getInterviewAgentByIdForCandidate(
  id: number,
): Promise<InterviewAgent | null> {
  const agent = await apiClient.get<InterviewAgent>(`/interview-agent/${id}`);

  return agent ? withHiringManagerInfo(agent) : null;
}

/** How many times the current candidate has attempted this agent (for pre-start screen) */
export async function getMyAttemptCountForAgent(
  agentId: number,
): Promise<number> {
  await delay(200);
  const currentCandidateId = 1; // from auth in real app
  return mockSessions.filter(
    (s) =>
      s.interviewAgentId === agentId && s.candidateId === currentCandidateId,
  ).length;
}

// ─── Candidate: My sessions & results ────────────────────────────────────────

const mockCandidates: { id: number; name: string; email: string }[] = [
  { id: 1, name: "Jane Doe", email: "jane@example.com" },
  { id: 2, name: "Alex Chen", email: "alex.chen@example.com" },
  { id: 3, name: "Sam Wilson", email: "sam.wilson@example.com" },
];

function getCandidateById(id: number) {
  return (
    mockCandidates.find((c) => c.id === id) ?? {
      id,
      name: "Unknown",
      email: "",
    }
  );
}

const mockResult: InterviewResult = {
  id: 1,
  interviewId: 101,
  sessionId: 201,
  userId: 1,
  overallScore: 78,
  technicalScore: 82,
  communicationScore: 75,
  problemSolvingScore: 76,
  cultureFitScore: 80,
  skillScores: {
    Algorithms: 85,
    "System Design": 68,
    Databases: 80,
    Communication: 75,
  },
  topStrengths: [
    "Strong technical knowledge",
    "Clear communication",
    "Good problem-solving approach",
  ],
  topWeaknesses: [
    "Needs improvement in system design",
    "Could be more concise",
    "Missed some edge cases",
  ],
  decision: "HIRE",
  roleReadinessPercent: 75,
  improvementPlan: {
    "day1-2": [
      "Review system design fundamentals",
      "Practice explaining solutions concisely",
    ],
    "day3-4": [
      "Work on edge case identification",
      "Study scalability patterns",
    ],
    "day5-6": [
      "Mock interviews with peers",
      "Deep dive into distributed systems",
    ],
    day7: ["Take another mock interview", "Review and consolidate learnings"],
  },
  detailedFeedback:
    "Overall solid performance with room to grow in system design.",
  transcriptSummary: "Candidate showed good fundamentals and communication.",
  totalQuestions: 6,
  questionsAnswered: 6,
  questionsSkipped: 0,
  avgResponseTime: 120,
  avgConfidence: 0.78,
  totalHintsUsed: 1,
  interviewDuration: 28,
  createdAt: "2025-01-25T14:00:00Z",
};

const mockResult2: InterviewResult = {
  ...mockResult,
  id: 2,
  interviewId: 103,
  sessionId: 203,
  userId: 2,
  overallScore: 88,
  technicalScore: 90,
  communicationScore: 86,
  problemSolvingScore: 85,
  cultureFitScore: 88,
  decision: "STRONG_HIRE",
  roleReadinessPercent: 88,
  createdAt: "2025-01-26T11:00:00Z",
};

const mockResult3: InterviewResult = {
  ...mockResult,
  id: 3,
  interviewId: 104,
  sessionId: 204,
  userId: 3,
  overallScore: 65,
  technicalScore: 68,
  communicationScore: 62,
  problemSolvingScore: 64,
  cultureFitScore: 70,
  decision: "BORDERLINE",
  roleReadinessPercent: 62,
  createdAt: "2025-01-27T09:00:00Z",
};

const mockSessions: CandidateInterviewSession[] = [
  {
    id: 201,
    interviewAgentId: 1,
    candidateId: 1,
    interviewId: 101,
    status: "COMPLETED",
    startedAt: "2025-01-25T13:30:00Z",
    completedAt: "2025-01-25T14:00:00Z",
    abandonedAt: null,
    abandonReason: null,
    createdAt: "2025-01-25T13:28:00Z",
    updatedAt: "2025-01-25T14:00:00Z",
    interviewAgent: mockAgents[0],
    overallResult: mockResult,
  },
  {
    id: 202,
    interviewAgentId: 1,
    candidateId: 1,
    interviewId: 102,
    status: "PENDING",
    startedAt: null,
    completedAt: null,
    abandonedAt: null,
    abandonReason: null,
    createdAt: "2025-01-28T10:00:00Z",
    updatedAt: "2025-01-28T10:00:00Z",
    interviewAgent: mockAgents[0],
    overallResult: null,
  },
  {
    id: 203,
    interviewAgentId: 1,
    candidateId: 2,
    interviewId: 103,
    status: "COMPLETED",
    startedAt: "2025-01-26T10:30:00Z",
    completedAt: "2025-01-26T11:00:00Z",
    abandonedAt: null,
    abandonReason: null,
    createdAt: "2025-01-26T10:28:00Z",
    updatedAt: "2025-01-26T11:00:00Z",
    interviewAgent: mockAgents[0],
    overallResult: mockResult2,
  },
  {
    id: 204,
    interviewAgentId: 1,
    candidateId: 3,
    interviewId: 104,
    status: "COMPLETED",
    startedAt: "2025-01-27T09:00:00Z",
    completedAt: "2025-01-27T09:35:00Z",
    abandonedAt: null,
    abandonReason: null,
    createdAt: "2025-01-27T08:58:00Z",
    updatedAt: "2025-01-27T09:35:00Z",
    interviewAgent: mockAgents[0],
    overallResult: mockResult3,
  },
];

export async function getMySessions(): Promise<CandidateInterviewSession[]> {
  await delay(400);
  return [...mockSessions];
}

export async function getSessionById(
  id: number,
): Promise<CandidateInterviewSession | null> {
  await delay(200);
  const s = mockSessions.find((s) => s.id === id) ?? null;
  if (s) {
    return { ...s, candidate: getCandidateById(s.candidateId) };
  }
  return null;
}

export async function getResultBySessionId(
  sessionId: number,
): Promise<InterviewResult | null> {
  await delay(200);
  const session = mockSessions.find((s) => s.id === sessionId);
  return session?.overallResult ?? null;
}

export async function startSession(
  interviewAgentId: number,
): Promise<CandidateInterviewSession> {
  await delay(500);
  const agent = mockAgents.find((a) => a.id === interviewAgentId);
  if (!agent) throw new Error("Interview not found or no longer available.");
  const currentCandidateId = 1;
  const myAttempts = mockSessions.filter(
    (s) =>
      s.interviewAgentId === interviewAgentId &&
      s.candidateId === currentCandidateId,
  ).length;
  if (myAttempts >= agent.maxAttemptsPerCandidate) {
    throw new Error(
      `Maximum attempts (${agent.maxAttemptsPerCandidate}) reached for this interview.`,
    );
  }
  const nextId = Math.max(0, ...mockSessions.map((s) => s.id)) + 1;
  const newSession: CandidateInterviewSession = {
    id: nextId,
    interviewAgentId,
    candidateId: currentCandidateId,
    interviewId: 100 + nextId,
    status: "PENDING",
    startedAt: null,
    completedAt: null,
    abandonedAt: null,
    abandonReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    interviewAgent: agent,
    overallResult: null,
  };
  mockSessions.push(newSession);
  return newSession;
}

export async function getMyMetrics(): Promise<UserMetrics> {
  await delay(350);
  const userMetric = await apiClient.get<UserMetrics>("/user/dashboard");
  return userMetric;
}

export async function getSessionsByAgentId(
  agentId: number,
): Promise<CandidateInterviewSession[]> {
  await delay(350);
  const agent = mockAgents.find((a) => a.id === agentId);
  return mockSessions
    .filter((s) => s.interviewAgentId === agentId)
    .map((s) => ({
      ...s,
      interviewAgent: agent,
      candidate: getCandidateById(s.candidateId),
    }));
}

/** Sessions for one candidate on one agent (for HM: candidate's attempts) */
export async function getSessionsByAgentAndCandidate(
  agentId: number,
  candidateId: number,
): Promise<CandidateInterviewSession[]> {
  await delay(300);
  const agent = mockAgents.find((a) => a.id === agentId);
  return mockSessions
    .filter(
      (s) => s.interviewAgentId === agentId && s.candidateId === candidateId,
    )
    .map((s) => ({
      ...s,
      interviewAgent: agent,
      candidate: getCandidateById(s.candidateId),
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
