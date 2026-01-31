"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionById } from "@/lib/mockApi";
import type { CandidateInterviewSession, InterviewResult as InterviewResultSchema } from "@/types/schema";
import InterviewResultView from "@/components/InterviewResult";
import type { InterviewResultData } from "@/types/interview";

function mapResultToDisplay(r: InterviewResultSchema): InterviewResultData {
  return {
    overallScore: r.overallScore,
    technicalScore: r.technicalScore,
    communicationScore: r.communicationScore,
    problemSolvingScore: r.problemSolvingScore,
    cultureFitScore: r.cultureFitScore,
    roleReadinessPercent: r.roleReadinessPercent,
    decision: r.decision,
    topStrengths: r.topStrengths,
    topWeaknesses: r.topWeaknesses,
    improvementPlan: r.improvementPlan as unknown as InterviewResultData["improvementPlan"],
    skillScores: r.skillScores,
    detailedFeedback: r.detailedFeedback,
    transcriptSummary: r.transcriptSummary,
    totalQuestions: r.totalQuestions,
    questionsAnswered: r.questionsAnswered,
    questionsSkipped: r.questionsSkipped,
    avgResponseTime: r.avgResponseTime,
    interviewDuration: r.interviewDuration,
  };
}

export default function ResultDetailPage() {
  const params = useParams();
  const sessionId = Number(params.sessionId);
  const [session, setSession] = useState<CandidateInterviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!sessionId || isNaN(sessionId)) return;
    setLoading(true);
    try {
      const data = await getSessionById(sessionId);
      setSession(data ?? null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/candidate/results" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </Link>
        <p className="text-gray-600">Result not found.</p>
      </div>
    );
  }

  if (!session.overallResult) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/candidate/results" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </Link>
        <p className="text-gray-600">No result for this session yet.</p>
      </div>
    );
  }

  const data = mapResultToDisplay(session.overallResult);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/candidate/results"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to results
      </Link>
      <InterviewResultView data={data} />
    </div>
  );
}
