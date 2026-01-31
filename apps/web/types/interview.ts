import type { HiringDecision } from "./schema";

export type HiringMetric = HiringDecision;

export interface ImprovementPlan {
  "day1-2": string[];
  "day3-4": string[];
  "day5-6": string[];
  day7: string[];
}

export interface InterviewResultData {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  cultureFitScore?: number;
  roleReadinessPercent: number;
  decision: HiringMetric;
  topStrengths: string[];
  topWeaknesses: string[];
  improvementPlan: ImprovementPlan;
  skillScores: Record<string, number>;
  detailedFeedback?: string;
  transcriptSummary?: string;
  totalQuestions?: number;
  questionsAnswered?: number;
  questionsSkipped?: number;
  avgResponseTime?: number;
  interviewDuration?: number;
}
