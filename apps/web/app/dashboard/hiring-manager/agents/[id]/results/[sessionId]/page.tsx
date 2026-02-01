"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionResult } from "@/lib/hiringManagerApi";
import type { HiringManagerSessionResult } from "@/lib/hiringManagerApi";
import InterviewResultView from "@/components/InterviewResult";
import type { InterviewResultData } from "@/types/interview";
import { toast } from "sonner";

function mapResultToDisplay(r: HiringManagerSessionResult): InterviewResultData {
  return {
    overallScore: r.overallScore,
    technicalScore: r.technicalScore,
    communicationScore: r.communicationScore,
    problemSolvingScore: r.problemSolvingScore,
    cultureFitScore: r.cultureFitScore,
    roleReadinessPercent: r.roleReadinessPercent,
    decision: r.decision as InterviewResultData["decision"],
    topStrengths: r.topStrengths,
    topWeaknesses: r.topWeaknesses,
    improvementPlan: r.improvementPlan as InterviewResultData["improvementPlan"],
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
  const [result, setResult] = useState<HiringManagerSessionResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!sessionId || isNaN(sessionId)) return;
    setLoading(true);
    try {
      const data = await getSessionResult(sessionId);
      setResult(data ?? null);
    } catch {
      toast.error("Failed to load result");
      setResult(null);
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

  if (!result) {
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

  const data = mapResultToDisplay(result);
  const candidateName = result.candidateName ?? `Candidate`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={
            result.candidateId
              ? `/dashboard/hiring-manager/agents/${agentId}/candidates/${result.candidateId}`
              : `/dashboard/hiring-manager/agents/${agentId}/leaderboard`
          }
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          {result.candidateId ? "Back to attempts" : "Back to leaderboard"}
        </Link>
        <span className="text-gray-400">|</span>
        <span className="text-sm text-gray-700">
          {candidateName}
          {result.candidateEmail && ` — ${result.candidateEmail}`}
        </span>
      </div>
      <InterviewResultView data={data} />
    </div>
  );
}
