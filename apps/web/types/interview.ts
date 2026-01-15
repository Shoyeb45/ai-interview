export type HiringMetric = 'HIRE' | 'NO_HIRE' | 'MAYBE';

export interface ImprovementPlan {
  'day1-2': string[];
  'day3-4': string[];
  'day5-6': string[];
  day7: string[];
}

export interface InterviewResultData {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  roleReadinessPercent: number;
  decision: HiringMetric;
  topStrengths: string[];
  topWeaknesses: string[];
  improvementPlan: ImprovementPlan;
  skillScores: Record<string, number>; // e.g., { "Algorithms": 85, "System Design": 68 }
}