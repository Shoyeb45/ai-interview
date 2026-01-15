'use client';

import { HiringMetric } from '@/components/InterviewCreate';
import InterviewResult from '@/components/InterviewResult';
import LatestResults from '@/components/LatestResults';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { InterviewResultData } from '@/types/interview';
import { useCallback, useEffect, useMemo, useState } from 'react';

const mockResult: InterviewResultData = {
  overallScore: 78,
  technicalScore: 82,
  communicationScore: 75,
  problemSolvingScore: 76,
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
  skillScores: {
    Algorithms: 85,
    "System Design": 68,
    Databases: 80,
    Communication: 75,
  },
};


export default function DashboardPage() {
  const { user } = useAuth();
  const [latestInterview, setLatestInterview] = useState<InterviewResultData>();

  const fetchLatestInterview = useCallback(async () => {
    try {
      setLatestInterview(mockResult);
      return mockResult;
    } catch (error) {
      console.log(error);
    }
  }, []);


  useEffect(() => {
    fetchLatestInterview();
  }, [fetchLatestInterview]);
  

  if (!latestInterview) {
    return (
      <div>Fetching latest interview</div>
    )
  }
  return (

  
    <ProtectedRoute>
      <div>
        <InterviewResult data={latestInterview}/>
        
      </div>
    </ProtectedRoute>
  );
}