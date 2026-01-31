"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionById } from "@/lib/mockApi";
import type { CandidateInterviewSession, InterviewResult as InterviewResultSchema } from "@/types/schema";
import InterviewResultView from "@/components/InterviewResult";
import type { InterviewResultData } from "@/types/interview";

function mapResultToDisplay(
  r: InterviewResultSchema
): InterviewResultData {
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

export default function HiringManagerResultDetailPage() {
  const params = useParams();
  const agentId = Number(params.id);
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
        <Link
          href={`/dashboard/hiring-manager/agents/${agentId}/leaderboard`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leaderboard
        </Link>
        <p className="text-gray-600">Result not found.</p>
      </div>
    );
  }

  if (!session.overallResult) {
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/hiring-manager/agents/${agentId}/candidates/${session.candidateId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to attempts
        </Link>
        <p className="text-gray-600">No result for this attempt yet.</p>
      </div>
    );
  }

  const data = mapResultToDisplay(session.overallResult);
  const candidateName = session.candidate?.name ?? `Candidate ${session.candidateId}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/hiring-manager/agents/${agentId}/candidates/${session.candidateId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to attempts
        </Link>
        <span className="text-gray-400">|</span>
        <span className="text-sm text-gray-700">
          {candidateName} — Attempt #{session.id}
        </span>
      </div>
      <InterviewResultView data={data} />
    </div>
  );
}
